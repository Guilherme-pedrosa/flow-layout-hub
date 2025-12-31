import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_HOST = "cdpj.partners.bancointer.com.br";
const INTER_PORT = 443;

/**
 * Faz uma requisição HTTP sobre TLS com mTLS (certificado de cliente)
 * O Deno suporta mTLS via Deno.connectTls com certChain e privateKey
 */
async function makeHttpsRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: string | null,
  cert: string,
  key: string
): Promise<{ status: number; body: string }> {
  console.log(`[inter-mtls] Making ${method} request to ${path}`);
  
  // Conectar com mTLS usando a API correta do Deno
  // Deno.connectTls com cert e key para client certificate (mTLS)
  const conn = await Deno.connectTls({
    hostname: INTER_HOST,
    port: INTER_PORT,
    // Para mTLS, usamos cert e key (não certChain)
    cert: cert,
    key: key,
  });

  try {
    // Construir request HTTP
    const headerLines = Object.entries(headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");

    let request = `${method} ${path} HTTP/1.1\r\n`;
    request += `Host: ${INTER_HOST}\r\n`;
    request += headerLines + "\r\n";
    
    if (body) {
      request += `Content-Length: ${new TextEncoder().encode(body).length}\r\n`;
    }
    request += "\r\n";
    
    if (body) {
      request += body;
    }

    // Enviar request
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(request));

    // Ler resposta
    const decoder = new TextDecoder();
    const buffer = new Uint8Array(65536);
    let response = "";
    
    // Ler até ter a resposta completa
    let readAttempts = 0;
    while (readAttempts < 10) {
      const n = await conn.read(buffer);
      if (n === null) break;
      response += decoder.decode(buffer.subarray(0, n));
      
      // Verificar se temos a resposta completa
      if (response.includes("\r\n\r\n")) {
        const headerEndIndex = response.indexOf("\r\n\r\n");
        const headersPart = response.substring(0, headerEndIndex);
        
        // Verificar Content-Length
        const contentLengthMatch = headersPart.match(/Content-Length:\s*(\d+)/i);
        if (contentLengthMatch) {
          const contentLength = parseInt(contentLengthMatch[1]);
          const bodyStart = headerEndIndex + 4;
          const currentBodyLength = new TextEncoder().encode(response.substring(bodyStart)).length;
          if (currentBodyLength >= contentLength) break;
        } else if (response.includes("Transfer-Encoding: chunked")) {
          // Para chunked, verificar se termina com 0\r\n\r\n
          if (response.endsWith("0\r\n\r\n")) break;
        } else {
          // Se não tem Content-Length nem chunked, assumir que a resposta está completa após um pequeno delay
          await new Promise(r => setTimeout(r, 100));
          const n2 = await conn.read(buffer);
          if (n2 === null || n2 === 0) break;
          response += decoder.decode(buffer.subarray(0, n2));
        }
      }
      readAttempts++;
    }

    // Parsear resposta HTTP
    const headerEndIndex = response.indexOf("\r\n\r\n");
    if (headerEndIndex === -1) {
      throw new Error("Invalid HTTP response - no header end found");
    }

    const headersPart = response.substring(0, headerEndIndex);
    const bodyPart = response.substring(headerEndIndex + 4);

    // Extrair status code
    const statusLine = headersPart.split("\r\n")[0];
    const statusMatch = statusLine.match(/HTTP\/[\d.]+\s+(\d+)/);
    const status = statusMatch ? parseInt(statusMatch[1]) : 500;

    // Lidar com chunked encoding se necessário
    let finalBody = bodyPart;
    if (headersPart.toLowerCase().includes("transfer-encoding: chunked")) {
      finalBody = parseChunkedBody(bodyPart);
    }

    console.log(`[inter-mtls] Response status: ${status}, body length: ${finalBody.length}`);
    return { status, body: finalBody };
  } finally {
    conn.close();
  }
}

function parseChunkedBody(chunkedBody: string): string {
  let result = "";
  let remaining = chunkedBody;
  
  while (remaining.length > 0) {
    const lineEnd = remaining.indexOf("\r\n");
    if (lineEnd === -1) break;
    
    const sizeHex = remaining.substring(0, lineEnd);
    const size = parseInt(sizeHex, 16);
    
    if (size === 0) break;
    
    const chunkStart = lineEnd + 2;
    const chunkEnd = chunkStart + size;
    result += remaining.substring(chunkStart, chunkEnd);
    remaining = remaining.substring(chunkEnd + 2); // +2 for \r\n after chunk
  }
  
  return result;
}

/**
 * Obtém token OAuth do Banco Inter usando mTLS
 */
async function getInterOAuthToken(
  clientId: string,
  clientSecret: string,
  cert: string,
  key: string,
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

  const response = await makeHttpsRequest("POST", "/oauth/v2/token", headers, body, cert, key);
  
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
  token: string,
  accountNumber: string,
  dateFrom: string,
  dateTo: string,
  cert: string,
  key: string
): Promise<unknown> {
  const path = `/banking/v2/extrato?dataInicio=${dateFrom}&dataFim=${dateTo}`;
  
  console.log(`[inter-mtls] Getting extrato: ${path}`);
  
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-conta-corrente": accountNumber,
  };

  const response = await makeHttpsRequest("GET", path, headers, null, cert, key);
  
  console.log(`[inter-mtls] Extrato response status: ${response.status}`);
  console.log(`[inter-mtls] Extrato response body: ${response.body.slice(0, 500)}`);
  
  if (response.status !== 200) {
    console.error(`[inter-mtls] Extrato error: ${response.body}`);
    throw new Error(`Extrato failed (${response.status}): ${response.body}`);
  }

  // Verificar se a resposta está vazia ou inválida
  if (!response.body || response.body.trim().length === 0) {
    console.log(`[inter-mtls] Extrato retornou vazio, retornando array vazio`);
    return { transacoes: [] };
  }

  try {
    return JSON.parse(response.body);
  } catch (parseError) {
    console.error(`[inter-mtls] Erro ao parsear JSON: ${parseError}`);
    console.error(`[inter-mtls] Body recebido: "${response.body}"`);
    // Se não conseguir parsear, retorna vazio
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

    // Obter token OAuth via mTLS direto
    const token = await getInterOAuthToken(
      credentials.client_id,
      credentials.client_secret,
      cert,
      key,
      "extrato.read"
    );

    // Buscar extrato via mTLS direto
    const extratoResult = await getInterExtrato(
      token,
      credentials.account_number || "",
      date_from,
      date_to,
      cert,
      key
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

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-mtls] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
