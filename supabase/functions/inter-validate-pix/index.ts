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
  console.log(`[inter-validate-pix] Calling proxy: ${method} ${url}`);
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, url, headers, data })
  });

  const responseText = await response.text();
  console.log(`[inter-validate-pix] Proxy response status: ${response.status}`);
  
  if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
    throw new Error(`Proxy retornou HTML (status ${response.status}). Verifique a URL do proxy.`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Resposta inválida do proxy: ${responseText.substring(0, 200)}`);
  }

  return { result, status: response.status };
}

// Get OAuth token via proxy
async function getOAuthToken(
  proxyUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  console.log("[inter-validate-pix] Obtendo token OAuth via proxy...");
  
  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "pix.read");

  const { result, status } = await callInterProxy(
    proxyUrl,
    "POST",
    tokenUrl,
    { "Content-Type": "application/x-www-form-urlencoded" },
    params.toString()
  );

  if (status !== 200 || !result.access_token) {
    console.error("[inter-validate-pix] Erro ao obter token:", result);
    throw new Error(result.message || "Erro ao obter token de acesso");
  }

  console.log("[inter-validate-pix] Token obtido com sucesso");
  return result.access_token;
}

// Validate PIX key via DICT
async function validatePixKey(
  proxyUrl: string,
  token: string,
  accountNumber: string,
  pixKey: string,
  pixKeyType: string
): Promise<{
  valid: boolean;
  name?: string;
  document?: string;
  documentMasked?: string;
  bank?: string;
  keyType?: string;
  error?: string;
}> {
  console.log("[inter-validate-pix] Consultando chave PIX via DICT...");
  console.log("[inter-validate-pix] Chave:", pixKey, "Tipo:", pixKeyType);
  
  // Map pix key types to Inter API format
  const pixKeyTypeMap: Record<string, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "EMAIL",
    telefone: "PHONE",
    phone: "PHONE",
    aleatorio: "EVP",
    evp: "EVP",
  };

  const keyType = pixKeyTypeMap[pixKeyType.toLowerCase()] || "EVP";
  
  // Endpoint para consulta DICT no Inter
  const dictUrl = `${INTER_API_URL}/banking/v2/pix/keys/${encodeURIComponent(pixKey)}`;
  
  try {
    const { result, status } = await callInterProxy(
      proxyUrl,
      "GET",
      dictUrl,
      {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-conta-corrente": accountNumber,
      }
    );

    console.log("[inter-validate-pix] Resposta DICT:", JSON.stringify(result));

    if (status === 200 && result) {
      // Mascara o documento (CPF/CNPJ)
      const document = result.cpfCnpj || result.documento || "";
      let documentMasked = document;
      
      if (document.length === 11) {
        // CPF: ***.456.789-**
        documentMasked = `***.${document.substring(3, 6)}.${document.substring(6, 9)}-**`;
      } else if (document.length === 14) {
        // CNPJ: **.456.789/0001-**
        documentMasked = `**.${document.substring(2, 5)}.${document.substring(5, 8)}/${document.substring(8, 12)}-**`;
      }

      return {
        valid: true,
        name: result.nome || result.nomeCorrentista || result.titular?.nome || "Nome não disponível",
        document: document,
        documentMasked: documentMasked,
        bank: result.ispb || result.banco || result.instituicao || "Instituição",
        keyType: keyType,
      };
    } else {
      return {
        valid: false,
        error: result.message || result.error || "Chave PIX não encontrada",
      };
    }
  } catch (error) {
    console.error("[inter-validate-pix] Erro ao consultar DICT:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Erro ao validar chave PIX",
    };
  }
}

serve(async (req) => {
  console.log("[inter-validate-pix] ========== INICIANDO ==========");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { company_id, pix_key, pix_key_type } = await req.json();
    console.log("[inter-validate-pix] Request:", { company_id, pix_key, pix_key_type });

    if (!company_id || !pix_key || !pix_key_type) {
      throw new Error("Campos obrigatórios: company_id, pix_key, pix_key_type");
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
      .eq("company_id", company_id)
      .eq("is_active", true)
      .maybeSingle();

    if (credError || !credentials) {
      console.error("[inter-validate-pix] Credenciais não encontradas:", credError);
      throw new Error("Credenciais Inter não configuradas para esta empresa");
    }

    // Get OAuth token
    const token = await getOAuthToken(
      proxyUrl,
      credentials.client_id,
      credentials.client_secret
    );

    // Validate PIX key
    const validation = await validatePixKey(
      proxyUrl,
      token,
      credentials.account_number || "",
      pix_key,
      pix_key_type
    );

    console.log("[inter-validate-pix] Resultado:", JSON.stringify(validation));

    return new Response(
      JSON.stringify(validation),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[inter-validate-pix] Error:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { 
        status: 200, // Return 200 even on error so frontend can handle gracefully
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
