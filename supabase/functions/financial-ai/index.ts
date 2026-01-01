import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, companyId } = body;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    console.log("[financial-ai] Request received:", { type, messagesCount: messages.length });

    if (!OPENAI_API_KEY) {
      console.error("[financial-ai] OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL data using optimized SQL functions
    let fullContext = "";

    if (companyId) {
      console.log("[financial-ai] Fetching data using AI SQL functions for company:", companyId);

      // Use optimized SQL functions that bypass RLS but filter by company_id
      const [
        { data: financeiro, error: finErr },
        { data: clientes, error: cliErr },
        { data: produtos, error: prodErr },
        { data: os, error: osErr },
        { data: vendas, error: venErr },
        { data: compras, error: compErr },
        { data: inadimplencia, error: inadErr }
      ] = await Promise.all([
        supabase.rpc('ai_get_financial_dashboard', { p_company_id: companyId }),
        supabase.rpc('ai_get_clientes_analysis', { p_company_id: companyId }),
        supabase.rpc('ai_get_produtos_analysis', { p_company_id: companyId }),
        supabase.rpc('ai_get_os_analysis', { p_company_id: companyId }),
        supabase.rpc('ai_get_vendas_analysis', { p_company_id: companyId, p_periodo_dias: 30 }),
        supabase.rpc('ai_get_compras_analysis', { p_company_id: companyId }),
        supabase.rpc('ai_get_inadimplencia_analysis', { p_company_id: companyId })
      ]);

      // Log any errors from RPC calls
      if (finErr) console.error("[financial-ai] Error fetching financeiro:", finErr);
      if (cliErr) console.error("[financial-ai] Error fetching clientes:", cliErr);
      if (prodErr) console.error("[financial-ai] Error fetching produtos:", prodErr);
      if (osErr) console.error("[financial-ai] Error fetching os:", osErr);
      if (venErr) console.error("[financial-ai] Error fetching vendas:", venErr);
      if (compErr) console.error("[financial-ai] Error fetching compras:", compErr);
      if (inadErr) console.error("[financial-ai] Error fetching inadimplencia:", inadErr);

      // Also fetch additional data for detailed analysis
      const { data: payables } = await supabase
        .from("payables")
        .select("*, supplier:pessoas(razao_social, nome_fantasia, cpf_cnpj)")
        .eq("company_id", companyId)
        .eq("is_paid", false)
        .order("due_date", { ascending: true })
        .limit(100);

      const { data: receivables } = await supabase
        .from("accounts_receivable")
        .select("*, client:pessoas(razao_social, nome_fantasia, cpf_cnpj)")
        .eq("company_id", companyId)
        .eq("is_paid", false)
        .order("due_date", { ascending: true })
        .limit(100);

      const { data: transactions } = await supabase
        .from("bank_transactions")
        .select("*, bank_account:bank_accounts(name, bank_name)")
        .eq("company_id", companyId)
        .order("transaction_date", { ascending: false })
        .limit(50);

      const { data: lowStockProducts } = await supabase
        .from("products")
        .select("id, code, name, description, current_stock, minimum_stock, cost_price, sale_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("stock_control", true)
        .lte("current_stock", 10)
        .limit(50);

      const today = new Date().toISOString().split('T')[0];
      const overduePayables = payables?.filter(p => p.due_date < today) || [];
      const overdueReceivables = receivables?.filter(r => r.due_date < today) || [];

      // Build comprehensive context
      fullContext = `
## 📊 CONTEXTO COMPLETO DO SISTEMA (${today})

### 💰 RESUMO FINANCEIRO (via ai_get_financial_dashboard)
${JSON.stringify(financeiro, null, 2)}

### 👥 ANÁLISE DE CLIENTES (via ai_get_clientes_analysis)
${JSON.stringify(clientes, null, 2)}

### 📦 ANÁLISE DE PRODUTOS E ESTOQUE (via ai_get_produtos_analysis)
${JSON.stringify(produtos, null, 2)}

### 🔧 ANÁLISE DE ORDENS DE SERVIÇO (via ai_get_os_analysis)
${JSON.stringify(os, null, 2)}

### 🛒 ANÁLISE DE VENDAS - Últimos 30 dias (via ai_get_vendas_analysis)
${JSON.stringify(vendas, null, 2)}

### 🏭 ANÁLISE DE COMPRAS E FORNECEDORES (via ai_get_compras_analysis)
${JSON.stringify(compras, null, 2)}

### 🚨 INADIMPLÊNCIA (via ai_get_inadimplencia_analysis)
${JSON.stringify(inadimplencia, null, 2)}

---

## DADOS DETALHADOS PARA ANÁLISE ESPECÍFICA

### Contas a Pagar Vencidas (${overduePayables.length} registros)
${JSON.stringify(overduePayables.slice(0, 20).map(p => ({
  descricao: p.description,
  valor: p.amount,
  vencimento: p.due_date,
  fornecedor: p.supplier?.razao_social || p.supplier?.nome_fantasia,
  metodo_pagamento: p.payment_method_type,
  dias_atraso: Math.floor((new Date().getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### Contas a Receber Vencidas (${overdueReceivables.length} registros)
${JSON.stringify(overdueReceivables.slice(0, 20).map(r => ({
  descricao: r.description,
  valor: r.amount,
  vencimento: r.due_date,
  cliente: r.client?.razao_social || r.client?.nome_fantasia,
  dias_atraso: Math.floor((new Date().getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### Produtos com Estoque Baixo (${lowStockProducts?.length || 0} produtos)
${JSON.stringify(lowStockProducts?.map(p => ({
  codigo: p.code,
  nome: p.name,
  descricao: p.description,
  estoque_atual: p.current_stock,
  estoque_minimo: p.minimum_stock,
  preco_custo: p.cost_price,
  preco_venda: p.sale_price
})), null, 2)}

### Últimas Transações Bancárias
${JSON.stringify(transactions?.slice(0, 20).map(t => ({
  data: t.transaction_date,
  descricao: t.description,
  valor: t.amount,
  tipo: t.type,
  conta: t.bank_account?.name,
  conciliado: t.is_reconciled
})), null, 2)}
`;
    }

    const systemPrompt = `Você é um assistente de inteligência artificial com ACESSO COMPLETO a todos os dados do sistema ERP. Você pode analisar:

## MÓDULOS DISPONÍVEIS
1. **Financeiro**: Contas a pagar, contas a receber, transações bancárias, plano de contas, centros de custo
2. **Compras**: Pedidos de compra, recebimento de mercadorias, fornecedores
3. **Vendas**: Vendas, orçamentos, clientes, comissões
4. **Estoque**: Produtos, movimentações, saldos, localizações
5. **Fiscal**: Notas fiscais, impostos, CFOP
6. **Serviços**: Ordens de serviço, atendimentos

## SUAS CAPACIDADES
1. **Detecção de Fraude e Anomalias**:
   - Identificar pagamentos duplicados ou suspeitos
   - Detectar padrões incomuns de gastos
   - Alertar sobre fornecedores/clientes com comportamento atípico
   - Identificar valores fora do padrão histórico

2. **Auditoria de Lançamentos**:
   - Verificar categorização no plano de contas
   - Identificar lançamentos mal categorizados
   - Verificar consistência de dados entre módulos

3. **Análise de Fornecedores e Clientes**:
   - Identificar concentração de gastos/receitas
   - Detectar dependência excessiva
   - Sugerir oportunidades de negociação
   - Analisar histórico de pagamentos/recebimentos

4. **Análise de Fluxo de Caixa**:
   - Projetar saldo futuro
   - Identificar períodos críticos
   - Alertar sobre vencimentos importantes
   - Sugerir priorização de pagamentos

5. **Gestão de Estoque**:
   - Identificar produtos com estoque baixo
   - Detectar produtos com margem negativa
   - Analisar giro de estoque
   - Sugerir reposição

6. **Análise de Vendas**:
   - Identificar tendências
   - Analisar performance por cliente/produto
   - Detectar oportunidades de cross-sell/up-sell

## REGRAS DE RESPOSTA
- Seja direto e objetivo
- Use dados concretos dos contextos fornecidos
- Destaque riscos (🚨 crítico, ⚠️ atenção) e oportunidades (✅ ok, 💡 sugestão)
- Formate em Markdown para legibilidade
- Quando relevante, sugira ações práticas
- Foque no que o prompt/pergunta do usuário solicita

${fullContext}`;

    // For CFOP suggestions, don't use streaming (short response)
    const useStreaming = type !== 'cfop_suggestion';
    
    console.log("[financial-ai] Calling OpenAI, streaming:", useStreaming, "type:", type);
    console.log("[financial-ai] Context size:", fullContext.length, "chars");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: useStreaming,
        max_completion_tokens: 4096,
      }),
    });
    
    console.log("[financial-ai] OpenAI response status:", response.status);

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

    // For non-streaming requests, return JSON directly
    if (!useStreaming) {
      const data = await response.json();
      console.log("[financial-ai] Non-streaming response:", JSON.stringify(data).substring(0, 500));
      return new Response(JSON.stringify(data), {
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
