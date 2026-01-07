import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DDARequest {
  company_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload: DDARequest = await req.json();
    console.log(`[inter-dda-sync] Sincronizando DDA para empresa: ${payload.company_id}`);

    if (!payload.company_id) {
      throw new Error("company_id é obrigatório");
    }

    // NOTA: Esta função está preparada para integração com provedor de DDA
    // O Banco Inter não oferece API de DDA
    // Para ativar, integrar com Celcoin ou BTG Pactual
    
    // Por enquanto, retorna mensagem informativa
    console.log("[inter-dda-sync] Integração DDA não configurada - aguardando provedor");

    // Exemplo de como seria a integração:
    // 1. Buscar credenciais do provedor DDA
    // 2. Fazer chamada à API do provedor (Celcoin, BTG, etc.)
    // 3. Processar boletos retornados
    // 4. Inserir/atualizar na tabela inter_dda_boletos

    /*
    // Exemplo com Celcoin:
    const { data: credentials } = await supabase
      .from("dda_provider_credentials")
      .select("*")
      .eq("company_id", payload.company_id)
      .eq("is_active", true)
      .single();

    if (!credentials) {
      throw new Error("Credenciais do provedor DDA não configuradas");
    }

    // Chamar API do provedor
    const ddaResponse = await fetch(`${CELCOIN_API}/dda/boletos`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const boletos = await ddaResponse.json();

    // Inserir boletos na tabela
    for (const boleto of boletos) {
      await supabase.from("inter_dda_boletos").upsert({
        company_id: payload.company_id,
        linha_digitavel: boleto.linhaDigitavel,
        codigo_barras: boleto.codigoBarras,
        valor: boleto.valor,
        valor_final: boleto.valorFinal,
        data_vencimento: boleto.dataVencimento,
        data_emissao: boleto.dataEmissao,
        beneficiario_nome: boleto.beneficiario?.nome,
        beneficiario_documento: boleto.beneficiario?.documento,
        beneficiario_banco: boleto.beneficiario?.banco,
        pagador_nome: boleto.pagador?.nome,
        pagador_documento: boleto.pagador?.documento,
        external_id: boleto.id,
        raw_data: boleto,
        synced_at: new Date().toISOString(),
      }, {
        onConflict: "company_id,linha_digitavel",
      });
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sincronização DDA requer integração com provedor (Celcoin/BTG). Configure as credenciais para ativar.",
        count: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-dda-sync] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
