/**
 * WAI ERP - AI Context Builder v2.0
 * 
 * Constrói o contexto de dados do sistema para enviar à IA.
 * O contexto é a "fonte de verdade" que a IA usa para responder.
 * 
 * REGRAS v2.0:
 * - FONTE OFICIAL para extrato: bank_transactions_synced / bank_accounts_synced
 * - NUNCA usar bank_transactions / bank_accounts para extrato
 * - Inclui SEMPRE resumo do período via RPC get_bank_tx_summary
 * - Coleta APENAS dados que o usuário tem permissão (via RLS)
 * - Limita quantidade de registros para não estourar tokens
 * - Formata valores em padrão BR
 */

import { supabase } from "@/integrations/supabase/client";
import { AIMode } from "./systemPrompt";
import { todayYMDinSP, daysAgoYMDinSP, firstDayOfMonthYMDinSP } from "@/utils/datesSP";

export interface AIContextOptions {
  companyId: string;
  userId?: string;
  pageRoute?: string;
  entityIds?: {
    serviceOrderId?: string;
    clientId?: string;
    productId?: string;
    supplierId?: string;
  };
  mode?: AIMode;
}

export interface BankTxSummary {
  tx_count: number;
  total_in: number;
  total_out: number;
  net: number;
  first_date: string | null;
  last_date: string | null;
}

export interface AIContext {
  company: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    role?: string;
  };
  currentPage?: string;
  kpis: {
    osAbertas?: number;
    osAtrasadas?: number;
    estoqueNegativo?: number;
    contasVencidas?: number;
    totalVencido?: number;
    faturamentoPendente?: number;
  };
  financeiro?: {
    contasPagarVencidas?: any[];
    contasPagarProximas?: any[];
    contasReceberVencidas?: any[];
    // BANCOS SINCRONIZADOS (fonte oficial)
    bancosSincronizados?: {
      contas: any[];
      ultimaSincronizacao: string | null;
      statusConexao: string;
    };
    // RESUMOS DO PERÍODO (via RPC - FONTE OFICIAL para totais)
    resumoHoje?: BankTxSummary | null;
    resumo7d?: BankTxSummary | null;
    resumoMes?: BankTxSummary | null;
    // Últimas transações (apenas para evidência, NÃO para totais)
    ultimasTransacoesSynced?: any[];
  };
  estoque?: {
    itensNegativos?: any[];
    itensBaixos?: any[];
  };
  os?: {
    abertas?: any[];
    atrasadas?: any[];
  };
  auditLogs?: any[];
  entityDetails?: any;
}

/**
 * Formata valor para padrão BR
 */
function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Formata data para padrão BR
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

/**
 * Busca sumário de transações via RPC (fonte oficial para totais)
 */
async function getBankTxSummary(
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
      console.error('[contextBuilder] RPC get_bank_tx_summary error:', error);
      return null;
    }
    
    // RPC retorna array, pegar primeiro item
    const result = Array.isArray(data) ? data[0] : data;
    return result || null;
  } catch (err) {
    console.error('[contextBuilder] getBankTxSummary exception:', err);
    return null;
  }
}

/**
 * Constrói contexto completo para a IA
 */
export async function buildAIContext(options: AIContextOptions): Promise<AIContext> {
  const { companyId, userId, pageRoute, entityIds, mode } = options;
  
  const context: AIContext = {
    company: { id: companyId, name: "" },
    currentPage: pageRoute,
    kpis: {},
  };

  // 1. Dados da empresa
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single();
  
  if (company) {
    context.company = { id: company.id, name: company.name };
  }

  // 2. KPIs principais (sempre carrega)
  await loadKPIs(context, companyId);

  // 3. Dados específicos por modo
  if (mode === "financeiro" || !mode || mode === "chat") {
    await loadFinanceiroData(context, companyId);
  }

  if (mode === "estoque" || !mode || mode === "chat") {
    await loadEstoqueData(context, companyId);
  }

  if (mode === "os" || !mode || mode === "chat") {
    await loadOSData(context, companyId);
  }

  // 4. Logs de auditoria recentes
  await loadAuditLogs(context, companyId);

  // 5. Detalhes de entidade específica (se fornecido)
  if (entityIds?.serviceOrderId) {
    await loadServiceOrderDetails(context, entityIds.serviceOrderId);
  }

  return context;
}

