import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface BankTxSummary {
  tx_count: number;
  total_in: number;
  total_out: number;
  net: number;
  first_date: string | null;
  last_date: string | null;
}

/**
 * Busca sumário de transações via RPC (FONTE OFICIAL para totais)
 * NUNCA usar soma de sample/limit para totais financeiros
 */
async function getBankTxSummary(
  supabase: any,
  companyId: string, 
  dateFrom: string, 
  dateTo: string
): Promise<BankTxSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_bank_tx_summary', {
      p_company_id: companyId,
      p_date_from: dateFrom,
      p_date_to: dateTo
    });
    
    if (error) {
      console.error('[financial-ai] RPC get_bank_tx_summary error:', error);
      return null;
    }
    
    const result = Array.isArray(data) ? data[0] : data;
    return result || null;
  } catch (err) {
    console.error('[financial-ai] getBankTxSummary exception:', err);
    return null;
  }
}

function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD no fuso de São Paulo
 */
function todayYMDinSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Retorna uma data N dias atrás no formato YYYY-MM-DD no fuso de São Paulo
 */
function daysAgoYMDinSP(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/**
 * Retorna o primeiro dia do mês atual no formato YYYY-MM-DD no fuso de São Paulo
 */
function firstDayOfMonthYMDinSP(): string {
  const now = new Date();
  const spDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${spDate.getFullYear()}-${String(spDate.getMonth() + 1).padStart(2, '0')}-01`;
}

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
    
    // Datas no timezone de São Paulo (evita problema UTC vs horário local brasileiro)
    const todayStr = todayYMDinSP();
    const sevenDaysAgo = daysAgoYMDinSP(6);
    const firstDayOfMonth = firstDayOfMonthYMDinSP();

    try {
      // ======== BUSCAR RESUMOS VIA RPC (FONTE OFICIAL PARA TOTAIS) ========
      const [resumoHoje, resumo7d, resumoMes] = await Promise.all([
        getBankTxSummary(supabase, companyId, todayStr, todayStr),
        getBankTxSummary(supabase, companyId, sevenDaysAgo, todayStr),
        getBankTxSummary(supabase, companyId, firstDayOfMonth, todayStr)
      ]);

      // Fetch ALL business data in parallel
      const [
        { data: payables },
        { data: receivables },
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
        // Contas bancárias (manuais + Inter)
        supabase
          .from("bank_accounts")
          .select("id, name, bank_name, current_balance, account_number, is_active")
          .eq("company_id", companyId)
          .eq("is_active", true),
        // Transações bancárias (apenas para evidência, NÃO para totais - totais vêm do RPC)
        supabase
          .from("bank_transactions")
          .select("id, description, amount, transaction_date, type, is_reconciled")
          .eq("company_id", companyId)
          .order("transaction_date", { ascending: false })
          .limit(50),
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

      const overduePayables = payables?.filter(p => p.due_date < todayStr) || [];
      const overdueReceivables = receivables?.filter(r => r.due_date < todayStr) || [];

      // Calculate totals
      const totalPayables = payables?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalReceivables = receivables?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const totalOverduePayables = overduePayables.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalOverdueReceivables = overdueReceivables.reduce((sum, r) => sum + (r.amount || 0), 0);

      // Bank info (usando bank_accounts - tabela onde o Inter salva)
      const totalBankBalance = bankAccountsSynced?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
      const lastBankSync = bankConnections?.find(c => c.last_sync_at)?.last_sync_at;
      const bankSyncStatus = bankConnections?.length ? (bankConnections.some(c => c.status === 'error') ? 'error' : 'active') : 'none';

      // Sales stats
      const totalSales = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const salesByStatus = sales?.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Service orders stats
      const openServiceOrders = serviceOrders?.filter(so => !['concluida', 'cancelada', 'faturada'].includes(so.status?.toLowerCase() || '')) || [];

      fullContext = `
## 📊 CONTEXTO COMPLETO DO ERP (${formatDateBR(todayStr)})

### 💰 RESUMO FINANCEIRO
- Contas a Pagar Pendentes: ${payables?.length || 0} títulos (${formatBRL(totalPayables)})
- Contas a Pagar Vencidas: ${overduePayables.length} títulos (${formatBRL(totalOverduePayables)})
- Contas a Receber Pendentes: ${receivables?.length || 0} títulos (${formatBRL(totalReceivables)})
- Contas a Receber Vencidas: ${overdueReceivables.length} títulos (${formatBRL(totalOverdueReceivables)})

### 🏦 BANCOS (FONTE OFICIAL: bank_transactions via RPC get_bank_tx_summary)
- Status das Conexões: ${bankSyncStatus} (${bankConnections?.length || 0} conexões)
- Saldo Total em Contas: ${formatBRL(totalBankBalance)}
- Última Sincronização: ${lastBankSync ? formatDateBR(lastBankSync) : 'Nunca'}
- Contas Cadastradas: ${bankAccountsSynced?.length || 0}
${bankAccountsSynced?.map(a => `  • ${a.name} (${a.bank_name}): ${formatBRL(a.current_balance)}`).join('\n') || '  Nenhuma conta cadastrada'}

### ⚠️ RESUMO HOJE (${formatDateBR(todayStr)}) - FONTE: RPC get_bank_tx_summary
${resumoHoje && resumoHoje.tx_count > 0 ? `- Transações: ${resumoHoje.tx_count}
- Entradas: ${formatBRL(resumoHoje.total_in)}
- Saídas: ${formatBRL(resumoHoje.total_out)}
- Saldo do Dia: ${formatBRL(resumoHoje.net)}
- Período: ${formatDateBR(resumoHoje.first_date)} → ${formatDateBR(resumoHoje.last_date)}` : `⚠️ tx_count: 0 - Sem transações bancárias sincronizadas para hoje.
É PROIBIDO inventar valores. Responda: "Não há transações bancárias sincronizadas para hoje."`}

### RESUMO ÚLTIMOS 7 DIAS - FONTE: RPC get_bank_tx_summary  
${resumo7d && resumo7d.tx_count > 0 ? `- Período: ${formatDateBR(resumo7d.first_date)} → ${formatDateBR(resumo7d.last_date)}
- Transações: ${resumo7d.tx_count}
- Entradas: ${formatBRL(resumo7d.total_in)}
- Saídas: ${formatBRL(resumo7d.total_out)}
- Saldo Período: ${formatBRL(resumo7d.net)}` : `⚠️ tx_count: 0 - Sem transações bancárias sincronizadas nos últimos 7 dias.`}

### RESUMO MÊS ATUAL - FONTE: RPC get_bank_tx_summary
${resumoMes && resumoMes.tx_count > 0 ? `- Período: ${formatDateBR(resumoMes.first_date)} → ${formatDateBR(resumoMes.last_date)}
- Transações: ${resumoMes.tx_count}
- Entradas: ${formatBRL(resumoMes.total_in)}
- Saídas: ${formatBRL(resumoMes.total_out)}
- Saldo Período: ${formatBRL(resumoMes.net)}` : `⚠️ tx_count: 0 - Sem transações bancárias sincronizadas no mês.`}

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
- Total em Vendas: ${formatBRL(totalSales)}
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

### 📋 DETALHES - Transações Bancárias (últimas 30 - APENAS PARA EVIDÊNCIA, NÃO USAR PARA TOTAIS)
${JSON.stringify(bankTransactionsSynced?.slice(0, 30).map(t => ({
  data: t.transaction_date,
  descricao: t.description,
  valor: t.amount,
  tipo: t.type,
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
`;
    } catch (dataError) {
      console.error("[financial-ai] Error fetching data:", dataError);
      fullContext = "## Dados não disponíveis\nNão foi possível carregar os dados do sistema.";
    }

    const systemPrompt = `Você é o WAI Operator, um operador técnico de sistema.
Você NÃO é CFO, analista, consultor ou conselheiro.
Você NÃO interpreta dados ausentes.
Você NÃO estima, projeta, resume ou consolida sem fonte explícita.

Seu único trabalho é:
Ler dados reais do sistema, declarar exatamente o que foi lido, e só então operar sobre isso.

═══════════════════════════════════════════════════════════════
REGRA ZERO (ABSOLUTA)
═══════════════════════════════════════════════════════════════
🚫 É PROIBIDO responder qualquer análise financeira se tx_count = 0 nos resumos.

Se tx_count for 0 ou null em RESUMO HOJE / RESUMO 7 DIAS / RESUMO MÊS:
👉 VOCÊ DEVE PARAR e responder:

"Não há transações bancárias sincronizadas no período solicitado.
- Fonte: bank_transactions_synced
- tx_count: 0
- Ação necessária: Sincronizar extrato bancário via integração antes de qualquer análise."

Texto fora disso quando tx_count = 0 = ERRO DE EXECUÇÃO.

═══════════════════════════════════════════════════════════════
FONTES DE DADOS (OBRIGATÓRIAS)
═══════════════════════════════════════════════════════════════
Você só pode usar dados vindos explicitamente do contexto.

Fontes válidas para extrato bancário:
- RESUMO HOJE / 7 DIAS / MÊS (via RPC get_bank_tx_summary) ← FONTE OFICIAL PARA TOTAIS
- bank_accounts_synced (saldos)
- bank_transactions_synced (lista para evidência, NUNCA para totais)

Se um número não estiver diretamente presente nessas fontes:
❌ não mencione
❌ não calcule
❌ não estime

═══════════════════════════════════════════════════════════════
ANÁLISE FINANCEIRA — SÓ SE TUDO EXISTIR
═══════════════════════════════════════════════════════════════
Somente se TODAS as condições forem verdadeiras:
✔️ tx_count > 0 no resumo do período
✔️ Período claro (first_date → last_date)
✔️ total_in e total_out explícitos

Ao responder, SEMPRE inclua:
- "Fonte: bank_transactions_synced"
- "Período: dd/mm/yyyy → dd/mm/yyyy"
- "tx_count: N"

═══════════════════════════════════════════════════════════════
PROIBIÇÕES ABSOLUTAS
═══════════════════════════════════════════════════════════════
🚫 É proibido:
- "Parece que…"
- "Provavelmente…"
- "Indicando que…"
- "Sugere que…"
- Recomendar renegociação sem dados de fornecedor
- Falar de "fluxo negativo" sem saldo bancário real
- Somar valores da lista de transações (use APENAS os totais do RPC)
- Inventar valores que não estão no contexto

═══════════════════════════════════════════════════════════════
FORMATAÇÃO BR (imutável)
═══════════════════════════════════════════════════════════════
- Moeda sempre BR: R$ 1.234,56
- Datas: dd/mm/aaaa
- Separador decimal: vírgula (,) | milhar: ponto (.)

═══════════════════════════════════════════════════════════════
TOM E COMPORTAMENTO
═══════════════════════════════════════════════════════════════
- Técnico
- Frio
- Objetivo
- Sem emojis (exceto ⚠️ para alertas)
- Sem conselhos genéricos
- Sem storytelling

Você opera sistemas, não pessoas.

═══════════════════════════════════════════════════════════════
FRASE FINAL (OBRIGATÓRIA EM TODA RESPOSTA FINANCEIRA)
═══════════════════════════════════════════════════════════════
"Análise baseada exclusivamente nos dados bancários atualmente sincronizados no sistema."

═══════════════════════════════════════════════════════════════
CONTEXTO DO WAI (ÚNICA FONTE DE VERDADE)
═══════════════════════════════════════════════════════════════
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
        temperature: 0.1, // Reduzido para menos criatividade/alucinação
      }),
    });
    
    console.log("[financial-ai] OpenAI response status:", response.status);

    if (!response.ok) {
      if (response.status === 429) {
        console.log("[financial-ai] Rate limited by OpenAI");
        return new Response(JSON.stringify({ 
          error: "OpenAI rate limited. Please wait a moment.",
          status: 429 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const errorText = await response.text();
      console.error("[financial-ai] OpenAI error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Return streaming response
    if (useStreaming) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming response
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[financial-ai] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
