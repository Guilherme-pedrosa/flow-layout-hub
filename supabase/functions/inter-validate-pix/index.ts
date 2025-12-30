import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API_URL = "https://cdpj.partners.bancointer.com.br";

// Call GCP proxy with generic format: url, method, headers, data, certificate, privateKey
async function callProxy(
  proxyUrl: string,
  proxySecret: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  certificate: string,
  privateKey: string,
  data?: string
): Promise<{ result: unknown; status: number }> {
  console.log(`[inter-validate-pix] Proxy call: ${method} ${url}`);
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${proxySecret}`
    },
    body: JSON.stringify({ 
      method, 
      url,
      headers, 
      data,
      certificate,
      privateKey
    })
  });

  const responseText = await response.text();
  console.log(`[inter-validate-pix] Proxy response: ${response.status}`);
  console.log(`[inter-validate-pix] Proxy body: ${responseText.substring(0, 500)}`);
  
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    console.error("[inter-validate-pix] Parse error:", responseText.substring(0, 200));
    throw new Error(`Resposta inválida do proxy: ${responseText.substring(0, 100)}`);
  }

  return { result, status: response.status };
}

// Get OAuth token via proxy
async function getOAuthToken(
  proxyUrl: string,
  proxySecret: string,
  clientId: string,
  clientSecret: string,
  certBase64: string,
  keyBase64: string
): Promise<string> {
  console.log("[inter-validate-pix] Obtendo token OAuth...");
  
  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "pix.read");

  const { result, status } = await callProxy(
    proxyUrl,
    proxySecret,
    "POST",
    tokenUrl,
    { "Content-Type": "application/x-www-form-urlencoded" },
    certBase64,
    keyBase64,
    params.toString()
  );

  const tokenResult = result as { access_token?: string; error?: string; message?: string; error_description?: string };
  
  if (status !== 200 || !tokenResult.access_token) {
    console.error("[inter-validate-pix] Token error:", JSON.stringify(result));
    throw new Error(tokenResult.error_description || tokenResult.message || tokenResult.error || "Erro ao obter token");
  }

  console.log("[inter-validate-pix] Token obtido com sucesso");
  return tokenResult.access_token;
}

// Query DICT for PIX key validation via proxy
async function queryDict(
  proxyUrl: string,
  proxySecret: string,
  token: string,
  accountNumber: string,
  certBase64: string,
  keyBase64: string,
  pixKey: string
): Promise<{
  valid: boolean;
  name?: string;
  document?: string;
  documentMasked?: string;
  bank?: string;
  error?: string;
}> {
  console.log("[inter-validate-pix] Consultando DICT para chave:", pixKey);
  
  const dictUrl = `${INTER_API_URL}/banking/v2/pix/keys/${encodeURIComponent(pixKey)}`;
  
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  
  if (accountNumber) {
    headers["x-conta-corrente"] = accountNumber;
  }

  const { result, status } = await callProxy(
    proxyUrl,
    proxySecret,
    "GET",
    dictUrl,
    headers,
    certBase64,
    keyBase64
  );

  console.log("[inter-validate-pix] DICT response:", status, JSON.stringify(result));

  const dictResult = result as { 
    nome?: string; 
    nomeCorrentista?: string;
    titular?: { nome?: string };
    cpfCnpj?: string; 
    documento?: string;
    ispb?: string;
    banco?: string;
    instituicao?: string;
    error?: string;
    message?: string;
  };

  if (status >= 200 && status < 300 && (dictResult.nome || dictResult.nomeCorrentista || dictResult.titular?.nome)) {
    const name = dictResult.nome || dictResult.nomeCorrentista || dictResult.titular?.nome || "Nome não disponível";
    const document = dictResult.cpfCnpj || dictResult.documento || "";
    
    return {
      valid: true,
      name,
      document: document.replace(/\D/g, ""),
      documentMasked: maskDocument(document),
      bank: dictResult.ispb || dictResult.banco || dictResult.instituicao || "Instituição",
    };
  }

  if (status === 404) {
    return {
      valid: false,
      error: "Chave PIX não encontrada",
    };
  }

  return {
    valid: false,
    error: dictResult.message || dictResult.error || `Erro ${status}`,
  };
}

function maskDocument(document: string): string {
  const cleanDoc = document.replace(/\D/g, "");
  if (cleanDoc.length === 11) {
    return `***.${cleanDoc.substring(3, 6)}.${cleanDoc.substring(6, 9)}-**`;
  } else if (cleanDoc.length === 14) {
    return `**.${cleanDoc.substring(2, 5)}.${cleanDoc.substring(5, 8)}/${cleanDoc.substring(8, 12)}-**`;
  }
  return document;
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

    // Get proxy URL and secret
    const proxyUrl = Deno.env.get("GCP_PIX_FUNCTION_URL");
    const proxySecret = Deno.env.get("GCP_PIX_FUNCTION_SECRET");
    
    if (!proxyUrl) {
      throw new Error("GCP_PIX_FUNCTION_URL não configurada");
    }
    if (!proxySecret) {
      throw new Error("GCP_PIX_FUNCTION_SECRET não configurada");
    }

    console.log("[inter-validate-pix] Proxy URL:", proxyUrl);

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

    console.log("[inter-validate-pix] Credenciais encontradas - client_id:", credentials.client_id?.substring(0, 8) + "...");

    // Download certificates from Supabase Storage
    console.log("[inter-validate-pix] Baixando certificados do storage...");
    
    const { data: certData, error: certError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.certificate_file_path);
    
    if (certError || !certData) {
      console.error("[inter-validate-pix] Erro ao baixar certificado:", certError);
      throw new Error("Erro ao baixar certificado do storage");
    }

    const { data: keyData, error: keyError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.private_key_file_path);
    
    if (keyError || !keyData) {
      console.error("[inter-validate-pix] Erro ao baixar chave privada:", keyError);
      throw new Error("Erro ao baixar chave privada do storage");
    }

    // Convert to base64
    const certText = await certData.text();
    const keyText = await keyData.text();
    
    const certBase64 = btoa(certText);
    const keyBase64 = btoa(keyText);
    
    console.log("[inter-validate-pix] Certificados carregados - Cert length:", certBase64.length, "Key length:", keyBase64.length);

    // Step 1: Get OAuth token
    const token = await getOAuthToken(
      proxyUrl,
      proxySecret,
      credentials.client_id,
      credentials.client_secret,
      certBase64,
      keyBase64
    );

    // Step 2: Query DICT for PIX key validation
    const validation = await queryDict(
      proxyUrl,
      proxySecret,
      token,
      credentials.account_number || "",
      certBase64,
      keyBase64,
      pix_key
    );

    const result = { 
      ...validation, 
      keyType: pix_key_type.toUpperCase() 
    };
    
    console.log("[inter-validate-pix] Resultado final:", JSON.stringify(result));

    return new Response(
      JSON.stringify(result),
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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
