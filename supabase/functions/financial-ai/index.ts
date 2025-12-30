import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, messages, companyId } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch financial data for context
    let financialContext = "";

    if (companyId) {
      // Get payables summary
      const { data: payables } = await supabase
        .from("payables")
        .select("*, supplier:pessoas(razao_social, nome_fantasia)")
        .eq("company_id", companyId)
        .order("due_date", { ascending: true })
        .limit(100);

      // Get receivables summary
      const { data: receivables } = await supabase
        .from("accounts_receivable")
        .select("*")
        .eq("company_id", companyId)
        .order("due_date", { ascending: true })
        .limit(100);

      // Get bank transactions
      const { data: transactions } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", companyId)
        .order("transaction_date", { ascending: false })
        .limit(200);

      // Get chart of accounts
      const { data: chartAccounts } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", companyId);

      // Build context
      const today = new Date().toISOString().split('T')[0];
      
      const overduePayables = payables?.filter(p => !p.is_paid && p.due_date < today) || [];
      const pendingPayables = payables?.filter(p => !p.is_paid && p.due_date >= today) || [];
      const paidPayables = payables?.filter(p => p.is_paid) || [];
      
      const overdueReceivables = receivables?.filter(r => !r.is_paid && r.due_date < today) || [];
      const pendingReceivables = receivables?.filter(r => !r.is_paid && r.due_date >= today) || [];

      // Analyze patterns
      const supplierPayments: Record<string, { count: number; total: number; name: string }> = {};
      payables?.forEach(p => {
        const name = p.supplier?.razao_social || p.supplier?.nome_fantasia || 'Desconhecido';
        if (!supplierPayments[p.supplier_id]) {
          supplierPayments[p.supplier_id] = { count: 0, total: 0, name };
        }
        supplierPayments[p.supplier_id].count++;
        supplierPayments[p.supplier_id].total += Number(p.amount);
      });

      // Find duplicate patterns
      const duplicatePatterns = payables?.filter((p, i, arr) => 
        arr.some((other, j) => 
          i !== j && 
          p.amount === other.amount && 
          p.supplier_id === other.supplier_id &&
          Math.abs(new Date(p.due_date).getTime() - new Date(other.due_date).getTime()) < 7 * 24 * 60 * 60 * 1000
        )
      ) || [];

      financialContext = `
## Contexto Financeiro Atual (${today})

### Contas a Pagar
- Vencidas: ${overduePayables.length} contas, total R$ ${overduePayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
- A vencer: ${pendingPayables.length} contas, total R$ ${pendingPayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
- Pagas: ${paidPayables.length} contas, total R$ ${paidPayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}

### Contas a Receber
- Vencidas: ${overdueReceivables.length} contas, total R$ ${overdueReceivables.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)}
- A vencer: ${pendingReceivables.length} contas, total R$ ${pendingReceivables.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)}

### Movimentação Bancária
- Total de transações recentes: ${transactions?.length || 0}
- Entradas: R$ ${transactions?.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}
- Saídas: R$ ${Math.abs(transactions?.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0) || 0).toFixed(2)}

### Análise de Fornecedores (Top 5 por valor)
${Object.values(supplierPayments)
  .sort((a, b) => b.total - a.total)
  .slice(0, 5)
  .map(s => `- ${s.name}: ${s.count} pagamentos, total R$ ${s.total.toFixed(2)}`)
  .join('\n')}

### Plano de Contas
- ${chartAccounts?.length || 0} contas cadastradas
- Contas ativas: ${chartAccounts?.filter(c => c.is_active).length || 0}

### Possíveis Duplicidades Detectadas
${duplicatePatterns.length > 0 
  ? duplicatePatterns.slice(0, 5).map(p => `- ${p.description}: R$ ${Number(p.amount).toFixed(2)} em ${p.due_date}`).join('\n')
  : '- Nenhuma duplicidade óbvia detectada'}

### Detalhes das Contas a Pagar (para análise)
${JSON.stringify(payables?.slice(0, 50).map(p => ({
  description: p.description,
  amount: p.amount,
  due_date: p.due_date,
  supplier: p.supplier?.razao_social || p.supplier?.nome_fantasia,
  is_paid: p.is_paid,
  payment_method: p.payment_method
})), null, 2)}
`;
    }

    const systemPrompt = `Você é um assistente financeiro especializado em análise de contas a pagar, contas a receber e gestão financeira empresarial. Seu papel é:

1. **Detecção de Fraude e Anomalias**:
   - Identificar pagamentos duplicados ou suspeitos
   - Detectar padrões incomuns de gastos
   - Alertar sobre fornecedores com comportamento atípico
   - Identificar valores fora do padrão histórico

2. **Auditoria de Lançamentos**:
   - Verificar se a categorização no plano de contas faz sentido
   - Identificar lançamentos sem categoria ou mal categorizados
   - Sugerir melhorias na estrutura do plano de contas
   - Verificar consistência entre descrição e categoria

3. **Análise de Fornecedores**:
   - Identificar concentração de gastos
   - Detectar dependência excessiva de fornecedores
   - Sugerir oportunidades de negociação
   - Analisar histórico de pagamentos

4. **Análise de Fluxo de Caixa**:
   - Projetar saldo futuro baseado em contas a pagar/receber
   - Identificar períodos críticos de caixa
   - Alertar sobre vencimentos importantes
   - Sugerir priorização de pagamentos

IMPORTANTE:
- Seja direto e objetivo nas análises
- Use dados concretos sempre que possível
- Destaque riscos e oportunidades
- Sugira ações práticas
- Formate respostas em Markdown para melhor legibilidade
- Use emojis moderadamente para destacar alertas (🚨 para crítico, ⚠️ para atenção, ✅ para ok)

${financialContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Error in financial-ai function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
