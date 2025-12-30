import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API_URL = "https://cdpj.partners.bancointer.com.br";

// Helper function to call the Inter proxy
async function callInterProxy(
  proxyUrl: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  data?: unknown
) {
  console.log(`[inter-pix-payment] Calling proxy: ${method} ${url}`);
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, url, headers, data })
  });

  const responseText = await response.text();
  console.log(`[inter-pix-payment] Proxy response status: ${response.status}`);
  
  if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
    throw new Error(`Proxy retornou HTML (status ${response.status}). Verifique a URL do proxy.`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Resposta inválida do proxy: ${responseText.substring(0, 200)}`);
  }

  if (!response.ok) {
    console.error("[inter-pix-payment] Proxy error:", result);
    throw new Error(result.error || result.message || `Erro HTTP ${response.status}`);
  }

  return result;
}

// Get OAuth token via proxy
async function getOAuthToken(
  proxyUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  console.log("[inter-pix-payment] Obtendo token OAuth via proxy...");
  
  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "pagamento-pix.write pagamento-pix.read");

  const result = await callInterProxy(
    proxyUrl,
    "POST",
    tokenUrl,
    { "Content-Type": "application/x-www-form-urlencoded" },
    params.toString()
  );

  console.log("[inter-pix-payment] Token obtido com sucesso");
  return result.access_token;
}

// Send PIX payment via proxy
async function sendPixPayment(
  proxyUrl: string,
  token: string,
  accountNumber: string,
  paymentData: {
    pixKey: string;
    pixKeyType: string;
    amount: number;
    recipientName: string;
    recipientDocument: string;
    description?: string;
  }
): Promise<{ transactionId: string; endToEndId: string; status: string }> {
  console.log("[inter-pix-payment] Enviando PIX via proxy...");
  
  const pixUrl = `${INTER_API_URL}/banking/v2/pix`;
  
  // Map pix key types
  const pixKeyTypeMap: Record<string, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "EMAIL",
    telefone: "TELEFONE",
    phone: "TELEFONE",
    aleatoria: "CHAVE_ALEATORIA",
    evp: "CHAVE_ALEATORIA",
  };

  const pixPayload = {
    destinatario: {
      tipo: pixKeyTypeMap[paymentData.pixKeyType.toLowerCase()] || "CHAVE_ALEATORIA",
      chave: paymentData.pixKey,
      nome: paymentData.recipientName,
      cpfCnpj: paymentData.recipientDocument.replace(/[^\d]/g, ""),
    },
    valor: paymentData.amount.toFixed(2),
    descricao: paymentData.description || `PIX para ${paymentData.recipientName}`,
  };

  console.log("[inter-pix-payment] PIX payload:", JSON.stringify(pixPayload, null, 2));

  const result = await callInterProxy(
    proxyUrl,
    "POST",
    pixUrl,
    {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-conta-corrente": accountNumber,
    },
    pixPayload
  );

  console.log("[inter-pix-payment] PIX result:", JSON.stringify(result));

  return {
    transactionId: result.codigoTransacao || result.txid || result.id,
    endToEndId: result.endToEndId || result.e2eid,
    status: result.status || "PROCESSANDO",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const payload = await req.json();
    console.log("[inter-pix-payment] Request received:", JSON.stringify(payload));

    // Get proxy URL
    const proxyUrl = Deno.env.get("GCP_PIX_FUNCTION_URL");
    if (!proxyUrl) {
      throw new Error("GCP_PIX_FUNCTION_URL não configurada");
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

    console.log(`[inter-pix-payment] Payment ID: ${pixPaymentId}`);

    // Fetch Inter credentials
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", paymentData.companyId)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais Inter não configuradas para esta empresa");
    }

    try {
      // Get OAuth token via proxy
      const token = await getOAuthToken(
        proxyUrl,
        credentials.client_id,
        credentials.client_secret
      );

      // Send PIX payment via proxy
      const pixResult = await sendPixPayment(
        proxyUrl,
        token,
        credentials.account_number || "",
        paymentData
      );

      // Check if pending approval
      const isPendingApproval = ["AGUARDANDO_APROVACAO", "PENDENTE", "EM_PROCESSAMENTO", "AGENDADO"]
        .includes(pixResult.status);
      
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
