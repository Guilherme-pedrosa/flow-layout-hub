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

    // Fetch ALL data for comprehensive AI context
    let fullContext = "";

    if (companyId) {
      console.log("[financial-ai] Fetching all data for company:", companyId);

      // ========== FINANCEIRO ==========
      // Contas a Pagar (sem limite)
      const { data: payables } = await supabase
        .from("payables")
        .select("*, supplier:pessoas(razao_social, nome_fantasia, cpf_cnpj)")
        .eq("company_id", companyId)
        .order("due_date", { ascending: true });

      // Contas a Receber (sem limite)
      const { data: receivables } = await supabase
        .from("accounts_receivable")
        .select("*, client:clientes(razao_social, nome_fantasia, cpf_cnpj)")
        .eq("company_id", companyId)
        .order("due_date", { ascending: true });

      // Transações Bancárias (sem limite)
      const { data: transactions } = await supabase
        .from("bank_transactions")
        .select("*, bank_account:bank_accounts(name, bank_name)")
        .eq("company_id", companyId)
        .order("transaction_date", { ascending: false });

      // Contas Bancárias
      const { data: bankAccounts } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", companyId);

      // Plano de Contas
      const { data: chartAccounts } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", companyId);

      // Centros de Custo
      const { data: costCenters } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", companyId);

      // Situações Financeiras
      const { data: situations } = await supabase
        .from("financial_situations")
        .select("*")
        .eq("company_id", companyId);

      // ========== COMPRAS ==========
      // Pedidos de Compra
      const { data: purchaseOrders } = await supabase
        .from("purchase_orders")
        .select("*, supplier:pessoas(razao_social, nome_fantasia)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      // Itens dos Pedidos de Compra
      const { data: purchaseOrderItems } = await supabase
        .from("purchase_order_items")
        .select("*, product:products(code, description), purchase_order:purchase_orders!inner(company_id)")
        .eq("purchase_order.company_id", companyId);

      // ========== VENDAS ==========
      // Vendas
      const { data: sales } = await supabase
        .from("sales")
        .select("*, client:clientes(razao_social, nome_fantasia)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      // Itens das Vendas
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("*, product:products(code, description)")
        .eq("company_id", companyId);

      // ========== PRODUTOS E ESTOQUE ==========
      // Produtos
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId);

      // Movimentações de Estoque
      const { data: stockMovements } = await supabase
        .from("stock_movements")
        .select("*, product:products(code, description)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      // ========== ORDENS DE SERVIÇO ==========
      const { data: serviceOrders } = await supabase
        .from("service_orders")
        .select("*, client:clientes(razao_social, nome_fantasia)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      // ========== NOTAS FISCAIS ==========
      const { data: invoices } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      // ========== CLIENTES E FORNECEDORES ==========
      const { data: clients } = await supabase
        .from("clientes")
        .select("*");

      const { data: suppliers } = await supabase
        .from("pessoas")
        .select("*")
        .eq("tipo", "fornecedor");

      // ========== BUILD CONTEXT ==========
      const today = new Date().toISOString().split('T')[0];
      
      // Análise de Contas a Pagar
      const overduePayables = payables?.filter(p => !p.is_paid && p.due_date < today) || [];
      const pendingPayables = payables?.filter(p => !p.is_paid && p.due_date >= today) || [];
      const paidPayables = payables?.filter(p => p.is_paid) || [];
      
      // Análise de Contas a Receber
      const overdueReceivables = receivables?.filter(r => !r.is_paid && r.due_date < today) || [];
      const pendingReceivables = receivables?.filter(r => !r.is_paid && r.due_date >= today) || [];
      const paidReceivables = receivables?.filter(r => r.is_paid) || [];

      // Análise de Fornecedores
      const supplierAnalysis: Record<string, { count: number; total: number; name: string; cnpj: string }> = {};
      payables?.forEach(p => {
        const name = p.supplier?.razao_social || p.supplier?.nome_fantasia || 'Desconhecido';
        const cnpj = p.supplier?.cpf_cnpj || '';
        if (!supplierAnalysis[p.supplier_id]) {
          supplierAnalysis[p.supplier_id] = { count: 0, total: 0, name, cnpj };
        }
        supplierAnalysis[p.supplier_id].count++;
        supplierAnalysis[p.supplier_id].total += Number(p.amount);
      });

      // Análise de Clientes
      const clientAnalysis: Record<string, { count: number; total: number; name: string }> = {};
      receivables?.forEach(r => {
        const name = r.client?.razao_social || r.client?.nome_fantasia || 'Desconhecido';
        const clientId = r.client_id || 'sem-cliente';
        if (!clientAnalysis[clientId]) {
          clientAnalysis[clientId] = { count: 0, total: 0, name };
        }
        clientAnalysis[clientId].count++;
        clientAnalysis[clientId].total += Number(r.amount);
      });

      // Detecção de duplicidades
      const duplicatePatterns = payables?.filter((p, i, arr) => 
        arr.some((other, j) => 
          i !== j && 
          p.amount === other.amount && 
          p.supplier_id === other.supplier_id &&
          Math.abs(new Date(p.due_date).getTime() - new Date(other.due_date).getTime()) < 7 * 24 * 60 * 60 * 1000
        )
      ) || [];

      // Análise de Estoque
      const lowStockProducts = products?.filter(p => 
        p.is_active && p.min_stock && p.quantity <= p.min_stock
      ) || [];
      
      const negativeMarginProducts = products?.filter(p => 
        p.purchase_price > 0 && p.sale_price > 0 && p.sale_price < p.purchase_price
      ) || [];

      // Análise de Vendas
      const totalSalesValue = sales?.reduce((sum, s) => sum + Number(s.total_value || 0), 0) || 0;
      const pendingSales = sales?.filter(s => s.status === 'pendente' || s.status === 'orcamento') || [];

      // Análise de Pedidos de Compra
      const pendingPurchaseOrders = purchaseOrders?.filter(po => 
        po.status !== 'recebido' && po.status !== 'cancelado'
      ) || [];

      // Saldo Bancário Total
      const totalBankBalance = bankAccounts?.filter(ba => ba.is_active).reduce((sum, ba) => sum + Number(ba.current_balance || 0), 0) || 0;

      // ========== FULL CONTEXT STRING ==========
      fullContext = `
## 📊 CONTEXTO COMPLETO DO SISTEMA (${today})

### 💰 RESUMO FINANCEIRO
**Saldo Bancário Total:** R$ ${totalBankBalance.toFixed(2)}
**Contas Bancárias Ativas:** ${bankAccounts?.filter(ba => ba.is_active).length || 0}

### 📤 CONTAS A PAGAR (${payables?.length || 0} registros)
- **Vencidas:** ${overduePayables.length} contas = R$ ${overduePayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
- **A vencer:** ${pendingPayables.length} contas = R$ ${pendingPayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}
- **Pagas:** ${paidPayables.length} contas = R$ ${paidPayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}

### 📥 CONTAS A RECEBER (${receivables?.length || 0} registros)
- **Vencidas:** ${overdueReceivables.length} contas = R$ ${overdueReceivables.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)}
- **A vencer:** ${pendingReceivables.length} contas = R$ ${pendingReceivables.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)}
- **Recebidas:** ${paidReceivables.length} contas = R$ ${paidReceivables.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)}

### 🏦 MOVIMENTAÇÃO BANCÁRIA (${transactions?.length || 0} transações)
- **Entradas:** R$ ${transactions?.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0).toFixed(2) || '0.00'}
- **Saídas:** R$ ${Math.abs(transactions?.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0) || 0).toFixed(2)}

### 🏢 TOP 10 FORNECEDORES (por valor)
${Object.values(supplierAnalysis)
  .sort((a, b) => b.total - a.total)
  .slice(0, 10)
  .map((s, i) => `${i+1}. ${s.name} (${s.cnpj || 'sem CNPJ'}): ${s.count} pagamentos = R$ ${s.total.toFixed(2)}`)
  .join('\n')}

### 👥 TOP 10 CLIENTES (por valor a receber)
${Object.values(clientAnalysis)
  .sort((a, b) => b.total - a.total)
  .slice(0, 10)
  .map((c, i) => `${i+1}. ${c.name}: ${c.count} recebíveis = R$ ${c.total.toFixed(2)}`)
  .join('\n')}

### ⚠️ POSSÍVEIS DUPLICIDADES (${duplicatePatterns.length} detectadas)
${duplicatePatterns.length > 0 
  ? duplicatePatterns.slice(0, 10).map(p => `- ${p.description}: R$ ${Number(p.amount).toFixed(2)} venc. ${p.due_date} - ${p.supplier?.razao_social || 'Fornecedor'}`).join('\n')
  : '- Nenhuma duplicidade óbvia detectada'}

### 📦 PRODUTOS E ESTOQUE
- **Total de produtos:** ${products?.length || 0}
- **Produtos ativos:** ${products?.filter(p => p.is_active).length || 0}
- **Estoque baixo (abaixo do mínimo):** ${lowStockProducts.length} produtos
- **Margem negativa:** ${negativeMarginProducts.length} produtos

### 🛒 VENDAS
- **Total de vendas:** ${sales?.length || 0}
- **Valor total vendido:** R$ ${totalSalesValue.toFixed(2)}
- **Vendas pendentes/orçamentos:** ${pendingSales.length}

### 📋 PEDIDOS DE COMPRA
- **Total de pedidos:** ${purchaseOrders?.length || 0}
- **Pedidos em aberto:** ${pendingPurchaseOrders.length}
- **Valor em pedidos abertos:** R$ ${pendingPurchaseOrders.reduce((s, po) => s + Number(po.total_value || 0), 0).toFixed(2)}

### 🔧 ORDENS DE SERVIÇO
- **Total de OS:** ${serviceOrders?.length || 0}
- **OS em aberto:** ${serviceOrders?.filter(os => os.status !== 'concluida' && os.status !== 'cancelada').length || 0}

### 📄 NOTAS FISCAIS
- **Total de NF-e:** ${invoices?.length || 0}
- **Autorizadas:** ${invoices?.filter(nf => nf.status === 'autorizada').length || 0}
- **Pendentes:** ${invoices?.filter(nf => nf.status === 'pendente' || nf.status === 'processando').length || 0}

### 📊 PLANO DE CONTAS
- **Contas cadastradas:** ${chartAccounts?.length || 0}
- **Contas ativas:** ${chartAccounts?.filter(c => c.is_active).length || 0}

### 🏷️ CENTROS DE CUSTO
- **Total:** ${costCenters?.length || 0}
- **Ativos:** ${costCenters?.filter(cc => cc.is_active).length || 0}

---

## DADOS DETALHADOS PARA ANÁLISE

### Contas a Pagar Vencidas (detalhado)
${JSON.stringify(overduePayables.map(p => ({
  descricao: p.description,
  valor: p.amount,
  vencimento: p.due_date,
  fornecedor: p.supplier?.razao_social || p.supplier?.nome_fantasia,
  metodo_pagamento: p.payment_method_type,
  dias_atraso: Math.floor((new Date().getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### Contas a Pagar - Próximos 30 dias
${JSON.stringify(pendingPayables.filter(p => {
  const dueDate = new Date(p.due_date);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  return dueDate <= in30Days;
}).map(p => ({
  descricao: p.description,
  valor: p.amount,
  vencimento: p.due_date,
  fornecedor: p.supplier?.razao_social || p.supplier?.nome_fantasia
})), null, 2)}

### Contas a Receber Vencidas (detalhado)
${JSON.stringify(overdueReceivables.map(r => ({
  descricao: r.description,
  valor: r.amount,
  vencimento: r.due_date,
  cliente: r.client?.razao_social || r.client?.nome_fantasia,
  dias_atraso: Math.floor((new Date().getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### Produtos com Estoque Baixo
${JSON.stringify(lowStockProducts.map(p => ({
  codigo: p.code,
  descricao: p.description,
  quantidade_atual: p.quantity,
  estoque_minimo: p.min_stock
})), null, 2)}

### Produtos com Margem Negativa
${JSON.stringify(negativeMarginProducts.map(p => ({
  codigo: p.code,
  descricao: p.description,
  preco_compra: p.purchase_price,
  preco_venda: p.sale_price,
  margem_percentual: ((p.sale_price - p.purchase_price) / p.purchase_price * 100).toFixed(2) + '%'
})), null, 2)}

### Pedidos de Compra em Aberto
${JSON.stringify(pendingPurchaseOrders.slice(0, 20).map(po => ({
  numero: po.order_number,
  fornecedor: po.supplier?.razao_social || po.supplier?.nome_fantasia,
  valor_total: po.total_value,
  status: po.status,
  data_emissao: po.issue_date
})), null, 2)}

### Últimas Transações Bancárias
${JSON.stringify(transactions?.slice(0, 30).map(t => ({
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
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: useStreaming,
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
