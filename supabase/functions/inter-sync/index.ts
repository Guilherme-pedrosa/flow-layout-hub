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

// Helper function to call the Inter proxy
async function callInterProxy(
  proxyUrl: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  data?: unknown
) {
  console.log(`[inter-sync] Calling proxy: ${method} ${url}`);
  
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, url, headers, data })
  });

  const responseText = await response.text();
  console.log(`[inter-sync] Proxy response status: ${response.status}`);
  
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
    throw new Error(result.error || result.message || `Erro HTTP ${response.status}`);
  }

  return result;
}

// Get OAuth token via proxy
async function getOAuthToken(
  proxyUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  console.log("[inter-sync] Obtendo token OAuth via proxy...");
  
  const tokenUrl = `${INTER_API_URL}/oauth/v2/token`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "extrato.read");

  const result = await callInterProxy(
    proxyUrl,
    "POST",
    tokenUrl,
    { "Content-Type": "application/x-www-form-urlencoded" },
    params.toString()
  );

  return result.access_token;
}

// Get bank statement via proxy
async function getExtrato(
  proxyUrl: string,
  token: string,
  accountNumber: string,
  dateFrom: string,
  dateTo: string
): Promise<Array<{
  dataMovimento: string;
  descricao: string;
  valor: number;
  tipoOperacao: string;
  nsu?: string;
}>> {
  console.log(`[inter-sync] Buscando extrato de ${dateFrom} a ${dateTo}`);
  
  const extratoUrl = `${INTER_API_URL}/banking/v2/extrato?dataInicio=${dateFrom}&dataFim=${dateTo}`;

  const result = await callInterProxy(
    proxyUrl,
    "GET",
    extratoUrl,
    {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-conta-corrente": accountNumber,
    }
  );

  return result.transacoes || [];
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
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais do Banco Inter não configuradas");
    }

    // Get OAuth token via proxy
    const token = await getOAuthToken(
      proxyUrl,
      credentials.client_id,
      credentials.client_secret
    );

    // Get bank statement via proxy
    const transacoes = await getExtrato(
      proxyUrl,
      token,
      credentials.account_number || "",
      date_from,
      date_to
    );

    console.log(`[inter-sync] Recebidas ${transacoes.length} transações`);

    // Import transactions
    let importedCount = 0;
    for (const tx of transacoes) {
      const amount = tx.tipoOperacao === "C" ? Math.abs(tx.valor) : -Math.abs(tx.valor);
      const nsu = tx.nsu || `INTER-${tx.dataMovimento}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from("bank_transactions")
        .upsert({
          company_id,
          transaction_date: tx.dataMovimento,
          description: tx.descricao,
          amount: amount,
          type: tx.tipoOperacao === "C" ? "CREDIT" : "DEBIT",
          nsu: nsu,
        }, { onConflict: "company_id,nsu", ignoreDuplicates: true });
      
      if (!error) importedCount++;
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
