import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API_URL = "https://cdpj.partners.bancointer.com.br";

interface SyncRequest {
  company_id: string;
  date_from: string;
  date_to: string;
}

// Helper function to call the Inter proxy with mTLS
async function callInterProxyWithMTLS(
  proxyUrl: string,
  proxySecret: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  certificate: string,
  privateKey: string,
  accountNumber: string,
  clientId?: string,
  clientSecret?: string,
  scope?: string,
  data?: unknown
) {
  console.log(`[inter-sync] Calling proxy with mTLS: ${method} ${url}`);
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${proxySecret}`
    },
    body: JSON.stringify({ 
      action: "proxy",
      method, 
      url, 
      headers, 
      data,
      certificate,
      privateKey,
      accountNumber,
      clientId,
      clientSecret,
      scope
    })
  });

  const responseText = await response.text();
  console.log(`[inter-sync] Proxy response status: ${response.status}`);
  console.log(`[inter-sync] Proxy response body: ${responseText.substring(0, 1000)}`);
  
  if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
    throw new Error(`Proxy retornou HTML (status ${response.status})`);
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Resposta inválida do proxy: ${responseText.substring(0, 500)}`);
  }

  // Check if the proxy returned an error
  if (result._error) {
    const errorDetail = result.detail || result.message || result.error || result.title || `HTTP ${result._statusCode}`;
    console.error(`[inter-sync] Inter API error: ${JSON.stringify(result)}`);
    throw new Error(`Inter API: ${errorDetail}`);
  }

  if (result.error || result.message || result.title) {
    const errorDetail = result.detail || result.message || result.error || result.title;
    console.error(`[inter-sync] Inter API error: ${JSON.stringify(result)}`);
    throw new Error(`Inter API: ${errorDetail}`);
  }

  if (!response.ok && !result.access_token && !result.transacoes && !Array.isArray(result)) {
    throw new Error(`Erro HTTP ${response.status}: ${JSON.stringify(result)}`);
  }

  return result;
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
    console.log(`[inter-sync] Sincronização: ${company_id}, ${date_from} a ${date_to}`);

    // Get proxy URL and secret
    const proxyUrl = Deno.env.get("GCP_PIX_FUNCTION_URL");
    const proxySecret = Deno.env.get("GCP_PIX_FUNCTION_SECRET");
    if (!proxyUrl || !proxySecret) {
      throw new Error("GCP_PIX_FUNCTION_URL ou GCP_PIX_FUNCTION_SECRET não configuradas");
    }

    // Fetch Inter credentials
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais do Banco Inter não configuradas");
    }

    // Fetch certificate and private key from storage
    const { data: certData, error: certError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.certificate_file_path);
    
    const { data: keyData, error: keyError } = await supabase.storage
      .from("inter-certs")
      .download(credentials.private_key_file_path);

    if (certError || keyError || !certData || !keyData) {
      console.error("[inter-sync] Erro ao carregar certificados:", certError?.message, keyError?.message);
      throw new Error("Certificado ou chave privada não encontrados no storage");
    }

    // Convert to base64 for proxy
    const certText = await certData.text();
    const keyText = await keyData.text();
    const certificate = btoa(certText);
    const privateKey = btoa(keyText);

    console.log(`[inter-sync] Certificados carregados com sucesso`);

    // Get OAuth token via proxy with mTLS
    const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
    const tokenParams = new URLSearchParams();
    tokenParams.append("client_id", credentials.client_id);
    tokenParams.append("client_secret", credentials.client_secret);
    tokenParams.append("grant_type", "client_credentials");
    tokenParams.append("scope", "extrato.read");

    const tokenResult = await callInterProxyWithMTLS(
      proxyUrl,
      proxySecret,
      "POST",
      tokenUrl,
      { "Content-Type": "application/x-www-form-urlencoded" },
      certificate,
      privateKey,
      credentials.account_number || "",
      credentials.client_id,
      credentials.client_secret,
      "extrato.read",
      tokenParams.toString()
    );

    const token = tokenResult.access_token;
    console.log(`[inter-sync] Token OAuth obtido com sucesso`);

    // Get bank statement via proxy with mTLS
    // IMPORTANTE: A API Inter exige mTLS em TODAS as chamadas, não apenas OAuth
    const extratoUrl = `${INTER_API_URL}/banking/v2/extrato?dataInicio=${date_from}&dataFim=${date_to}`;

    console.log(`[inter-sync] Chamando extrato com token: ${token.substring(0, 10)}...`);
    console.log(`[inter-sync] Account number: ${credentials.account_number}`);

    const extratoHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-conta-corrente": credentials.account_number || "",
    };
    
    console.log(`[inter-sync] Headers para extrato:`, JSON.stringify(extratoHeaders));

    // Enviar também clientId/clientSecret para que o proxy possa refazer mTLS corretamente
    const extratoResult = await callInterProxyWithMTLS(
      proxyUrl,
      proxySecret,
      "GET",
      extratoUrl,
      extratoHeaders,
      certificate,
      privateKey,
      credentials.account_number || "",
      credentials.client_id,      // Adicionar para mTLS
      credentials.client_secret   // Adicionar para mTLS
    );

    console.log(`[inter-sync] Estrutura da resposta:`, JSON.stringify(extratoResult).substring(0, 500));

    // A API do Inter retorna as transações em diferentes formatos
    // Pode ser: { transacoes: [...] } ou diretamente um array
    const transacoes = Array.isArray(extratoResult) 
      ? extratoResult 
      : (extratoResult as { transacoes?: unknown[] })?.transacoes || [];

    console.log(`[inter-sync] Recebidas ${transacoes.length} transações`);
    if (transacoes.length > 0) {
      console.log(`[inter-sync] Exemplo de transação:`, JSON.stringify(transacoes[0]));
    }

    // Import transactions
    let importedCount = 0;
    for (const tx of transacoes) {
      const txData = tx as Record<string, unknown>;
      
      // A API Inter pode retornar diferentes campos dependendo da versão
      // Campos comuns: dataMovimento/dataEntrada, descricao/titulo, valor, tipoOperacao/tipo
      const dataMovimento = String(txData.dataMovimento || txData.dataEntrada || txData.data || "");
      const descricao = String(txData.descricao || txData.titulo || txData.detalhe || "");
      const valor = Number(txData.valor || 0);
      const tipoOperacao = String(txData.tipoOperacao || txData.tipo || (valor >= 0 ? "C" : "D"));
      const nsuOriginal = txData.nsu || txData.codigoTransacao || txData.idTransacao;
      
      // Se não tiver NSU, criar um único baseado na data + descrição + valor
      const nsu = nsuOriginal 
        ? String(nsuOriginal) 
        : `INTER-${dataMovimento}-${descricao.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}-${Math.abs(valor).toFixed(2)}`;
      
      const amount = tipoOperacao === "C" || tipoOperacao === "CREDITO" 
        ? Math.abs(valor) 
        : -Math.abs(valor);
      
      console.log(`[inter-sync] Processando: ${dataMovimento} | ${descricao} | ${valor} | NSU: ${nsu}`);
      
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
      
      if (error) {
        console.log(`[inter-sync] Erro ao salvar transação: ${error.message}`);
      } else {
        importedCount++;
      }
    }

    // Update last sync timestamp
    await supabase
      .from("inter_credentials")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("company_id", company_id);

    console.log(`[inter-sync] Importadas ${importedCount} transações`);

    return new Response(
      JSON.stringify({ success: true, imported: importedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-sync] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
