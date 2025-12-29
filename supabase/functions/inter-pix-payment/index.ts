import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API_URL = "https://cdpj.partners.bancointer.com.br";

interface PixPaymentRequest {
  company_id: string;
  payment_id?: string;
  payable_id?: string;
  recipient_name: string;
  recipient_document: string;
  pix_key: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "telefone" | "aleatorio";
  amount: number;
  description?: string;
  is_approval?: boolean;
}

interface InterCredentials {
  client_id: string;
  client_secret: string;
  certificate_file_path: string;
  private_key_file_path: string;
  account_number: string | null;
}

function normalizePEM(content: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): string {
  // Remove espaços em branco extras e normaliza
  let cleaned = content.trim();
  
  // Se já está no formato PEM correto, retorna
  if (cleaned.includes(`-----BEGIN ${type}-----`)) {
    return cleaned;
  }
  
  // Tenta detectar se é base64 puro sem headers
  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  if (base64Regex.test(cleaned)) {
    // Remove quebras de linha e espaços
    cleaned = cleaned.replace(/\s/g, '');
    // Adiciona headers PEM
    const chunks = cleaned.match(/.{1,64}/g) || [];
    return `-----BEGIN ${type}-----\n${chunks.join('\n')}\n-----END ${type}-----`;
  }
  
  return cleaned;
}

