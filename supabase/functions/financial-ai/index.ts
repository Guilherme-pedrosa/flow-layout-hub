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
 * Retorna o primeiro dia do mês de uma data específica no formato YYYY-MM-DD
 */
function firstDayOfMonthFromDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * CRÍTICO: Busca a data da última transação no banco (latest_date)
 * Isso resolve o problema de "hoje" não ter dados pois bancos usam D-1
 */
async function getLatestBankDate(supabase: any, companyId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('transaction_date')
      .eq('company_id', companyId)
      .order('transaction_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('[financial-ai] getLatestBankDate error:', error);
      return null;
    }
    
    return data?.transaction_date || null;
  } catch (err) {
    console.error('[financial-ai] getLatestBankDate exception:', err);
    return null;
  }
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
    let systemPrompt = "";
    
    // Variáveis para resumos bancários (usadas no prompt)
    let resumoHoje: BankTxSummary | null = null;
    let resumo7d: BankTxSummary | null = null;
    let resumoMes: BankTxSummary | null = null;
    let resumo30d: BankTxSummary | null = null;
    // CRÍTICO: Buscar último dia com dados no banco (resolve problema de bancos que usam D-1)
    const latestBankDate = await getLatestBankDate(supabase, companyId);
    const todayStr = todayYMDinSP();
    
    // Se não há dados no banco, usar today como fallback
    const baseDate = latestBankDate || todayStr;
    const baseDateObj = new Date(baseDate + 'T12:00:00');
    
    // Calcular períodos baseados no último dia com dados
    const sevenDaysBeforeBase = new Date(baseDateObj);
    sevenDaysBeforeBase.setDate(sevenDaysBeforeBase.getDate() - 6);
    const sevenDaysAgo = sevenDaysBeforeBase.toISOString().split('T')[0];
    
    const thirtyDaysBeforeBase = new Date(baseDateObj);
    thirtyDaysBeforeBase.setDate(thirtyDaysBeforeBase.getDate() - 29);
    const thirtyDaysAgo = thirtyDaysBeforeBase.toISOString().split('T')[0];
    
    const firstDayOfMonth = firstDayOfMonthFromDate(baseDate);
    
    console.log(`[financial-ai] Bank dates for ${company.name}:`, {
      latestBankDate,
      baseDate,
      todayStr,
      sevenDaysAgo,
      thirtyDaysAgo,
      firstDayOfMonth
    });

    try {
      // ======== BUSCAR RESUMOS VIA RPC (FONTE OFICIAL PARA TOTAIS) ========
      // Usa baseDate (último dia com dados) ao invés de todayStr
      const [rHoje, r7d, rMes, r30d] = await Promise.all([
        getBankTxSummary(supabase, companyId, baseDate, baseDate),  // "Hoje" = último dia com dados
        getBankTxSummary(supabase, companyId, sevenDaysAgo, baseDate),
        getBankTxSummary(supabase, companyId, firstDayOfMonth, baseDate),
        getBankTxSummary(supabase, companyId, thirtyDaysAgo, baseDate)
      ]);
      
      // Atribuir às variáveis externas
      resumoHoje = rHoje;
      resumo7d = r7d;
      resumoMes = rMes;
      resumo30d = r30d;

      // Debug log - mostrar resumos encontrados
      console.log(`[financial-ai] Bank summaries for ${company.name}:`, {
        latestBankDate,
        hoje: resumoHoje?.tx_count || 0,
        '7d': resumo7d?.tx_count || 0,
        mes: resumoMes?.tx_count || 0,
        '30d': resumo30d?.tx_count || 0
      });

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
        // Transações bancárias COMPLETAS (para análise detalhada pela IA)
        // A IA precisa de TODOS os campos para atuar como "gerente do negócio"
        supabase
          .from("bank_transactions")
          .select("id, description, amount, transaction_date, type, is_reconciled, nsu, raw_data, category, created_at, updated_at")
          .eq("company_id", companyId)
          .order("transaction_date", { ascending: false })
          .limit(200),  // Aumentado de 50 para 200 para análise mais abrangente
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
## 📊 CONTEXTO COMPLETO DO ERP 
### ⚠️ ATENÇÃO: ÚLTIMO DIA COM DADOS NO BANCO: ${latestBankDate ? formatDateBR(latestBankDate) : 'SEM DADOS'}
### Data de hoje do sistema: ${formatDateBR(todayStr)}

${!latestBankDate ? `
🚨 ALERTA CRÍTICO: Não há transações bancárias sincronizadas para esta empresa.
Se o usuário perguntar sobre extrato/despesas/entradas, responda EXATAMENTE:
"Não há transações bancárias sincronizadas. Fonte: bank_transactions (0 registros). Sincronize o extrato bancário para análise."
NÃO INVENTE VALORES.
` : ''}

### 💰 RESUMO FINANCEIRO
- Contas a Pagar Pendentes: ${payables?.length || 0} títulos (${formatBRL(totalPayables)})
- Contas a Pagar Vencidas: ${overduePayables.length} títulos (${formatBRL(totalOverduePayables)})
- Contas a Receber Pendentes: ${receivables?.length || 0} títulos (${formatBRL(totalReceivables)})
- Contas a Receber Vencidas: ${overdueReceivables.length} títulos (${formatBRL(totalOverdueReceivables)})

### 🏦 BANCOS (FONTE OFICIAL: bank_transactions via RPC get_bank_tx_summary)
- Status das Conexões: ${bankSyncStatus} (${bankConnections?.length || 0} conexões)
- Saldo Total em Contas: ${formatBRL(totalBankBalance)}
- Última Sincronização: ${lastBankSync ? formatDateBR(lastBankSync) : 'Nunca'}
- **ÚLTIMO DIA COM DADOS: ${latestBankDate ? formatDateBR(latestBankDate) : 'NENHUM'}**
- Contas Cadastradas: ${bankAccountsSynced?.length || 0}
${bankAccountsSynced?.map(a => `  • ${a.name} (${a.bank_name}): ${formatBRL(a.current_balance)}`).join('\n') || '  Nenhuma conta cadastrada'}

### ✅ RESUMO ÚLTIMOS 30 DIAS (PRINCIPAL) - FONTE: RPC get_bank_tx_summary
${resumo30d && resumo30d.tx_count > 0 ? `- Período: ${formatDateBR(resumo30d.first_date)} → ${formatDateBR(resumo30d.last_date)}
- Transações: ${resumo30d.tx_count}
- Entradas (total_in): ${formatBRL(resumo30d.total_in)}
- Saídas (total_out): ${formatBRL(resumo30d.total_out)}
- Saldo Período (net): ${formatBRL(resumo30d.net)}` : `⚠️ tx_count: 0 - SEM TRANSAÇÕES NOS ÚLTIMOS 30 DIAS`}

### RESUMO MÊS ATUAL - FONTE: RPC get_bank_tx_summary
${resumoMes && resumoMes.tx_count > 0 ? `- Período: ${formatDateBR(resumoMes.first_date)} → ${formatDateBR(resumoMes.last_date)}
- Transações: ${resumoMes.tx_count}
- Entradas (total_in): ${formatBRL(resumoMes.total_in)}
- Saídas (total_out): ${formatBRL(resumoMes.total_out)}
- Saldo Período (net): ${formatBRL(resumoMes.net)}` : `⚠️ tx_count: 0 - SEM TRANSAÇÕES NO MÊS ATUAL`}

### RESUMO ÚLTIMOS 7 DIAS - FONTE: RPC get_bank_tx_summary  
${resumo7d && resumo7d.tx_count > 0 ? `- Período: ${formatDateBR(resumo7d.first_date)} → ${formatDateBR(resumo7d.last_date)}
- Transações: ${resumo7d.tx_count}
- Entradas (total_in): ${formatBRL(resumo7d.total_in)}
- Saídas (total_out): ${formatBRL(resumo7d.total_out)}
- Saldo Período (net): ${formatBRL(resumo7d.net)}` : `⚠️ tx_count: 0 - SEM TRANSAÇÕES NOS ÚLTIMOS 7 DIAS`}

### RESUMO "HOJE" (= ÚLTIMO DIA COM DADOS: ${latestBankDate ? formatDateBR(latestBankDate) : 'N/A'}) - FONTE: RPC get_bank_tx_summary
${resumoHoje && resumoHoje.tx_count > 0 ? `- Transações: ${resumoHoje.tx_count}
- Entradas (total_in): ${formatBRL(resumoHoje.total_in)}
- Saídas (total_out): ${formatBRL(resumoHoje.total_out)}
- Saldo do Dia (net): ${formatBRL(resumoHoje.net)}` : `⚠️ tx_count: 0 - SEM TRANSAÇÕES NO DIA ${latestBankDate ? formatDateBR(latestBankDate) : 'N/A'}`}

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

### 📋 DETALHES - Transações Bancárias COMPLETAS (últimas 100 - PARA ANÁLISE DETALHADA)
**IMPORTANTE:** Use estes dados para identificar padrões, categorias de gastos, fornecedores recorrentes e anomalias.
${JSON.stringify(bankTransactionsSynced?.slice(0, 100).map((t: any) => ({
  data: t.transaction_date,
  descricao: t.description,
  valor: t.amount,
  tipo: t.type,
  conciliado: t.is_reconciled,
  nsu: t.nsu || null,
  categoria: t.category || null,
  // Extrair informações relevantes do raw_data se disponível
  tipo_transacao: t.raw_data?.tipoTransacao || t.raw_data?.tipo || t.raw_data?.tipoOperacao || null,
  pagador_recebedor: t.raw_data?.nomePagador || t.raw_data?.nomeRecebedor || t.raw_data?.contraparte || t.raw_data?.nomeBeneficiario || null,
  documento_cpf_cnpj: t.raw_data?.cpfCnpjPagador || t.raw_data?.cpfCnpjRecebedor || t.raw_data?.cpfCnpjBeneficiario || null,
  chave_pix: t.raw_data?.chavePix || t.raw_data?.endToEndId || null
})), null, 2)}

### 📊 ANÁLISE DE PADRÕES (baseado nas últimas ${bankTransactionsSynced?.length || 0} transações)
- Transações não conciliadas: ${bankTransactionsSynced?.filter((t: any) => !t.is_reconciled).length || 0}
- Transações PIX: ${bankTransactionsSynced?.filter((t: any) => t.raw_data?.tipoTransacao === 'PIX' || t.raw_data?.tipo === 'PIX').length || 0}
- Transações Boleto: ${bankTransactionsSynced?.filter((t: any) => t.raw_data?.tipoTransacao?.includes('BOLETO') || t.description?.toLowerCase().includes('boleto')).length || 0}
- Transações TED/DOC: ${bankTransactionsSynced?.filter((t: any) => t.raw_data?.tipoTransacao?.includes('TED') || t.raw_data?.tipoTransacao?.includes('DOC')).length || 0}
- Tarifas bancárias: ${bankTransactionsSynced?.filter((t: any) => t.description?.toLowerCase().includes('tarifa') || t.raw_data?.tipoTransacao?.includes('TARIFA')).length || 0}

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

    // Verificar se há dados bancários
    const hasBankData = (resumo30d?.tx_count || 0) > 0 || (resumoMes?.tx_count || 0) > 0;
    
    systemPrompt = `Você é o WAI Operator, um assistente técnico de análise financeira que atua como "gerente do negócio".

## REGRAS OBRIGATÓRIAS ANTI-ALUCINAÇÃO

### 1. FONTE ÚNICA PARA TOTAIS BANCÁRIOS
- Totais de entradas/saídas/saldo DEVEM vir EXCLUSIVAMENTE do RPC get_bank_tx_summary
- Use os campos: total_in (entradas), total_out (saídas), net (saldo), tx_count (qtd transações)
- A lista de transações individuais é para ANÁLISE DETALHADA (identificar padrões, fornecedores, categorias)
- NUNCA some valores de transações individuais para calcular totais - use sempre o RPC

### 2. ÚLTIMO DIA COM DADOS
- O sistema ajustou automaticamente "hoje" para o último dia com dados no banco
- Último dia com dados: ${latestBankDate ? formatDateBR(latestBankDate) : 'NENHUM'}
- Se o usuário perguntar "hoje" e não houver dados, explique que o último dado é de ${latestBankDate ? formatDateBR(latestBankDate) : 'nenhuma data'}

### 3. TRAVA QUANDO NÃO HÁ DADOS
${!hasBankData ? `
⚠️ ALERTA: tx_count = 0 em TODOS os períodos. 
Se perguntarem sobre extrato/despesas/gastos, responda EXATAMENTE:
"Não há transações bancárias sincronizadas para análise.
Fonte: RPC get_bank_tx_summary (tx_count: 0 em todos os períodos).
Ação necessária: Sincronize o extrato bancário para continuar."
NÃO INVENTE VALORES.` : `
✅ Dados disponíveis para análise:
- 30 dias: ${resumo30d?.tx_count || 0} transações | Saídas: ${formatBRL(resumo30d?.total_out)} | Entradas: ${formatBRL(resumo30d?.total_in)}
- Mês: ${resumoMes?.tx_count || 0} transações | Saídas: ${formatBRL(resumoMes?.total_out)} | Entradas: ${formatBRL(resumoMes?.total_in)}
- 7 dias: ${resumo7d?.tx_count || 0} transações`}

### 4. FORMATO DE RESPOSTA OBRIGATÓRIO
Ao responder sobre dados bancários, SEMPRE inclua:
- **Fonte:** RPC get_bank_tx_summary
- **Período:** dd/mm/aaaa → dd/mm/aaaa
- **Transações:** tx_count
- **Totais:** total_in, total_out, net

### 5. PROIBIÇÕES
- NÃO use "parece", "provavelmente", "indicando"
- NÃO faça projeções sem dados reais
- NÃO some valores de transações individuais para totais (use RPC)
- NÃO invente categorias ou análises sem dados

### 6. ANÁLISE COMPLETA DO EXTRATO BANCÁRIO
Você tem acesso a TODAS as transações bancárias sincronizadas (não apenas PIX).
Use os dados completos (incluindo raw_data) para:
- Identificar fornecedores recorrentes e padrões de pagamento
- Categorizar despesas (folha de pagamento, fornecedores, tarifas bancárias, impostos)
- Alertar sobre transações anormais ou suspeitas
- Sugerir otimizações de fluxo de caixa
- Identificar oportunidades de redução de custos

Ao analisar transações, considere:
- Tipo de transação (PIX, boleto, TED, tarifa, etc.) - disponível no raw_data
- Pagador/Recebedor identificado no raw_data
- Recorrência (mensal, semanal, pontual)
- Categoria de despesa inferida pela descrição

### 7. CAPACIDADES DE ANÁLISE AVANÇADA
Com acesso completo ao extrato, você pode:
1. **Identificar Padrões de Gastos:** Agrupe transações por fornecedor, categoria e periodicidade
2. **Detectar Anomalias:** Compare valores e datas de transações recorrentes
3. **Sugerir Categorização:** Proponha categorias para transações não classificadas
4. **Alertar Duplicidades:** Identifique possíveis pagamentos duplicados
5. **Analisar Fluxo de Caixa:** Correlacione entradas/saídas com contas a pagar/receber
6. **Recomendar Ações:** Sugira renegociações, antecipações ou mudanças de fornecedor

### FORMATAÇÃO
- Moeda BR: R$ 1.234,56
- Datas: dd/mm/aaaa

CONTEXTO COMPLETO (ÚNICA FONTE DE VERDADE):
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
