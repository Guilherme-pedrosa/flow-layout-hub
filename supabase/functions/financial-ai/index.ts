import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { type, companyId } = body;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    console.log("[financial-ai] Request received:", { type, messagesCount: messages.length, companyId });

    // === VALIDATE INPUT ===
    if (!companyId || typeof companyId !== 'string') {
      return new Response(JSON.stringify({ error: "companyId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required and must not be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages in conversation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPENAI_API_KEY) {
      console.error("[financial-ai] OPENAI_API_KEY is not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      console.error("[financial-ai] Company not found:", companyId);
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[financial-ai] Fetching data for company:", company.name);

    // Fetch data for context
    let fullContext = "";

    try {
      // Fetch ALL business data in parallel (including synced bank data)
      const [
        { data: payables },
        { data: receivables },
        { data: transactions },
        { data: bankAccountsSynced },
        { data: bankTransactionsSynced },
        { data: bankConnections },
        { data: lowStockProducts },
        { data: allProducts },
        { data: clients },
        { data: suppliers },
        { data: sales },
        { data: purchaseOrders },
        { data: serviceOrders },
        { data: services },
        { data: equipments }
      ] = await Promise.all([
        // Contas a pagar
        supabase
          .from("payables")
          .select("*, supplier:pessoas!payables_supplier_id_fkey(razao_social, nome_fantasia, cpf_cnpj)")
          .eq("company_id", companyId)
          .eq("is_paid", false)
          .order("due_date", { ascending: true })
          .limit(100),
        // Contas a receber
        supabase
          .from("accounts_receivable")
          .select("*, client:clientes(razao_social, nome_fantasia, cpf_cnpj)")
          .eq("company_id", companyId)
          .eq("is_paid", false)
          .order("due_date", { ascending: true })
          .limit(100),
        // Transações bancárias (manuais)
        supabase
          .from("bank_transactions")
          .select("*, bank_account:bank_accounts(name, bank_name)")
          .eq("company_id", companyId)
          .order("transaction_date", { ascending: false })
          .limit(50),
        // Contas bancárias sincronizadas via API
        supabase
          .from("bank_accounts_synced")
          .select("id, name, bank_name, current_balance, available_balance, account_type, last_refreshed_at")
          .eq("company_id", companyId)
          .eq("is_active", true),
        // Transações bancárias sincronizadas via API
        supabase
          .from("bank_transactions_synced")
          .select("id, description, amount, direction, posted_at, category, merchant, is_reconciled")
          .eq("company_id", companyId)
          .order("posted_at", { ascending: false })
          .limit(100),
        // Conexões bancárias
        supabase
          .from("bank_connections")
          .select("id, provider, status, connector_name, last_sync_at, last_sync_status, last_sync_error")
          .eq("company_id", companyId),
        // Produtos com estoque baixo
        supabase
          .from("products")
          .select("id, code, name, current_stock, minimum_stock, cost_price, sale_price")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .eq("stock_control", true)
          .lte("current_stock", 10)
          .limit(50),
        // Todos os produtos (resumo)
        supabase
          .from("products")
          .select("id, code, name, current_stock, cost_price, sale_price, is_active")
          .eq("company_id", companyId)
          .limit(200),
        // Clientes
        supabase
          .from("clientes")
          .select("id, razao_social, nome_fantasia, cpf_cnpj, email, telefone, cidade, estado, status, limite_credito")
          .eq("company_id", companyId)
          .limit(200),
        // Fornecedores
        supabase
          .from("pessoas")
          .select("id, razao_social, nome_fantasia, cpf_cnpj, email, telefone, cidade, estado, is_supplier")
          .eq("company_id", companyId)
          .eq("is_supplier", true)
          .limit(200),
        // Vendas (últimas 100)
        supabase
          .from("sales")
          .select("id, sale_number, status, total_amount, payment_method, created_at, client:clientes(razao_social, nome_fantasia)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100),
        // Pedidos de compra (últimos 100)
        supabase
          .from("purchase_orders")
          .select("id, order_number, status, total_amount, created_at, supplier:pessoas(razao_social, nome_fantasia)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100),
        // Ordens de serviço (últimas 100)
        supabase
          .from("service_orders")
          .select("id, order_number, status, total_amount, scheduled_date, client:clientes(razao_social, nome_fantasia)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100),
        // Serviços
        supabase
          .from("services")
          .select("id, code, name, sale_price, is_active")
          .eq("company_id", companyId)
          .limit(100),
        // Equipamentos
        supabase
          .from("equipments")
          .select("id, serial_number, brand, model, equipment_type, is_active, client:clientes(razao_social, nome_fantasia)")
          .eq("company_id", companyId)
          .limit(100)
      ]);

      const today = new Date().toISOString().split('T')[0];
      const overduePayables = payables?.filter(p => p.due_date < today) || [];
      const overdueReceivables = receivables?.filter(r => r.due_date < today) || [];

      // Calculate totals
      const totalPayables = payables?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalReceivables = receivables?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const totalOverduePayables = overduePayables.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalOverdueReceivables = overdueReceivables.reduce((sum, r) => sum + (r.amount || 0), 0);

      // Bank synced totals
      const totalBankBalanceSynced = bankAccountsSynced?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
      const lastBankSync = bankConnections?.find(c => c.last_sync_at)?.last_sync_at;
      const bankSyncStatus = bankConnections?.length ? (bankConnections.some(c => c.status === 'error') ? 'error' : 'active') : 'none';

      // Synced transactions summary
      const syncedIn = bankTransactionsSynced?.filter(t => t.direction === 'in').reduce((sum, t) => sum + t.amount, 0) || 0;
      const syncedOut = bankTransactionsSynced?.filter(t => t.direction === 'out').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Sales stats
      const totalSales = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const salesByStatus = sales?.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Service orders stats
      const openServiceOrders = serviceOrders?.filter(so => !['concluida', 'cancelada', 'faturada'].includes(so.status?.toLowerCase() || '')) || [];

      fullContext = `
## 📊 CONTEXTO COMPLETO DO ERP (${today})

### 💰 RESUMO FINANCEIRO
- Contas a Pagar Pendentes: ${payables?.length || 0} títulos (R$ ${totalPayables.toFixed(2)})
- Contas a Pagar Vencidas: ${overduePayables.length} títulos (R$ ${totalOverduePayables.toFixed(2)})
- Contas a Receber Pendentes: ${receivables?.length || 0} títulos (R$ ${totalReceivables.toFixed(2)})
- Contas a Receber Vencidas: ${overdueReceivables.length} títulos (R$ ${totalOverdueReceivables.toFixed(2)})

### 🏦 BANCOS INTEGRADOS (via API)
- Status das Conexões: ${bankSyncStatus} (${bankConnections?.length || 0} conexões)
- Saldo Total Sincronizado: R$ ${totalBankBalanceSynced.toFixed(2)}
- Última Sincronização: ${lastBankSync || 'Nunca'}
- Entradas (100 últimas tx): R$ ${syncedIn.toFixed(2)}
- Saídas (100 últimas tx): R$ ${syncedOut.toFixed(2)}
- Contas Sincronizadas: ${bankAccountsSynced?.length || 0}
${bankAccountsSynced?.map(a => `  • ${a.name} (${a.bank_name}): R$ ${(a.current_balance || 0).toFixed(2)}`).join('\n') || '  Nenhuma conta sincronizada'}

### 👥 CADASTROS
- Total de Clientes: ${clients?.length || 0}
- Clientes Ativos: ${clients?.filter(c => c.status === 'ativo').length || 0}
- Total de Fornecedores: ${suppliers?.length || 0}
- Total de Produtos: ${allProducts?.length || 0}
- Produtos Ativos: ${allProducts?.filter(p => p.is_active).length || 0}
- Produtos com Estoque Baixo: ${lowStockProducts?.length || 0}
- Total de Serviços: ${services?.length || 0}
- Total de Equipamentos: ${equipments?.length || 0}

### 📈 VENDAS (últimas 100)
- Total em Vendas: R$ ${totalSales.toFixed(2)}
- Por Status: ${JSON.stringify(salesByStatus)}

### 🛠️ ORDENS DE SERVIÇO
- Total: ${serviceOrders?.length || 0}
- Em Aberto: ${openServiceOrders.length}

### 📦 PEDIDOS DE COMPRA
- Total: ${purchaseOrders?.length || 0}

---

### 📋 DETALHES - Contas a Pagar Vencidas (${overduePayables.length})
${JSON.stringify(overduePayables.slice(0, 15).map(p => ({
  descricao: p.description,
  valor: p.amount,
  vencimento: p.due_date,
  fornecedor: p.supplier?.razao_social || p.supplier?.nome_fantasia,
  dias_atraso: Math.floor((new Date().getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### 📋 DETALHES - Contas a Receber Vencidas (${overdueReceivables.length})
${JSON.stringify(overdueReceivables.slice(0, 15).map(r => ({
  descricao: r.description,
  valor: r.amount,
  vencimento: r.due_date,
  cliente: r.client?.razao_social || r.client?.nome_fantasia,
  dias_atraso: Math.floor((new Date().getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

### 📋 DETALHES - Transações Bancárias Sincronizadas (últimas 30)
${JSON.stringify(bankTransactionsSynced?.slice(0, 30).map(t => ({
  data: t.posted_at,
  descricao: t.description,
  valor: t.amount,
  direcao: t.direction,
  categoria: t.category,
  conciliado: t.is_reconciled
})), null, 2)}

### 📋 DETALHES - Clientes (${clients?.length || 0})
${JSON.stringify(clients?.slice(0, 50).map(c => ({
  nome: c.razao_social || c.nome_fantasia,
  cpf_cnpj: c.cpf_cnpj,
  cidade: c.cidade,
  estado: c.estado,
  status: c.status,
  limite_credito: c.limite_credito
})), null, 2)}

### 📋 DETALHES - Fornecedores (${suppliers?.length || 0})
${JSON.stringify(suppliers?.slice(0, 30).map(f => ({
  nome: f.razao_social || f.nome_fantasia,
  cpf_cnpj: f.cpf_cnpj,
  cidade: f.cidade,
  estado: f.estado
})), null, 2)}

### 📋 DETALHES - Últimas Vendas (20)
${JSON.stringify(sales?.slice(0, 20).map(s => ({
  numero: s.sale_number,
  status: s.status,
  valor: s.total_amount,
  cliente: (s.client as any)?.razao_social || (s.client as any)?.nome_fantasia,
  data: s.created_at
})), null, 2)}

### 📋 DETALHES - Ordens de Serviço em Aberto (${openServiceOrders.length})
${JSON.stringify(openServiceOrders.slice(0, 20).map(os => ({
  numero: os.order_number,
  status: os.status,
  valor: os.total_amount,
  cliente: (os.client as any)?.razao_social || (os.client as any)?.nome_fantasia,
  agendamento: os.scheduled_date
})), null, 2)}

### 📋 DETALHES - Produtos com Estoque Baixo (${lowStockProducts?.length || 0})
${JSON.stringify(lowStockProducts?.map(p => ({
  codigo: p.code,
  nome: p.name,
  estoque_atual: p.current_stock,
  estoque_minimo: p.minimum_stock
})), null, 2)}

### 📋 DETALHES - Transações Bancárias Manuais Recentes
${JSON.stringify(transactions?.slice(0, 15).map(t => ({
  data: t.transaction_date,
  descricao: t.description,
  valor: t.amount,
  tipo: t.type,
  conta: t.bank_account?.name,
  conciliado: t.is_reconciled
})), null, 2)}
`;
    } catch (dataError) {
      console.error("[financial-ai] Error fetching data:", dataError);
      fullContext = "## Dados não disponíveis\nNão foi possível carregar os dados do sistema.";
    }

    const systemPrompt = `Você é o WAI Operator, assistente operacional do WAI ERP.
Seu trabalho é AJUDAR o usuário a operar, auditar e decidir usando SOMENTE os dados fornecidos no "CONTEXTO DO WAI" abaixo.

IMPORTANTE (verdade operacional):
- Você NÃO tem acesso direto ao banco, telas, arquivos, integrações ou internet.
- Você enxerga APENAS o que veio no CONTEXTO DO WAI nesta mensagem.
- Se algo não estiver no contexto, diga "não tenho esse dado no contexto" e peça exatamente o que falta (sem chutar).

OBJETIVO:
- Responder de forma direta e prática.
- Explicar "o que está acontecendo", "por que importa" e "o que fazer agora".
- Quando o usuário estiver com bug/erro de sistema, você deve orientar o diagnóstico (passo a passo) e indicar o provável ponto de falha (frontend, RLS, query, edge function, dados).

REGRAS ANTI-ALUCINAÇÃO (obrigatórias):
1) Nunca invente números, registros, status, regras, endpoints, células de Excel, tabelas ou campos.
2) Se você não tiver certeza, pare e pergunte.
3) Ao citar dados do contexto, referencie de onde veio: (ex: "CONTEXTO: Contas a pagar vencidas", "CONTEXTO: Bancos integrados").
4) Se o usuário pedir decisão sem dados suficientes, responda com hipóteses explícitas ("SE… ENTÃO…") e peça os dados mínimos para fechar.

PERSONA E TOM:
- Você NÃO é "CFO", "Controller" ou "Operações" por padrão.
- Você é um assistente técnico/operacional chamado WAI Operator.
- Só assuma um papel (ex: "modo CFO") se o usuário pedir explicitamente: "atuar como CFO agora".
- Sem floreio, sem motivacional, sem texto longo. Objetivo.

FORMATAÇÃO BR (imutável):
- Moeda sempre BR: R$ 1.234,56
- Datas: dd/mm/aaaa
- Separador decimal: vírgula (,) | milhar: ponto (.)
- Quando mostrar cálculos, explicite fórmula e arredondamento.

PLAYBOOKS (como responder por tipo de pedido):
A) Financeiro:
- Comece com: saldo/atrasos/riscos (🚨, ⚠️, ✅).
- Liste ações: "cobrar X", "negociar Y", "priorizar Z".
- Para saldo bancário: use os dados de BANCOS INTEGRADOS (via API) se disponíveis.
B) Estoque:
- Mostre itens críticos (baixo/negativo) e impacto (OS bloqueada, faturamento travado).
- Sugira ação: compra, ajuste, investigação.
C) OS / Operação:
- Mostre gargalos: OS em aberto, tempo para faturar, dependências.
- Se houver Field Control: lembre regra "WAI é faturamento / Field é execução".
D) Bug de tela / dropdown / máscara de número:
- Diagnóstico em camadas:
  1) Dados existem? (tabela/registro)
  2) RLS deixa ler? (company_id/user_companies)
  3) Query está filtrando certo? (company_id + client_id etc.)
  4) Front está formatando certo? (parser BR, input controlado)
- No fim, entregue um checklist de correção.

SAÍDA PADRÃO (estrutura):
1) Resposta direta (1–3 linhas)
2) Evidências do contexto (bullets curtos)
3) Próximos passos (checklist)

Agora use o CONTEXTO DO WAI abaixo como única fonte de verdade:

[CONTEXTO DO WAI]
${fullContext}`;

    // Use streaming
    const useStreaming = type !== 'cfop_suggestion';
    
    console.log("[financial-ai] Calling OpenAI, streaming:", useStreaming);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: useStreaming,
        max_tokens: 2000,
        temperature: 0.3,
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
      const t = await response.text();
      console.error("[financial-ai] OpenAI error:", response.status, t);
      return new Response(JSON.stringify({ error: "OpenAI API error: " + t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For non-streaming requests, return JSON directly
    if (!useStreaming) {
      const data = await response.json();
      console.log("[financial-ai] Non-streaming response received");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[financial-ai] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
