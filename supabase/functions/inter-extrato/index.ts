import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTER_API_URL = "https://cdpj.partners.bancointer.com.br";

async function getToken(
  proxyUrl: string, 
  proxySecret: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  console.log("[inter-extrato] Obtendo token OAuth...");
  
  const response = await fetch(`${proxyUrl}/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": proxySecret,
    },
    body: JSON.stringify({
      method: "POST",
      url: `${INTER_API_URL}/oauth/v2/token`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&scope=extrato.read`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao obter token: ${response.status}`);
  }

  const result = await response.json();
  console.log("[inter-extrato] Token obtido com sucesso");
  return result.access_token;
}

async function getExtratoCompleto(
  proxyUrl: string,
  proxySecret: string,
  token: string,
  accountNumber: string,
  dataInicio: string,
  dataFim: string,
  tipoOperacao: string = "D" // D = Débito (saídas)
): Promise<unknown> {
  console.log(`[inter-extrato] Buscando extrato completo de ${dataInicio} a ${dataFim}, tipo: ${tipoOperacao}`);
  
  // Usar endpoint de extrato completo/enriquecido
  const extratoUrl = `${INTER_API_URL}/banking/v2/extrato/completo?dataInicio=${dataInicio}&dataFim=${dataFim}&tipoOperacao=${tipoOperacao}&tamanhoPagina=1000`;
  
  const response = await fetch(`${proxyUrl}/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-proxy-secret": proxySecret,
    },
    body: JSON.stringify({
      method: "GET",
      url: extratoUrl,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-conta-corrente": accountNumber,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[inter-extrato] Erro na API: ${response.status} - ${errorText}`);
    throw new Error(`Erro ao buscar extrato: ${response.status}`);
  }

  const result = await response.json();
  console.log(`[inter-extrato] Resposta recebida:`, JSON.stringify(result).substring(0, 500));
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, data_inicio, data_fim, tipo_operacao = "D" } = await req.json();

    if (!company_id || !data_inicio || !data_fim) {
      throw new Error("Parâmetros obrigatórios: company_id, data_inicio, data_fim");
    }

    console.log(`[inter-extrato] Iniciando para company_id: ${company_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar credenciais do Inter
    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais Inter não encontradas ou inativas");
    }

    // Usar GCP Pix Function como proxy mTLS
    const PROXY_URL = Deno.env.get("GCP_PIX_FUNCTION_URL");
    const PROXY_SECRET = Deno.env.get("GCP_PIX_FUNCTION_SECRET");

    if (!PROXY_URL || !PROXY_SECRET) {
      throw new Error("Configuração do proxy GCP não encontrada. Verifique GCP_PIX_FUNCTION_URL e GCP_PIX_FUNCTION_SECRET");
    }

    // Obter token OAuth
    const token = await getToken(
      PROXY_URL,
      PROXY_SECRET,
      credentials.client_id,
      credentials.client_secret
    );

    // Buscar extrato completo/enriquecido
    const extratoResult = await getExtratoCompleto(
      PROXY_URL,
      PROXY_SECRET,
      token,
      credentials.account_number || "",
      data_inicio,
      data_fim,
      tipo_operacao
    );

    // A API pode retornar em diferentes formatos
    const transacoes = Array.isArray(extratoResult)
      ? extratoResult
      : (extratoResult as { transacoes?: unknown[] })?.transacoes || [];

    console.log(`[inter-extrato] Total de transações: ${transacoes.length}`);

    // Filtrar apenas transações PIX se necessário
    const transacoesPix = transacoes.filter((t: Record<string, unknown>) => {
      const tipoTransacao = String(t.tipoTransacao || "").toUpperCase();
      return tipoTransacao === "PIX";
    });

    console.log(`[inter-extrato] Transações PIX: ${transacoesPix.length}`);

    // Log de exemplo de transação para debug
    if (transacoesPix.length > 0) {
      console.log(`[inter-extrato] Exemplo de transação PIX:`, JSON.stringify(transacoesPix[0]));
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          total: transacoesPix.length,
          transacoes: transacoesPix,
          todas_transacoes: transacoes.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[inter-extrato] Erro:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