async function getOAuthToken(
  credentials: InterCredentials,
  cert: string,
  key: string
): Promise<string> {
  console.log("[inter-pix-payment] Obtendo token OAuth...");
  
  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  
  // Normalizar certificado e chave
  const normalizedCert = normalizePEM(cert, 'CERTIFICATE');
  const normalizedKey = normalizePEM(key, 'PRIVATE KEY');
  
  console.log("[inter-pix-payment] Cert starts with:", normalizedCert.substring(0, 50));
  console.log("[inter-pix-payment] Key starts with:", normalizedKey.substring(0, 50));
  
  // Criar cliente HTTP com certificado mTLS
  const httpClient = Deno.createHttpClient({
    cert: normalizedCert,
    key: normalizedKey,
  });

  const params = new URLSearchParams();
  params.append("client_id", credentials.client_id);
  params.append("client_secret", credentials.client_secret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "pagamento-pix.write pagamento-pix.read");

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
    console.error("[inter-pix-payment] Erro ao obter token:", errorText);
    throw new Error(`Erro ao obter token OAuth: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("[inter-pix-payment] Token obtido com sucesso");
  return data.access_token;
}

async function sendPixPayment(
  token: string,
  credentials: InterCredentials,
  cert: string,
  key: string,
  payload: PixPaymentRequest
): Promise<{ endToEndId: string; codigoSolicitacao: string }> {
  console.log("[inter-pix-payment] Enviando PIX...");
  
  const pixUrl = `${INTER_API_URL}/banking/v2/pix`;
  
  // Normalizar certificado e chave
  const normalizedCert = normalizePEM(cert, 'CERTIFICATE');
  const normalizedKey = normalizePEM(key, 'PRIVATE KEY');
  
  const httpClient = Deno.createHttpClient({
    cert: normalizedCert,
    key: normalizedKey,
  });

  const pixBody = {
    valor: payload.amount.toFixed(2),
    dataPagamento: new Date().toISOString().split("T")[0],
    descricao: payload.description || `PIX para ${payload.recipient_name}`,
    destinatario: {
      tipo: "CHAVE",
      chave: payload.pix_key,
      contaBanco: {
        cpfCnpj: payload.recipient_document.replace(/\D/g, ""),
        nome: payload.recipient_name,
        tipoConta: "CONTA_CORRENTE",
      },
    },
  };

  console.log("[inter-pix-payment] Payload:", JSON.stringify(pixBody, null, 2));

  const response = await fetch(pixUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-conta-corrente": credentials.account_number || "",
    },
    body: JSON.stringify(pixBody),
    client: httpClient,
  });

  httpClient.close();

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[inter-pix-payment] Erro ao enviar PIX:", errorText);
    
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || errorJson.title || `Erro ${response.status}`);
    } catch {
      throw new Error(`Erro ao enviar PIX: ${response.status} - ${errorText}`);
    }
  }

  const result = await response.json();
  console.log("[inter-pix-payment] PIX enviado:", result);
  
  return {
    endToEndId: result.endToEndId || result.e2eId,
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
    const payload: PixPaymentRequest = await req.json();
    console.log(`[inter-pix-payment] Processando PIX: R$ ${payload.amount} para ${payload.recipient_name}`);

    if (!payload.company_id || !payload.recipient_name || !payload.pix_key || !payload.amount) {
      throw new Error("Campos obrigatórios: company_id, recipient_name, pix_key, amount");
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
    console.log("[inter-pix-payment] Buscando certificados...");
    
    const { data: certData, error: certError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.certificate_file_path);

    if (certError || !certData) {
      console.error("[inter-pix-payment] Erro ao buscar certificado:", certError);
      throw new Error("Certificado não encontrado");
    }

    const { data: keyData, error: keyError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.private_key_file_path);

    if (keyError || !keyData) {
      console.error("[inter-pix-payment] Erro ao buscar chave privada:", keyError);
      throw new Error("Chave privada não encontrada");
    }

    const cert = await certData.text();
    const key = await keyData.text();

    let paymentId = payload.payment_id;

    if (payload.is_approval && paymentId) {
      await supabase
        .from("inter_pix_payments")
        .update({ status: "processing" })
        .eq("id", paymentId);
    } else if (!paymentId) {
      const { data: payment, error: insertError } = await supabase
        .from("inter_pix_payments")
        .insert({
          company_id: payload.company_id,
          payable_id: payload.payable_id || null,
          recipient_name: payload.recipient_name,
          recipient_document: payload.recipient_document,
          pix_key: payload.pix_key,
          pix_key_type: payload.pix_key_type,
          amount: payload.amount,
          description: payload.description || `PIX para ${payload.recipient_name}`,
          status: "processing",
        })
        .select()
        .single();

      if (insertError) {
        console.error("[inter-pix-payment] Erro ao criar registro:", insertError);
        throw new Error("Erro ao registrar pagamento");
      }
      
      paymentId = payment.id;
    }

    console.log(`[inter-pix-payment] Pagamento ID: ${paymentId}`);

    try {
      const token = await getOAuthToken(credentials, cert, key);
      const pixResult = await sendPixPayment(token, credentials, cert, key, payload);

      await supabase
        .from("inter_pix_payments")
        .update({
          status: "completed",
          inter_status: "REALIZADO",
          inter_end_to_end_id: pixResult.endToEndId,
          inter_transaction_id: pixResult.codigoSolicitacao,
          inter_response: pixResult,
          processed_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (payload.payable_id) {
        await supabase
          .from("payables")
          .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            paid_amount: payload.amount,
            payment_method: "pix",
          })
          .eq("id", payload.payable_id);
      }

      await supabase.from("audit_logs").insert({
        company_id: payload.company_id,
        action: "pix_payment_success",
        entity: "inter_pix_payments",
        entity_id: paymentId,
        metadata_json: {
          amount: payload.amount,
          recipient: payload.recipient_name,
          pix_key: payload.pix_key,
          end_to_end_id: pixResult.endToEndId,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: paymentId,
          end_to_end_id: pixResult.endToEndId,
          transaction_id: pixResult.codigoSolicitacao,
          status: "completed",
          message: "PIX enviado com sucesso",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : "Erro desconhecido";
      console.error("[inter-pix-payment] Erro na API:", errorMsg);

      await supabase
        .from("inter_pix_payments")
        .update({
          status: "failed",
          inter_status: "ERRO",
          error_message: errorMsg,
        })
        .eq("id", paymentId);

      await supabase.from("audit_logs").insert({
        company_id: payload.company_id,
        action: "pix_payment_failed",
        entity: "inter_pix_payments",
        entity_id: paymentId,
        metadata_json: {
          amount: payload.amount,
          recipient: payload.recipient_name,
          error: errorMsg,
        },
      });

      throw new Error(errorMsg);
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-pix-payment] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
