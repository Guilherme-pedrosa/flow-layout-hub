import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INTER_BASE_URL = "https://cdpj.partners.bancointer.com.br";

/**
 * Valida se o texto parece ser PEM válido
 */
function assertPemLike(label: string, pemText: string) {
  if (!pemText.includes("BEGIN") || !pemText.includes("END")) {
    throw new Error(`${label} inválido: não parece PEM (BEGIN/END ausentes)`);
  }
}

/**
 * Cria um cliente HTTP com mTLS usando Deno.createHttpClient
 * Essa abordagem é mais robusta que Deno.connectTls direto
 */
function createMtlsClient(cert: string, key: string): Deno.HttpClient {
  const cleanCert = cert.trim();
  const cleanKey = key.trim();
  
  console.log(`[inter-mtls] Cert preview: ${cleanCert.substring(0, 60)}...`);
  console.log(`[inter-mtls] Key preview: ${cleanKey.substring(0, 60)}...`);
  console.log(`[inter-mtls] Cert length: ${cleanCert.length}, Key length: ${cleanKey.length}`);
  
  // Validação do certificado
  assertPemLike("CERT", cleanCert);
  
  // Validação da chave
  assertPemLike("KEY", cleanKey);
  
  // Verificar se a chave está encriptada (não suportado pelo Deno)
  if (cleanKey.includes("ENCRYPTED PRIVATE KEY")) {
    throw new Error("A chave privada está criptografada (ENCRYPTED PRIVATE KEY). Gere uma chave PEM sem senha para usar em mTLS.");
  }
  
  if (cleanKey.includes("ENCRYPTED")) {
    throw new Error("Chave privada encriptada não é suportada. Use chave sem senha.");
  }
  
  console.log(`[inter-mtls] Creating HttpClient with cert and key PEM strings`);
  
  // Criar cliente HTTP com mTLS usando PEM strings diretamente
  // A API do Deno usa 'cert' e 'key' para TlsCertifiedKeyPem
  return Deno.createHttpClient({
    cert: cleanCert,
    key: cleanKey,
  });
}

/**
 * Faz requisição HTTP com mTLS usando fetch + Deno.createHttpClient
 */
async function makeHttpsRequest(
  client: Deno.HttpClient,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: string | null
): Promise<{ status: number; body: string }> {
  const url = `${INTER_BASE_URL}${path}`;
  console.log(`[inter-mtls] Making ${method} request to ${url}`);
  
  const fetchOptions: RequestInit & { client: Deno.HttpClient } = {
    method,
    headers: {
      ...headers,
      "User-Agent": "WAI-ERP/1.0",
    },
    client,
  };
  
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    fetchOptions.body = body;
  }
  
  const response = await fetch(url, fetchOptions);
  const responseBody = await response.text();
  
  console.log(`[inter-mtls] Response status: ${response.status}, body length: ${responseBody.length}`);
  
  return { status: response.status, body: responseBody };
}

/**
 * Obtém token OAuth do Banco Inter usando mTLS
 */
async function getInterOAuthToken(
  client: Deno.HttpClient,
  clientId: string,
  clientSecret: string,
  scope: string
): Promise<string> {
  console.log(`[inter-mtls] Getting OAuth token with scope: ${scope}`);
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: scope,
  }).toString();

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const response = await makeHttpsRequest(client, "POST", "/oauth/v2/token", headers, body);
  
  if (response.status !== 200) {
    console.error(`[inter-mtls] OAuth error: ${response.body}`);
    throw new Error(`OAuth failed: ${response.body}`);
  }

  const parsed = JSON.parse(response.body);
  if (!parsed.access_token) {
    throw new Error(`OAuth response missing access_token: ${response.body}`);
  }

  console.log(`[inter-mtls] OAuth token obtained, scope: ${parsed.scope}`);
  return parsed.access_token;
}

/**
 * Busca extrato bancário do Banco Inter usando mTLS
 */
