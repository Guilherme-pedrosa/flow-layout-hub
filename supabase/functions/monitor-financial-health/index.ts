import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting financial health monitor...");

    // Buscar todas as empresas ativas
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("is_active", true);

    if (companiesError) throw companiesError;

    const insights: any[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split("T")[0];
    const next3Days = new Date(today);
    next3Days.setDate(next3Days.getDate() + 3);
    const next3DaysStr = next3Days.toISOString().split("T")[0];

    for (const company of companies || []) {
      console.log(`Analyzing company: ${company.name}`);

      // 1. Contas a pagar vencendo hoje ou atrasadas
      const { data: overduePayables, error: payablesError } = await supabase
        .from("payables")
        .select("id, amount, due_date, description, supplier_id")
        .eq("company_id", company.id)
        .eq("is_paid", false)
        .lte("due_date", todayStr);

      if (!payablesError && overduePayables && overduePayables.length > 0) {
        const totalOverdue = overduePayables.reduce((sum, p) => sum + Number(p.amount), 0);
        insights.push({
          company_id: company.id,
          type: "critical",
          category: "financial",
          mode: "cfo_bot",
          title: "Contas a Pagar Atrasadas",
          message: `Você tem ${overduePayables.length} conta(s) a pagar vencida(s), totalizando R$ ${totalOverdue.toFixed(2)}. Isso pode afetar seu relacionamento com fornecedores.`,
          action_label: "Ver Contas",
          action_url: "/contas-pagar",
          priority: 10,
          metadata: { count: overduePayables.length, total: totalOverdue },
        });
      }

      // 2. Contas a pagar nos próximos 7 dias
      const { data: upcomingPayables } = await supabase
        .from("payables")
        .select("id, amount, due_date")
        .eq("company_id", company.id)
        .eq("is_paid", false)
        .gt("due_date", todayStr)
        .lte("due_date", next7DaysStr);

      if (upcomingPayables && upcomingPayables.length > 0) {
        const totalUpcoming = upcomingPayables.reduce((sum, p) => sum + Number(p.amount), 0);
        insights.push({
          company_id: company.id,
          type: "warning",
          category: "financial",
          mode: "cfo_bot",
          title: "Vencimentos Próximos",
          message: `${upcomingPayables.length} conta(s) a pagar nos próximos 7 dias, totalizando R$ ${totalUpcoming.toFixed(2)}. Verifique seu fluxo de caixa.`,
          action_label: "Planejar",
          action_url: "/contas-pagar",
          priority: 5,
          metadata: { count: upcomingPayables.length, total: totalUpcoming },
        });
      }

      // 3. Contas a receber atrasadas (risco de inadimplência)
      const { data: overdueReceivables } = await supabase
        .from("accounts_receivable")
        .select("id, amount, due_date, client_id")
        .eq("company_id", company.id)
        .eq("is_paid", false)
        .lt("due_date", todayStr);

      if (overdueReceivables && overdueReceivables.length > 0) {
        const totalOverdue = overdueReceivables.reduce((sum, r) => sum + Number(r.amount), 0);
        insights.push({
          company_id: company.id,
          type: "warning",
          category: "financial",
          mode: "auditora",
          title: "Recebíveis em Atraso",
          message: `${overdueReceivables.length} título(s) a receber em atraso, totalizando R$ ${totalOverdue.toFixed(2)}. Considere ações de cobrança.`,
          action_label: "Ver Recebíveis",
          action_url: "/contas-receber",
          priority: 7,
          metadata: { count: overdueReceivables.length, total: totalOverdue },
        });
      }

      // 4. Análise de fluxo de caixa - próximos 7 dias
      const { data: upcomingReceivables } = await supabase
        .from("accounts_receivable")
        .select("amount")
        .eq("company_id", company.id)
        .eq("is_paid", false)
        .gte("due_date", todayStr)
        .lte("due_date", next7DaysStr);

      const incomingCash = (upcomingReceivables || []).reduce((sum, r) => sum + Number(r.amount), 0);
      const outgoingCash = (upcomingPayables || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const cashFlowBalance = incomingCash - outgoingCash;

      if (cashFlowBalance < 0) {
        insights.push({
          company_id: company.id,
          type: "critical",
          category: "financial",
          mode: "cfo_bot",
          title: "Risco de Caixa Negativo",
          message: `Projeção de fluxo de caixa negativo nos próximos 7 dias: R$ ${cashFlowBalance.toFixed(2)}. Entradas: R$ ${incomingCash.toFixed(2)}, Saídas: R$ ${outgoingCash.toFixed(2)}.`,
          action_label: "Analisar Fluxo",
          action_url: "/financeiro",
          priority: 9,
          metadata: { incoming: incomingCash, outgoing: outgoingCash, balance: cashFlowBalance },
        });
      }

      // 5. Transações bancárias não conciliadas
      const { data: unreconciledTx } = await supabase
        .from("bank_transactions")
        .select("id, amount")
        .eq("company_id", company.id)
        .eq("is_reconciled", false);

      if (unreconciledTx && unreconciledTx.length > 10) {
        insights.push({
          company_id: company.id,
          type: "info",
          category: "financial",
          mode: "executora",
          title: "Conciliação Pendente",
          message: `${unreconciledTx.length} transações bancárias aguardando conciliação. A IA pode conciliar automaticamente transações recorrentes.`,
          action_label: "Conciliar",
          action_url: "/conciliacao",
          priority: 3,
          metadata: { count: unreconciledTx.length },
        });
      }

      // 6. Boletos DDA vencendo em 3 dias
      const { data: ddaBoletos } = await supabase
        .from("inter_dda_boletos")
        .select("id, valor, data_vencimento, beneficiario_nome")
        .eq("company_id", company.id)
        .eq("status", "pending")
        .lte("data_vencimento", next3DaysStr)
        .gte("data_vencimento", todayStr);

      if (ddaBoletos && ddaBoletos.length > 0) {
        const totalDDA = ddaBoletos.reduce((sum, b) => sum + Number(b.valor), 0);
        insights.push({
          company_id: company.id,
          type: "warning",
          category: "financial",
          mode: "executora",
          title: "Boletos DDA Vencendo",
          message: `Você tem ${ddaBoletos.length} boleto(s) DDA vencendo nos próximos 3 dias, totalizando R$ ${totalDDA.toFixed(2)}. Deseja agendar o pagamento?`,
          action_label: "Ver Boletos",
          action_url: "/contas-pagar",
          priority: 6,
          metadata: { count: ddaBoletos.length, total: totalDDA },
        });
      }
    }

    // Inserir insights no banco (evitando duplicatas recentes)
    let insertedCount = 0;
    for (const insight of insights) {
      // Verificar se já existe insight similar nas últimas 24 horas
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: existing } = await supabase
        .from("ai_insights")
        .select("id")
        .eq("company_id", insight.company_id)
        .eq("title", insight.title)
        .eq("is_dismissed", false)
        .gte("created_at", yesterday.toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error: insertError } = await supabase
          .from("ai_insights")
          .insert(insight);

        if (insertError) {
          console.error("Error inserting insight:", insertError);
        } else {
          insertedCount++;
        }
      }
    }

    console.log(`Financial health monitor completed. Inserted ${insertedCount} new insights.`);

    return new Response(
      JSON.stringify({
        success: true,
        companiesAnalyzed: companies?.length || 0,
        insightsGenerated: insights.length,
        insightsInserted: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in monitor-financial-health:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