async function loadKPIs(context: AIContext, companyId: string) {
  // OS Abertas
  const { count: osAbertas } = await supabase
    .from("service_orders")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("status_id", "is", null);
  
  context.kpis.osAbertas = osAbertas || 0;

  // Contas vencidas
  const today = new Date().toISOString().split("T")[0];
  
  const { data: vencidos, count: contasVencidas } = await supabase
    .from("payables")
    .select("amount", { count: "exact" })
    .eq("company_id", companyId)
    .eq("is_paid", false)
    .lt("due_date", today);
  
  context.kpis.contasVencidas = contasVencidas || 0;
  context.kpis.totalVencido = vencidos?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Estoque negativo
  const { count: estoqueNegativo } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .lt("stock_quantity", 0);
  
  context.kpis.estoqueNegativo = estoqueNegativo || 0;
}

async function loadFinanceiroData(context: AIContext, companyId: string) {
  // Datas no timezone de São Paulo (evita problema de UTC vs horário local)
  const todayStr = todayYMDinSP();
  const sevenDaysAgo = daysAgoYMDinSP(6);
  const firstDayOfMonth = firstDayOfMonthYMDinSP();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  context.financeiro = {};

  // Contas a pagar vencidas (top 10)
  const { data: pagarVencidas } = await supabase
    .from("payables")
    .select("id, description, amount, due_date, supplier_id")
    .eq("company_id", companyId)
    .eq("is_paid", false)
    .lt("due_date", todayStr)
    .order("due_date", { ascending: true })
    .limit(10);
  
  context.financeiro.contasPagarVencidas = pagarVencidas?.map(p => ({
    ...p,
    amount_formatted: formatBRL(p.amount),
    due_date_formatted: formatDate(p.due_date),
    dias_atraso: Math.floor((Date.now() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24))
  })) || [];

  // Contas a pagar próximas (7 dias)
  const { data: pagarProximas } = await supabase
    .from("payables")
    .select("id, description, amount, due_date")
    .eq("company_id", companyId)
    .eq("is_paid", false)
    .gte("due_date", todayStr)
    .lte("due_date", in7Days)
    .order("due_date", { ascending: true })
    .limit(10);
  
  context.financeiro.contasPagarProximas = pagarProximas?.map(p => ({
    ...p,
    amount_formatted: formatBRL(p.amount),
    due_date_formatted: formatDate(p.due_date)
  })) || [];

  // Contas a receber vencidas
  const { data: receberVencidas } = await supabase
    .from("accounts_receivable")
    .select("id, description, amount, due_date, client_id")
    .eq("company_id", companyId)
    .eq("is_paid", false)
    .lt("due_date", todayStr)
    .order("amount", { ascending: false })
    .limit(10);
  
  context.financeiro.contasReceberVencidas = receberVencidas?.map(r => ({
    ...r,
    amount_formatted: formatBRL(r.amount),
    due_date_formatted: formatDate(r.due_date),
    dias_atraso: Math.floor((Date.now() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
  })) || [];

  // ======== BANCOS (FONTE OFICIAL: bank_transactions via RPC) ========
  
  // Contas bancárias
  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("id, name, bank_name, current_balance, is_active")
    .eq("company_id", companyId)
    .eq("is_active", true);
  
  // Status das conexões
  const { data: bankConnections } = await supabase
    .from("bank_connections")
    .select("id, status, last_sync_at, last_sync_status")
    .eq("company_id", companyId);
  
  const lastSync = bankConnections?.find(c => c.last_sync_at)?.last_sync_at || null;
  const connectionStatus = bankConnections?.length 
    ? (bankConnections.some(c => c.status === 'error') ? 'error' : 'active')
    : 'none';

  context.financeiro.bancosSincronizados = {
    contas: bankAccounts?.map(a => ({
      id: a.id,
      nome: a.name,
      banco: a.bank_name,
      saldo: a.current_balance,
      saldo_formatted: formatBRL(a.current_balance),
      disponivel: a.current_balance,
      ultima_atualizacao: formatDate(lastSync)
    })) || [],
    ultimaSincronizacao: lastSync,
    statusConexao: connectionStatus
  };

  // ======== RESUMOS DO PERÍODO VIA RPC (FONTE OFICIAL PARA TOTAIS) ========
  
  // Buscar resumos em paralelo
  const [resumoHoje, resumo7d, resumoMes] = await Promise.all([
    getBankTxSummary(companyId, todayStr, todayStr),
    getBankTxSummary(companyId, sevenDaysAgo, todayStr),
    getBankTxSummary(companyId, firstDayOfMonth, todayStr)
  ]);
  
  context.financeiro.resumoHoje = resumoHoje;
  context.financeiro.resumo7d = resumo7d;
  context.financeiro.resumoMes = resumoMes;

  // Últimas transações COMPLETAS (para análise detalhada)
  const { data: transacoes } = await supabase
    .from("bank_transactions")
    .select("id, description, amount, transaction_date, type, is_reconciled, nsu, raw_data, category, created_at")
    .eq("company_id", companyId)
    .order("transaction_date", { ascending: false })
    .limit(100);  // Aumentado de 20 para 100
  
  context.financeiro.ultimasTransacoesSynced = transacoes?.map((t: any) => ({
    ...t,
    amount_formatted: formatBRL(Math.abs(t.amount)),
    date_formatted: formatDate(t.transaction_date),
    tipo: t.amount > 0 ? 'entrada' : 'saida',
    // Dados expandidos do raw_data
    tipo_transacao: t.raw_data?.tipoTransacao || t.raw_data?.tipo || null,
    pagador_recebedor: t.raw_data?.nomePagador || t.raw_data?.nomeRecebedor || t.raw_data?.contraparte || null
  })) || [];
}

async function loadEstoqueData(context: AIContext, companyId: string) {
  context.estoque = {};

  // Itens com estoque negativo
  const { data: negativos } = await supabase
    .from("products")
    .select("id, code, name, stock_quantity")
    .eq("company_id", companyId)
    .lt("stock_quantity", 0)
    .limit(20);
  
  context.estoque.itensNegativos = negativos || [];

  // Itens com estoque baixo (abaixo de 5)
  const { data: baixos } = await supabase
    .from("products")
    .select("id, code, name, stock_quantity, min_stock")
    .eq("company_id", companyId)
    .gte("stock_quantity", 0)
    .lte("stock_quantity", 5)
    .limit(20);
  
  context.estoque.itensBaixos = baixos || [];
}

async function loadOSData(context: AIContext, companyId: string) {
  context.os = {};

  // OS abertas (sem status de conclusão)
  const { data: abertas } = await supabase
    .from("service_orders")
    .select(`
      id, 
      order_number, 
      created_at,
      client:clientes(razao_social, nome_fantasia)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(10);
  
  context.os.abertas = abertas?.map(os => ({
    ...os,
    created_at_formatted: formatDate(os.created_at),
    cliente_nome: (os.client as any)?.nome_fantasia || (os.client as any)?.razao_social || "Sem cliente"
  })) || [];
}

async function loadAuditLogs(context: AIContext, companyId: string) {
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, created_at, metadata_json")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(30);
  
  context.auditLogs = logs?.map(l => ({
    ...l,
    created_at_formatted: formatDate(l.created_at)
  })) || [];
}

async function loadServiceOrderDetails(context: AIContext, serviceOrderId: string) {
  const { data: os } = await supabase
    .from("service_orders")
    .select(`
      *,
      client:clientes(razao_social, nome_fantasia, cpf_cnpj),
      equipment:equipments(name, model, serial_number)
    `)
    .eq("id", serviceOrderId)
    .single();
  
  if (os) {
    context.entityDetails = {
      type: "service_order",
      data: os
    };
  }
}

/**
 * Serializa o contexto para texto (para incluir no prompt)
 */
export function serializeContext(context: AIContext): string {
  const sections: string[] = [];

  // Empresa
  sections.push(`## Empresa\n- ID: ${context.company.id}\n- Nome: ${context.company.name}`);

  // Página atual
  if (context.currentPage) {
    sections.push(`## Página Atual\n${context.currentPage}`);
  }

  // KPIs
  sections.push(`## KPIs do Sistema
- OS Abertas: ${context.kpis.osAbertas || 0}
- OS Atrasadas: ${context.kpis.osAtrasadas || 0}
- Estoque Negativo: ${context.kpis.estoqueNegativo || 0} itens
- Contas Vencidas: ${context.kpis.contasVencidas || 0}
- Total Vencido: ${formatBRL(context.kpis.totalVencido)}`);

  // Financeiro
  if (context.financeiro) {
    const fin = context.financeiro;
    
    // BANCOS SINCRONIZADOS (FONTE OFICIAL)
    const bancos = fin.bancosSincronizados;
    const saldoTotalSynced = bancos?.contas.reduce((sum, c) => sum + (c.saldo || 0), 0) || 0;
    
    sections.push(`## 🏦 BANCOS SINCRONIZADOS (FONTE OFICIAL)
### Status da Integração
- Status: ${bancos?.statusConexao || 'none'}
- Última Sincronização: ${bancos?.ultimaSincronizacao ? formatDate(bancos.ultimaSincronizacao) : 'Nunca'}
- Contas Ativas: ${bancos?.contas.length || 0}
- Saldo Total: ${formatBRL(saldoTotalSynced)}

### Contas Bancárias
${bancos?.contas.map(c => `- ${c.nome} (${c.banco}): ${c.saldo_formatted}`).join('\n') || 'Nenhuma conta sincronizada'}

### ⚠️ RESUMO HOJE (${new Date().toLocaleDateString('pt-BR')}) - FONTE: RPC get_bank_tx_summary
${fin.resumoHoje ? `- Transações: ${fin.resumoHoje.tx_count}
- Entradas: ${formatBRL(fin.resumoHoje.total_in)}
- Saídas: ${formatBRL(fin.resumoHoje.total_out)}
- Saldo do Dia: ${formatBRL(fin.resumoHoje.net)}` : '⚠️ Sem dados de transações para hoje'}

### RESUMO ÚLTIMOS 7 DIAS - FONTE: RPC get_bank_tx_summary
${fin.resumo7d ? `- Período: ${formatDate(fin.resumo7d.first_date)} → ${formatDate(fin.resumo7d.last_date)}
- Transações: ${fin.resumo7d.tx_count}
- Entradas: ${formatBRL(fin.resumo7d.total_in)}
- Saídas: ${formatBRL(fin.resumo7d.total_out)}
- Saldo Período: ${formatBRL(fin.resumo7d.net)}` : '⚠️ Sem dados de transações para os últimos 7 dias'}

### RESUMO MÊS ATUAL - FONTE: RPC get_bank_tx_summary
${fin.resumoMes ? `- Período: ${formatDate(fin.resumoMes.first_date)} → ${formatDate(fin.resumoMes.last_date)}
- Transações: ${fin.resumoMes.tx_count}
- Entradas: ${formatBRL(fin.resumoMes.total_in)}
- Saídas: ${formatBRL(fin.resumoMes.total_out)}
- Saldo Período: ${formatBRL(fin.resumoMes.net)}` : '⚠️ Sem dados de transações para o mês'}

### Últimas 50 Transações (para análise de padrões)
${fin.ultimasTransacoesSynced?.slice(0, 50).map((t: any) => 
  `- ${t.date_formatted} | ${t.tipo.toUpperCase()} | ${t.amount_formatted} | ${t.description || 'Sem descrição'} | ${t.tipo_transacao || ''}`
).join('\n') || 'Nenhuma transação sincronizada'}`);
    
    // Estatísticas de transações
    const naoReconciliadas = fin.ultimasTransacoesSynced?.filter((t: any) => !t.is_reconciled).length || 0;
    if (naoReconciliadas > 0) {
      sections.push(`### ⚠️ Transações Não Conciliadas: ${naoReconciliadas}`);
    }

    // Contas a pagar/receber
    sections.push(`## 📋 CONTAS A PAGAR/RECEBER
### Contas a Pagar Vencidas (${fin.contasPagarVencidas?.length || 0})
${fin.contasPagarVencidas?.map(p => 
  `- ${p.description || 'Sem descrição'}: ${p.amount_formatted} (vencido há ${p.dias_atraso} dias)`
).join('\n') || 'Nenhuma'}

### Contas a Pagar Próximas 7 dias (${fin.contasPagarProximas?.length || 0})
${fin.contasPagarProximas?.map(p => 
  `- ${p.description || 'Sem descrição'}: ${p.amount_formatted} (vence ${p.due_date_formatted})`
).join('\n') || 'Nenhuma'}

### Contas a Receber Vencidas (${fin.contasReceberVencidas?.length || 0})
${fin.contasReceberVencidas?.map(r => 
  `- ${r.description || 'Sem descrição'}: ${r.amount_formatted} (vencido há ${r.dias_atraso} dias)`
).join('\n') || 'Nenhuma'}`);
  }

  // Estoque
  if (context.estoque) {
    const est = context.estoque;
    sections.push(`## Estoque
### Itens com Estoque Negativo (${est.itensNegativos?.length || 0})
${est.itensNegativos?.map(p => 
  `- ${p.code || p.id}: ${p.name} (qty: ${p.stock_quantity})`
).join('\n') || 'Nenhum'}

### Itens com Estoque Baixo (${est.itensBaixos?.length || 0})
${est.itensBaixos?.map(p => 
  `- ${p.code || p.id}: ${p.name} (qty: ${p.stock_quantity}, mín: ${p.min_stock || '-'})`
).join('\n') || 'Nenhum'}`);
  }

  // OS
  if (context.os) {
    sections.push(`## Ordens de Serviço
### OS Abertas (${context.os.abertas?.length || 0})
${context.os.abertas?.map(os => 
  `- OS #${os.order_number}: ${os.cliente_nome} (${os.created_at_formatted})`
).join('\n') || 'Nenhuma'}`);
  }

  // Detalhes de entidade específica
  if (context.entityDetails) {
    sections.push(`## Detalhes da Entidade (${context.entityDetails.type})
${JSON.stringify(context.entityDetails.data, null, 2)}`);
  }

  return sections.join('\n\n');
}
