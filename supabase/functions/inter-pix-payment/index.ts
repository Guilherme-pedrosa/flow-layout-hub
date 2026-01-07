import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helpers
const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
const isValidPixKey = (str: string) => str.length >= 1 && str.length <= 77 && /^[a-zA-Z0-9@.+\-_]+$/.test(str);
const isValidDocument = (str: string) => /^\d{11}$|^\d{14}$/.test(str.replace(/\D/g, ''));

serve(async (req) => {
  console.log("[inter-pix-payment] ========== INICIANDO ==========");
  console.log("[inter-pix-payment] Method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - No token provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Verify user authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("[inter-pix-payment] Auth error:", authError?.message);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[inter-pix-payment] Authenticated user:", user.email);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log("[inter-pix-payment] 1. Payload recebido (sanitized):", JSON.stringify({
      company_id: payload.company_id,
      pix_key_type: payload.pix_key_type,
      amount: payload.amount,
      has_pix_key: !!payload.pix_key,
      has_recipient_name: !!payload.recipient_name,
      has_recipient_document: !!payload.recipient_document
    }));

    // === INPUT VALIDATION ===
    if (payload.company_id && !isValidUUID(payload.company_id)) {
      return new Response(JSON.stringify({ success: false, error: "Formato de company_id inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.pix_key && !isValidPixKey(payload.pix_key)) {
      return new Response(JSON.stringify({ success: false, error: "Formato de chave PIX inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.recipient_document && !isValidDocument(payload.recipient_document)) {
      return new Response(JSON.stringify({ success: false, error: "CPF/CNPJ do destinatário inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.amount !== undefined) {
      const amount = Number(payload.amount);
      if (isNaN(amount) || amount <= 0 || amount > 1000000) {
        return new Response(JSON.stringify({ success: false, error: "Valor inválido (deve ser entre R$ 0,01 e R$ 1.000.000,00)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (payload.recipient_name && (payload.recipient_name.length < 1 || payload.recipient_name.length > 140)) {
      return new Response(JSON.stringify({ success: false, error: "Nome do destinatário inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to the company
    if (payload.company_id) {
      const { data: userCompanies } = await supabaseAuth.rpc('get_user_companies');
      if (!userCompanies?.includes(payload.company_id)) {
        console.error("[inter-pix-payment] User does not have access to company:", payload.company_id);
        return new Response(JSON.stringify({ success: false, error: "Sem permissão para esta empresa" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get proxy URL and secret
    const proxyUrl = Deno.env.get("GCP_PIX_FUNCTION_URL");
    const proxySecret = Deno.env.get("GCP_PIX_FUNCTION_SECRET");
    
    console.log("[inter-pix-payment] 2. Proxy URL (primeiros 50 chars):", proxyUrl?.substring(0, 50));
    console.log("[inter-pix-payment] 2b. Proxy URL length:", proxyUrl?.length);
    console.log("[inter-pix-payment] 2c. Proxy Secret configurado:", proxySecret ? "SIM" : "NÃO");
    
    if (!proxyUrl) {
      throw new Error("GCP_PIX_FUNCTION_URL não configurada");
    }
    
    // Validate URL format
    if (!proxyUrl.startsWith("https://")) {
      throw new Error(`URL inválida - deve começar com https://. Recebido: ${proxyUrl.substring(0, 30)}`);
    }

    let paymentData: {
      companyId: string;
      pixKey: string;
      pixKeyType: string;
      amount: number;
      recipientName: string;
      recipientDocument: string;
      description?: string;
    };
    let pixPaymentId: string | null = null;
    let payableId: string | null = null;

    // Handle retry case
    if (payload.paymentId && !payload.company_id) {
      console.log(`[inter-pix-payment] Modo retry - buscando pagamento ${payload.paymentId}`);
      
      const { data: existingPayment, error: fetchError } = await supabase
        .from("inter_pix_payments")
        .select("*")
        .eq("id", payload.paymentId)
        .single();

      if (fetchError || !existingPayment) {
        throw new Error("Pagamento não encontrado para retry");
      }

      pixPaymentId = existingPayment.id;
      payableId = existingPayment.payable_id;
      paymentData = {
        companyId: existingPayment.company_id,
        pixKey: existingPayment.pix_key,
        pixKeyType: existingPayment.pix_key_type,
        amount: existingPayment.amount,
        recipientName: existingPayment.recipient_name,
        recipientDocument: existingPayment.recipient_document,
        description: existingPayment.description
      };

      await supabase
        .from("inter_pix_payments")
        .update({ 
          status: "processing",
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", pixPaymentId);

    } else {
      // New payment
      const { 
        company_id, pix_key, pix_key_type, amount, 
        recipient_name, recipient_document, description,
        payable_id, payment_id, is_approval
      } = payload;

      if (!company_id || !pix_key || !pix_key_type || !amount || !recipient_name || !recipient_document) {
        throw new Error("Campos obrigatórios: company_id, pix_key, pix_key_type, amount, recipient_name, recipient_document");
      }

      if (amount <= 0) {
        throw new Error("O valor deve ser maior que zero");
      }

      payableId = payable_id || null;
      paymentData = { 
        companyId: company_id, 
        pixKey: pix_key, 
        pixKeyType: pix_key_type, 
        amount, 
        recipientName: recipient_name, 
        recipientDocument: recipient_document, 
        description 
      };

      if (is_approval && payment_id) {
        pixPaymentId = payment_id;
        await supabase
          .from("inter_pix_payments")
          .update({ 
            status: "processing",
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", pixPaymentId);
      } else if (!payment_id) {
        const { data: newPayment, error: insertError } = await supabase
          .from("inter_pix_payments")
          .insert({
            company_id,
            pix_key,
            pix_key_type,
            amount,
            recipient_name,
            recipient_document,
            description: description || `PIX para ${recipient_name}`,
            payable_id: payable_id || null,
            status: "processing"
          })
          .select()
          .single();

        if (insertError) {
          throw new Error("Erro ao criar registro de pagamento");
        }
        pixPaymentId = newPayment.id;
      } else {
        pixPaymentId = payment_id;
      }
    }

    console.log(`[inter-pix-payment] 3. Payment ID criado: ${pixPaymentId}`);

    // Fetch Inter credentials
    console.log("[inter-pix-payment] 4. Buscando credenciais Inter para company:", paymentData.companyId);
    
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", paymentData.companyId)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      console.error("[inter-pix-payment] Erro ao buscar credenciais:", credError);
      throw new Error("Credenciais Inter não configuradas para esta empresa");
    }
    
    console.log("[inter-pix-payment] 5. Credenciais encontradas - client_id:", credentials.client_id?.substring(0, 8) + "...");


    // Build PIX payment payload for Inter API /banking/v2/pix
    // Formato conforme documentação oficial Inter para pagamento por CHAVE PIX:
    // - destinatario.tipo = "CHAVE" (não FISICA/JURIDICA)
    // - destinatario.chave = a chave PIX
    // - NÃO incluir nome/cpfCnpj no destinatario
    // - NÃO incluir chave/tipoChave no nível raiz
    
    const valorEmReais = paymentData.amount.toFixed(2);
    
    console.log("[inter-pix-payment] 5b. Valor em reais:", valorEmReais);
    
    // Payload correto conforme documentação Inter para pagamento por chave PIX
    const pixApiPayload = {
      valor: valorEmReais,
      descricao: (paymentData.description || `PIX para ${paymentData.recipientName}`).substring(0, 140),
      destinatario: {
        tipo: "CHAVE",
        chave: paymentData.pixKey
      }
    };

    console.log("[inter-pix-payment] 6. PIX API payload:", JSON.stringify(pixApiPayload));

    // Verificar se account_number está configurado
    if (!credentials.account_number) {
      console.error("[inter-pix-payment] ERRO: account_number não está configurado nas credenciais Inter!");
      throw new Error("Número da conta corrente não configurado nas credenciais do Banco Inter. Configure o campo account_number na tabela inter_credentials.");
    }

    console.log("[inter-pix-payment] 6b. Conta corrente:", credentials.account_number);

    try {
      // First, get OAuth token via proxy
      console.log("[inter-pix-payment] 7. Obtendo token OAuth via proxy...");
      
      const tokenPayload = new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        scope: 'pagamento-pix.write pagamento-pix.read',
        grant_type: 'client_credentials'
      }).toString();

      const tokenProxyPayload = {
        method: "POST",
        url: "https://cdpj.partners.bancointer.com.br/oauth/v2/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        data: tokenPayload
      };

      console.log("[inter-pix-payment] 8. Token proxy request:", JSON.stringify({ url: tokenProxyPayload.url }));

      const tokenResponse = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${proxySecret}`,
        },
        body: JSON.stringify(tokenProxyPayload),
      });

      const tokenText = await tokenResponse.text();
      console.log("[inter-pix-payment] 9. Token response status:", tokenResponse.status);
      
      if (!tokenResponse.ok) {
        console.error("[inter-pix-payment] Token error:", tokenText);
        throw new Error(`Erro ao obter token OAuth: ${tokenText}`);
      }

      const tokenData = JSON.parse(tokenText);
      if (!tokenData.access_token) {
        throw new Error(`Token inválido: ${tokenText}`);
      }

      console.log("[inter-pix-payment] 10. Token obtido com sucesso");

      // Now send PIX payment via proxy
      console.log("[inter-pix-payment] 11. Enviando pagamento PIX via proxy...");

      const pixProxyPayload = {
        method: "POST",
        url: "https://cdpj.partners.bancointer.com.br/banking/v2/pix",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
          "x-conta-corrente": credentials.account_number
        },
        data: pixApiPayload  // Enviar como objeto, não string
      };

      console.log("[inter-pix-payment] 11b. Proxy payload completo:", JSON.stringify(pixProxyPayload));

      const proxyResponse = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${proxySecret}`,
        },
        body: JSON.stringify(pixProxyPayload),
      });

      const responseText = await proxyResponse.text();
      console.log("[inter-pix-payment] 9. Proxy response status:", proxyResponse.status);
      console.log("[inter-pix-payment] 10. Proxy response:", responseText);

      if (!proxyResponse.ok) {
        let errorMsg = `Erro HTTP ${proxyResponse.status}`;
        try {
          const errorJson = JSON.parse(responseText);
          errorMsg = errorJson.error || errorJson.message || errorJson.detail || errorMsg;
          if (errorJson.violacoes) {
            errorMsg += `: ${errorJson.violacoes.map((v: any) => v.razao).join(", ")}`;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const pixResult = JSON.parse(responseText);
      console.log("[inter-pix-payment] 11. PIX result:", JSON.stringify(pixResult));

      // Verificar resposta do Inter - formatos possíveis:
      // Sucesso: { tipoRetorno: "APROVACAO", codigoSolicitacao: "...", dataPagamento: "...", dataOperacao: "..." }
      // Agendado: { tipoRetorno: "AGENDADO", codigoSolicitacao: "..." }
      // Erro: { title: "...", detail: "...", violacoes: [...] }
      
      const tipoRetorno = pixResult.tipoRetorno?.toUpperCase();
      const codigoSolicitacao = pixResult.codigoSolicitacao;
      
      // Se não tem tipoRetorno nem codigoSolicitacao, é erro
      if (!tipoRetorno && !codigoSolicitacao) {
        const errorMsg = pixResult.detail || pixResult.message || pixResult.error || "Resposta inválida do Inter";
        throw new Error(errorMsg);
      }

      // IMPORTANTE: Mesmo quando a API retorna APROVACAO, o status interno é "sent_to_bank"
      // porque o usuário ainda precisa aprovar no app do banco antes do dinheiro sair.
      // O status só muda para "completed/paid" quando aparecer no extrato/conciliação.
      const isApproved = tipoRetorno === "APROVACAO" || tipoRetorno === "APROVADO";
      const isScheduled = tipoRetorno === "AGENDADO";
      
      // Status interno: sempre "sent_to_bank" quando enviado com sucesso
      // Só muda para "completed" quando for conciliado com o extrato
      let internalStatus = "sent_to_bank";
      
      console.log("[inter-pix-payment] 12. tipoRetorno:", tipoRetorno, "- codigoSolicitacao:", codigoSolicitacao, "- Status interno:", internalStatus);
      
      await supabase
        .from("inter_pix_payments")
        .update({
          status: internalStatus,
          inter_transaction_id: codigoSolicitacao,
          inter_end_to_end_id: pixResult.endToEndId || null,
          inter_status: tipoRetorno,
          inter_response: pixResult,
          processed_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", pixPaymentId);

      // Update linked payable - NÃO marcar como pago, apenas como "sent_to_bank"
      // O pagamento só será marcado como pago quando for conciliado com o extrato
      if (payableId) {
        await supabase
          .from("payables")
          .update({
            payment_status: "sent_to_bank",
            inter_payment_id: pixPaymentId,
            updated_at: new Date().toISOString()
          })
          .eq("id", payableId);
      }

      // Audit logs
      await supabase.from("audit_logs").insert({
        company_id: paymentData.companyId,
        entity: "inter_pix_payments",
        entity_id: pixPaymentId,
        action: "pix_sent_to_bank",
        metadata_json: {
          tipoRetorno,
          codigoSolicitacao,
          dataPagamento: pixResult.dataPagamento,
          dataOperacao: pixResult.dataOperacao,
          amount: paymentData.amount,
          recipient: paymentData.recipientName
        }
      });

      await supabase.from("payment_audit_logs").insert({
        payable_id: payableId || pixPaymentId!,
        action: "pix_sent_to_bank",
        old_status: "processing",
        new_status: internalStatus,
        metadata: {
          tipoRetorno,
          codigoSolicitacao,
          amount: paymentData.amount,
          recipient: paymentData.recipientName,
          pixKey: paymentData.pixKey
        }
      });

      console.log(`[inter-pix-payment] Success - tipoRetorno: ${tipoRetorno}, codigoSolicitacao: ${codigoSolicitacao}`);

      // Mensagens amigáveis por status
      // IMPORTANTE: Mesmo com APROVACAO da API, o status para o usuário é "Enviado para Aprovação"
      // porque ainda precisa aprovar no app do banco
      const statusMessages: Record<string, string> = {
        APROVACAO: "PIX enviado! Aguardando aprovação no app do banco.",
        APROVADO: "PIX enviado! Aguardando aprovação no app do banco.",
        EMPROCESSAMENTO: "PIX em processamento no banco.",
        AGENDADO: "PIX agendado com sucesso.",
        PENDENTE: "PIX pendente de processamento.",
      };

      const friendlyMessage = statusMessages[tipoRetorno] || `Status: ${tipoRetorno}`;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transactionId: codigoSolicitacao,
            status: "ENVIADO_APROVACAO", // Status padronizado para o frontend
            interStatus: tipoRetorno, // Status original do Inter
            paymentDate: pixResult.dataPagamento || pixResult.dataOperacao,
            message: friendlyMessage,
          },
          // Campos legados para compatibilidade
          paymentId: pixPaymentId,
          tipoRetorno,
          codigoSolicitacao,
          dataPagamento: pixResult.dataPagamento,
          dataOperacao: pixResult.dataOperacao,
          pendingBankApproval: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : "Erro desconhecido";
      console.error("[inter-pix-payment] API Error:", errorMsg);

      await supabase
        .from("inter_pix_payments")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString()
        })
        .eq("id", pixPaymentId);

      if (payableId) {
        await supabase
          .from("payables")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("id", payableId);
      }

      await supabase.from("audit_logs").insert({
        company_id: paymentData.companyId,
        entity: "inter_pix_payments",
        entity_id: pixPaymentId,
        action: "pix_payment_failed",
        metadata_json: { error: errorMsg }
      });

      throw apiError;
    }

  } catch (error) {
    console.error("[inter-pix-payment] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
