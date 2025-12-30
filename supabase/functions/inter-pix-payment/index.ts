import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("[inter-pix-payment] ========== INICIANDO ==========");
  console.log("[inter-pix-payment] Method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const payload = await req.json();
    console.log("[inter-pix-payment] 1. Payload recebido:", JSON.stringify(payload));

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

    // Map PIX key type to Inter API format
    const tipoChaveMap: Record<string, string> = {
      'cpf': 'CPF',
      'cnpj': 'CNPJ',
      'email': 'EMAIL',
      'telefone': 'TELEFONE',
      'celular': 'TELEFONE',
      'phone': 'TELEFONE',
      'evp': 'CHAVE_ALEATORIA',
      'aleatoria': 'CHAVE_ALEATORIA'
    };

    // Build PIX payment payload for Inter API - pagamento por chave PIX
    // O valor deve ser decimal como string (ex: R$12,00 = "12.00")
    const recipientDoc = paymentData.recipientDocument.replace(/[^\d]/g, "");
    
    const pixApiPayload = {
      valor: paymentData.amount.toFixed(2),
      chave: paymentData.pixKey,
      destinatario: {
        tipo: recipientDoc.length === 11 ? 'FISICA' : 'JURIDICA',
        nome: paymentData.recipientName,
        cpfCnpj: recipientDoc
      },
      dataPagamento: new Date().toISOString().split('T')[0],
      descricao: (paymentData.description || `PIX para ${paymentData.recipientName}`).substring(0, 140)
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
        data: JSON.stringify(pixApiPayload)
      };

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

      // Check if successful
      if (!pixResult.success && !pixResult.transactionId && !pixResult.endToEndId) {
        throw new Error(pixResult.error || "Resposta inválida do proxy");
      }

      // Check if pending approval
      const isPendingApproval = pixResult.pendingApproval || 
        ["AGUARDANDO_APROVACAO", "PENDENTE", "EM_PROCESSAMENTO", "AGENDADO", "PENDENTE_APROVACAO"]
          .includes(pixResult.status);
      
      console.log("[inter-pix-payment] 12. Status:", pixResult.status, "- Pendente aprovação:", isPendingApproval);
      const internalStatus = isPendingApproval ? "pending_approval" : "completed";
      
      await supabase
        .from("inter_pix_payments")
        .update({
          status: internalStatus,
          inter_transaction_id: pixResult.transactionId,
          inter_end_to_end_id: pixResult.endToEndId,
          inter_status: pixResult.status,
          processed_at: isPendingApproval ? null : new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", pixPaymentId);

      // Update linked payable
      if (payableId) {
        if (isPendingApproval) {
          await supabase
            .from("payables")
            .update({
              payment_status: "pending_approval",
              inter_payment_id: pixPaymentId,
              updated_at: new Date().toISOString()
            })
            .eq("id", payableId);
        } else {
          await supabase
            .from("payables")
            .update({
              is_paid: true,
              paid_at: new Date().toISOString(),
              paid_amount: paymentData.amount,
              payment_method: "pix",
              payment_status: "paid",
              inter_payment_id: pixPaymentId,
              updated_at: new Date().toISOString()
            })
            .eq("id", payableId);
        }
      }

      // Audit logs
      await supabase.from("audit_logs").insert({
        company_id: paymentData.companyId,
        entity: "inter_pix_payments",
        entity_id: pixPaymentId,
        action: isPendingApproval ? "pix_payment_pending_approval" : "pix_payment_completed",
        metadata_json: {
          transactionId: pixResult.transactionId,
          endToEndId: pixResult.endToEndId,
          amount: paymentData.amount,
          recipient: paymentData.recipientName
        }
      });

      await supabase.from("payment_audit_logs").insert({
        payable_id: payableId || pixPaymentId!,
        action: isPendingApproval ? "pix_pending_approval" : "pix_payment_sent",
        old_status: "processing",
        new_status: internalStatus,
        metadata: {
          transactionId: pixResult.transactionId,
          amount: paymentData.amount,
          recipient: paymentData.recipientName,
          pixKey: paymentData.pixKey
        }
      });

      console.log(`[inter-pix-payment] Success - Status: ${internalStatus}`);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: pixPaymentId,
          status: internalStatus,
          transactionId: pixResult.transactionId,
          endToEndId: pixResult.endToEndId,
          pendingApproval: isPendingApproval
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