async function getInterExtrato(
  client: Deno.HttpClient,
  token: string,
  accountNumber: string,
  dateFrom: string,
  dateTo: string
): Promise<unknown> {
  const path = `/banking/v2/extrato?dataInicio=${dateFrom}&dataFim=${dateTo}`;
  
  console.log(`[inter-mtls] Getting extrato: ${path}`);
  
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  
  if (accountNumber) {
    headers["x-conta-corrente"] = accountNumber;
  }

  const response = await makeHttpsRequest(client, "GET", path, headers, null);
  
  console.log(`[inter-mtls] Extrato response status: ${response.status}`);
  
  // Log seguro do body
  const bodyPreview = response.body && typeof response.body === 'string' 
    ? response.body.substring(0, Math.min(500, response.body.length))
    : "(body inválido)";
  console.log(`[inter-mtls] Extrato response body preview: ${bodyPreview}`);
  
  if (response.status !== 200) {
    console.error(`[inter-mtls] Extrato error: ${bodyPreview}`);
    throw new Error(`Extrato failed (${response.status}): ${bodyPreview}`);
  }

  // Verificar se a resposta está vazia ou inválida
  if (!response.body || typeof response.body !== 'string' || response.body.trim().length === 0) {
    console.log(`[inter-mtls] Extrato retornou vazio, retornando array vazio`);
    return { transacoes: [] };
  }

  try {
    return JSON.parse(response.body);
  } catch (parseError) {
    console.error(`[inter-mtls] Erro ao parsear JSON: ${parseError}`);
    console.error(`[inter-mtls] Body length: ${response.body.length}`);
    return { transacoes: [] };
  }
}

interface SyncRequest {
  company_id: string;
  date_from: string;
  date_to: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, date_from, date_to }: SyncRequest = await req.json();
    console.log(`[inter-mtls] Sincronização: ${company_id}, ${date_from} a ${date_to}`);

    // Buscar credenciais Inter
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais do Banco Inter não configuradas");
    }

    // Buscar certificado e chave privada do storage
    const { data: certData, error: certError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.certificate_file_path);
    
    const { data: keyData, error: keyError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.private_key_file_path);

    if (certError || keyError || !certData || !keyData) {
      console.error("[inter-mtls] Erro ao carregar certificados:", certError?.message, keyError?.message);
      throw new Error("Certificado ou chave privada não encontrados no storage");
    }

    const cert = await certData.text();
    const key = await keyData.text();

    console.log(`[inter-mtls] Certificados carregados: cert ${cert.length} chars, key ${key.length} chars`);

    // Criar cliente mTLS uma vez e reusar
    const mtlsClient = createMtlsClient(cert, key);

    try {
      // Obter token OAuth via mTLS
      const token = await getInterOAuthToken(
        mtlsClient,
        credentials.client_id,
        credentials.client_secret,
        "extrato.read"
      );

      // Buscar extrato via mTLS
      const extratoResult = await getInterExtrato(
        mtlsClient,
        token,
        credentials.account_number || "",
        date_from,
        date_to
      );

      // Log seguro da resposta
      try {
        const resultStr = JSON.stringify(extratoResult);
        console.log(`[inter-mtls] Estrutura da resposta (${resultStr.length} chars):`, resultStr.slice(0, 500));
      } catch (e) {
        console.log(`[inter-mtls] Resposta recebida (não serializável):`, typeof extratoResult);
      }

      // A API do Inter retorna as transações em diferentes formatos
      const transacoes = Array.isArray(extratoResult) 
        ? extratoResult 
        : (extratoResult as { transacoes?: unknown[] })?.transacoes || [];

      console.log(`[inter-mtls] Recebidas ${transacoes.length} transações`);

      // Importar transações
      let importedCount = 0;
      for (const tx of transacoes) {
        const txData = tx as Record<string, unknown>;
        
        const dataMovimento = String(txData.dataMovimento || txData.dataEntrada || txData.data || "");
        const descricao = String(txData.descricao || txData.titulo || txData.detalhe || "");
        const valor = Number(txData.valor || 0);
        const tipoOperacao = String(txData.tipoOperacao || txData.tipo || (valor >= 0 ? "C" : "D"));
        const nsuOriginal = txData.nsu || txData.codigoTransacao || txData.idTransacao;
        
        const nsu = nsuOriginal 
          ? String(nsuOriginal) 
          : `INTER-${dataMovimento}-${descricao.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}-${Math.abs(valor).toFixed(2)}`;
        
        const amount = tipoOperacao === "C" || tipoOperacao === "CREDITO" 
          ? Math.abs(valor) 
          : -Math.abs(valor);
        
        const { error } = await supabase
          .from("bank_transactions")
          .upsert({
            company_id,
            transaction_date: dataMovimento,
            description: descricao,
            amount: amount,
            type: tipoOperacao === "C" || tipoOperacao === "CREDITO" ? "CREDIT" : "DEBIT",
            nsu: nsu,
            raw_data: txData,
          }, { onConflict: "company_id,nsu", ignoreDuplicates: true });
        
        if (!error) {
          importedCount++;
        }
      }

      // Atualizar timestamp de sincronização
      await supabase
        .from("inter_credentials")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("company_id", company_id);

      console.log(`[inter-mtls] Importadas ${importedCount} transações`);

      return new Response(
        JSON.stringify({ success: true, imported: importedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } finally {
      // Fechar cliente mTLS
      mtlsClient.close();
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-mtls] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
