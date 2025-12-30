import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API_URL = "https://cdpj.partners.bancointer.com.br";

// Call GCP proxy with mTLS certificates
async function callGcpProxy(
  proxyUrl: string,
  proxySecret: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  certificate: string,
  privateKey: string,
  data?: unknown
) {
  console.log(`[inter-validate-pix] Calling GCP proxy: ${method} ${path}`);
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${proxySecret}`
    },
    body: JSON.stringify({ 
      method, 
      url: `${INTER_API_URL}${path}`,
      headers, 
      data,
      // Pass certificates as base64
      certificate,
      privateKey
    })
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

// Validate PIX key by calling GCP proxy (which handles mTLS with Inter)
async function validatePixKeyViaProxy(
  proxyUrl: string,
  proxySecret: string,
  credentials: {
    client_id: string;
    client_secret: string;
    account_number: string;
    certificate_file_path: string;
    private_key_file_path: string;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
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
  console.log("[inter-validate-pix] Iniciando validação via GCP proxy...");
  
  try {
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
    const certArrayBuffer = await certData.arrayBuffer();
    const keyArrayBuffer = await keyData.arrayBuffer();
    
    const certBase64 = btoa(String.fromCharCode(...new Uint8Array(certArrayBuffer)));
    const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyArrayBuffer)));
    
    console.log("[inter-validate-pix] Certificados carregados com sucesso");

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

    // Call proxy to validate PIX key
    // The proxy needs to: 1) Get OAuth token, 2) Query DICT
    const proxyPayload = {
      action: "validate_pix_key",
      clientId: credentials.client_id,
      clientSecret: credentials.client_secret,
      accountNumber: credentials.account_number || "",
      certificate: certBase64,
      privateKey: keyBase64,
      pixKey,
      pixKeyType: keyType
    };

    console.log("[inter-validate-pix] Chamando proxy para validar chave PIX...");
    console.log("[inter-validate-pix] Proxy URL:", proxyUrl);
    console.log("[inter-validate-pix] Action:", proxyPayload.action);
    
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${proxySecret}`
      },
      body: JSON.stringify(proxyPayload)
    });

    const responseText = await response.text();
    console.log("[inter-validate-pix] Resposta do proxy - Status:", response.status);
    console.log("[inter-validate-pix] Resposta do proxy - Body:", responseText.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("[inter-validate-pix] Resposta inválida:", responseText.substring(0, 200));
      throw new Error("Resposta inválida do proxy");
    }

    if (result.error) {
      console.error("[inter-validate-pix] Erro do proxy:", result.error);
      return {
        valid: false,
        error: result.error
      };
    }

    // Handle successful validation response
    if (result.valid || result.name || result.nome) {
      const name = result.name || result.nome || result.nomeCorrentista || "Nome não disponível";
      const document = result.document || result.cpfCnpj || result.documento || "";
      
      // Mask document
      let documentMasked = document;
      const cleanDoc = document.replace(/\D/g, "");
      if (cleanDoc.length === 11) {
        documentMasked = `***.${cleanDoc.substring(3, 6)}.${cleanDoc.substring(6, 9)}-**`;
      } else if (cleanDoc.length === 14) {
        documentMasked = `**.${cleanDoc.substring(2, 5)}.${cleanDoc.substring(5, 8)}/${cleanDoc.substring(8, 12)}-**`;
      }

      return {
        valid: true,
        name,
        document: cleanDoc,
        documentMasked,
        bank: result.bank || result.ispb || result.instituicao || "Banco Inter",
        keyType
      };
    }

    return {
      valid: false,
      error: result.message || "Chave PIX não encontrada"
    };

  } catch (error) {
    console.error("[inter-validate-pix] Erro na validação:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Erro ao validar chave PIX"
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

    // Get proxy URL and secret
    const proxyUrl = Deno.env.get("GCP_PIX_FUNCTION_URL");
    const proxySecret = Deno.env.get("GCP_PIX_FUNCTION_SECRET");
    
    if (!proxyUrl) {
      throw new Error("GCP_PIX_FUNCTION_URL não configurada");
    }
    if (!proxySecret) {
      throw new Error("GCP_PIX_FUNCTION_SECRET não configurada");
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

    console.log("[inter-validate-pix] Credenciais encontradas - client_id:", credentials.client_id?.substring(0, 8) + "...");

    // Validate PIX key via GCP proxy
    const validation = await validatePixKeyViaProxy(
      proxyUrl,
      proxySecret,
      credentials,
      supabase,
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
