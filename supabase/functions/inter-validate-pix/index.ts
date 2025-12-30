import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Convert to base64 - use TextDecoder to properly handle the PEM content
    const certText = await certData.text();
    const keyText = await keyData.text();
    
    // Encode as base64 properly (PEM files are already text, so we encode the text itself)
    const certBase64 = btoa(certText);
    const keyBase64 = btoa(keyText);
    
    console.log("[inter-validate-pix] Certificados carregados e convertidos para base64");
    console.log("[inter-validate-pix] Cert length:", certBase64.length, "Key length:", keyBase64.length);

    // Map PIX key type
    const pixKeyTypeMap: Record<string, string> = {
      cpf: "cpf",
      cnpj: "cnpj",
      email: "email",
      telefone: "telefone",
      phone: "telefone",
      aleatorio: "evp",
      evp: "evp",
    };
    const mappedKeyType = pixKeyTypeMap[pix_key_type.toLowerCase()] || "evp";

    // Call GCP proxy with action for validate_pix_key
    console.log("[inter-validate-pix] Chamando GCP proxy com action: validate_pix_key");
    
    const proxyResponse = await fetch(proxyUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${proxySecret}`
      },
      body: JSON.stringify({
        action: "validate_pix_key",
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret,
        accountNumber: credentials.account_number || "",
        certificate: certBase64,
        privateKey: keyBase64,
        pixKey: pix_key,
        pixKeyType: mappedKeyType
      })
    });

    const responseText = await proxyResponse.text();
    console.log("[inter-validate-pix] Proxy response status:", proxyResponse.status);
    console.log("[inter-validate-pix] Proxy response body:", responseText.substring(0, 500));

    let proxyResult;
    try {
      proxyResult = JSON.parse(responseText);
    } catch {
      console.error("[inter-validate-pix] Erro ao parsear resposta:", responseText);
      throw new Error("Resposta inválida do proxy");
    }

    if (proxyResult.error) {
      console.error("[inter-validate-pix] Erro do proxy:", proxyResult.error);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: proxyResult.error 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Format response
    const result = {
      valid: proxyResult.valid || false,
      name: proxyResult.name,
      document: proxyResult.document,
      documentMasked: proxyResult.document ? maskDocument(proxyResult.document) : undefined,
      bank: proxyResult.bank,
      keyType: pix_key_type.toUpperCase(),
      error: proxyResult.error
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

function maskDocument(document: string): string {
  const cleanDoc = document.replace(/\D/g, "");
  if (cleanDoc.length === 11) {
    return `***.${cleanDoc.substring(3, 6)}.${cleanDoc.substring(6, 9)}-**`;
  } else if (cleanDoc.length === 14) {
    return `**.${cleanDoc.substring(2, 5)}.${cleanDoc.substring(5, 8)}/${cleanDoc.substring(8, 12)}-**`;
  }
  return document;
}
