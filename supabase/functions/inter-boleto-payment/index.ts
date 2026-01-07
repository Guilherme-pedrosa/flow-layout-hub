import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API_URL = "https://cdpj.partners.bancointer.com.br";

interface BoletoPaymentRequest {
  company_id: string;
  payable_id: string;
  boleto_barcode: string;
  amount: number;
  payment_date?: string;
  description?: string;
}

// Helper function to call the Inter proxy
async function callInterProxy(
  proxyUrl: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  data?: unknown
) {
  console.log(`[inter-boleto-payment] Calling proxy: ${method} ${url}`);
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, url, headers, data })
  });

  const responseText = await response.text();
  console.log(`[inter-boleto-payment] Proxy response status: ${response.status}`);
  
  if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
    throw new Error(`Proxy retornou HTML (status ${response.status})`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Resposta inválida do proxy: ${responseText.substring(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(result.error || result.message || result.title || `Erro HTTP ${response.status}`);
  }

  return result;
}

// Get OAuth token via proxy
async function getOAuthToken(
  proxyUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  console.log("[inter-boleto-payment] Obtendo token OAuth via proxy...");
  
  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "pagamento-boleto.write pagamento-boleto.read");

  const result = await callInterProxy(
    proxyUrl,
    "POST",
    tokenUrl,
    { "Content-Type": "application/x-www-form-urlencoded" },
    params.toString()
  );

  return result.access_token;
}

// Pay boleto via proxy
async function payBoleto(
  proxyUrl: string,
  token: string,
  accountNumber: string,
  boletoBarcode: string,
  amount: number,
  paymentDate: string
): Promise<{ codigoTransacao: string; codigoSolicitacao: string }> {
  console.log("[inter-boleto-payment] Pagando boleto via proxy...");
  
  const paymentUrl = `${INTER_API_URL}/banking/v2/pagamento`;
  
  const codigoBarras = boletoBarcode.replace(/[\s.-]/g, "");

  const boletoBody = {
    codBarraLinhaDigitavel: codigoBarras,
    valorPagar: amount.toFixed(2),
    dataPagamento: paymentDate,
  };

  console.log("[inter-boleto-payment] Payload:", JSON.stringify(boletoBody, null, 2));

  const result = await callInterProxy(
    proxyUrl,
    "POST",
    paymentUrl,
    {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-conta-corrente": accountNumber,
    },
    boletoBody
  );

  return {
    codigoTransacao: result.codigoTransacao || result.id,
    codigoSolicitacao: result.codigoSolicitacao || result.txid,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: BoletoPaymentRequest = await req.json();
    console.log(`[inter-boleto-payment] Processando boleto: R$ ${payload.amount}`);

    if (!payload.company_id || !payload.boleto_barcode || !payload.amount) {
      throw new Error("Campos obrigatórios: company_id, boleto_barcode, amount");
    }

    if (payload.amount <= 0) {
      throw new Error("O valor deve ser maior que zero");
    }

    // Get proxy URL
    const proxyUrl = Deno.env.get("GCP_PIX_FUNCTION_URL");
    if (!proxyUrl) {
      throw new Error("GCP_PIX_FUNCTION_URL não configurada");
    }

    // Fetch Inter credentials
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", payload.company_id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais do Banco Inter não configuradas ou inativas");
    }

    // Update payable status
    await supabase
      .from("payables")
      .update({ payment_status: "sent_to_bank" })
      .eq("id", payload.payable_id);

    try {
      // Get OAuth token via proxy
      const token = await getOAuthToken(
        proxyUrl,
        credentials.client_id,
        credentials.client_secret
      );

      // Pay boleto via proxy
      const paymentDate = payload.payment_date || new Date().toISOString().split("T")[0];
      const boletoResult = await payBoleto(
        proxyUrl,
        token,
        credentials.account_number || "",
        payload.boleto_barcode,
        payload.amount,
        paymentDate
      );

      // Update payable as paid
      await supabase
        .from("payables")
        .update({
          payment_status: "paid",
          is_paid: true,
          paid_at: new Date().toISOString(),
          paid_amount: payload.amount,
          payment_method: "boleto",
          inter_payment_id: boletoResult.codigoTransacao,
        })
        .eq("id", payload.payable_id);

      // Audit logs
      await supabase.from("payment_audit_logs").insert({
        payable_id: payload.payable_id,
        action: "boleto_paid",
        old_status: "sent_to_bank",
        new_status: "paid",
        metadata: {
          codigo_transacao: boletoResult.codigoTransacao,
          amount: payload.amount,
        },
      });

      await supabase.from("audit_logs").insert({
        company_id: payload.company_id,
        action: "boleto_payment_success",
        entity: "payables",
        entity_id: payload.payable_id,
        metadata_json: {
          amount: payload.amount,
          codigo_transacao: boletoResult.codigoTransacao,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          payable_id: payload.payable_id,
          codigo_transacao: boletoResult.codigoTransacao,
          status: "paid",
          message: "Boleto pago com sucesso",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : "Erro desconhecido";
      console.error("[inter-boleto-payment] Erro na API:", errorMsg);

      await supabase
        .from("payables")
        .update({ payment_status: "failed" })
        .eq("id", payload.payable_id);

      await supabase.from("payment_audit_logs").insert({
        payable_id: payload.payable_id,
        action: "boleto_payment_failed",
        old_status: "sent_to_bank",
        new_status: "failed",
        metadata: { error: errorMsg },
      });

      throw new Error(errorMsg);
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-boleto-payment] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
