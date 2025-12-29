import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  payment_date?: string; // Data de pagamento (default: hoje)
  description?: string;
}

interface InterCredentials {
  client_id: string;
  client_secret: string;
  certificate_file_path: string;
  private_key_file_path: string;
  account_number: string | null;
}

async function getOAuthToken(
  credentials: InterCredentials,
  cert: string,
  key: string
): Promise<string> {
  console.log("[inter-boleto-payment] Obtendo token OAuth...");
  
  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  
  const httpClient = Deno.createHttpClient({
    caCerts: [],
    cert: cert,
    key: key,
  });

  const params = new URLSearchParams();
  params.append("client_id", credentials.client_id);
  params.append("client_secret", credentials.client_secret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "pagamento-boleto.write pagamento-boleto.read");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    client: httpClient,
  });

  httpClient.close();

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[inter-boleto-payment] Erro ao obter token:", errorText);
    throw new Error(`Erro ao obter token OAuth: ${response.status}`);
  }

  const data = await response.json();
  console.log("[inter-boleto-payment] Token obtido com sucesso");
  return data.access_token;
}

async function payBoleto(
  token: string,
  credentials: InterCredentials,
  cert: string,
  key: string,
  payload: BoletoPaymentRequest
): Promise<{ codigoTransacao: string; codigoSolicitacao: string }> {
  console.log("[inter-boleto-payment] Pagando boleto...");
  
  const paymentUrl = `${INTER_API_URL}/banking/v2/pagamento`;
  
  const httpClient = Deno.createHttpClient({
    caCerts: [],
    cert: cert,
    key: key,
  });

  // Limpar código de barras (remover pontos e espaços)
  const codigoBarras = payload.boleto_barcode.replace(/[\s.-]/g, "");
  const dataPagamento = payload.payment_date || new Date().toISOString().split("T")[0];

  const boletoBody = {
    codBarraLinhaDigitavel: codigoBarras,
    valorPagar: payload.amount.toFixed(2),
    dataPagamento: dataPagamento,
  };

  console.log("[inter-boleto-payment] Payload:", JSON.stringify(boletoBody, null, 2));

  const response = await fetch(paymentUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-conta-corrente": credentials.account_number || "",
    },
    body: JSON.stringify(boletoBody),
    client: httpClient,
  });

  httpClient.close();

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[inter-boleto-payment] Erro ao pagar boleto:", errorText);
    
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || errorJson.title || `Erro ${response.status}`);
    } catch {
      throw new Error(`Erro ao pagar boleto: ${response.status} - ${errorText}`);
    }
  }

  const result = await response.json();
  console.log("[inter-boleto-payment] Boleto pago:", result);
  
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

    // Buscar credenciais do Banco Inter
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", payload.company_id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais do Banco Inter não configuradas ou inativas");
    }

    // Buscar certificado e chave privada do storage
    console.log("[inter-boleto-payment] Buscando certificados...");
    
    const { data: certData, error: certError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.certificate_file_path);

    if (certError || !certData) {
      console.error("[inter-boleto-payment] Erro ao buscar certificado:", certError);
      throw new Error("Certificado não encontrado");
    }

    const { data: keyData, error: keyError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.private_key_file_path);

    if (keyError || !keyData) {
      console.error("[inter-boleto-payment] Erro ao buscar chave privada:", keyError);
      throw new Error("Chave privada não encontrada");
    }

    const cert = await certData.text();
    const key = await keyData.text();

    // Atualizar payable para processando
    await supabase
      .from("payables")
      .update({ payment_status: "sent_to_bank" })
      .eq("id", payload.payable_id);

    try {
      const token = await getOAuthToken(credentials, cert, key);
      const boletoResult = await payBoleto(token, credentials, cert, key, payload);

      // Atualizar payable como pago
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

      // Log de auditoria
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

      // Marcar como falha
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
