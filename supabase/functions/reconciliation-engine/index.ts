import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Motor de Conciliação - WeDo ERP
 * Baseado na lógica da Kamino
 * 
 * PRINCÍPIOS:
 * 1. Regras de Extrato - usuário define regras baseadas em texto
 * 2. Matching por Regra - se existe regra, concilia automaticamente
 * 3. Matching por Título - APENAS se valor EXATO e nome do fornecedor na descrição
 * 4. Exceções - tudo que não casa fica como exceção para revisão manual
 * 
 * NUNCA sugere match quando nomes são diferentes!
 */

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
  external_id: string | null;
}

interface FinancialEntry {
  id: string;
  amount: number;
  due_date: string;
  description: string | null;
  document_number: string | null;
  is_paid: boolean;
  type: 'receivable' | 'payable';
  entity_name: string | null;
  entity_document: string | null;
  inter_nosso_numero: string | null;
}

interface ExtractRule {
  id: string;
  search_text: string;
  supplier_id: string | null;
  supplier_name: string | null;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  is_active: boolean;
}

interface ReconciliationSuggestion {
  transaction_id: string;
  transaction: BankTransaction;
  entries: {
    id: string;
    type: 'receivable' | 'payable';
    amount: number;
    entity_name: string | null;
    due_date: string;
  }[];
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  match_reasons: string[];
  match_type: 'rule' | 'exact_value_name' | 'exact_value_only' | 'nosso_numero';
  total_matched: number;
  difference: number;
  rule_id?: string;
  requires_review: boolean;
}

// Normalização de texto para matching
function normalizeText(text: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Extrair nome de pessoa/empresa da descrição do PIX
function extractNameFromDescription(description: string | null): string | null {
  if (!description) return null;
  
  // Padrões comuns de PIX
  const patterns = [
    /pix\s+(?:enviado|recebido)\s*-?\s*(?:cp\s*:?\s*\d+\s*-?\s*)?(.+)/i,
    /transferencia\s+(?:pix|ted|doc)\s*-?\s*(.+)/i,
    /pagamento\s+(?:pix|boleto)\s*-?\s*(.+)/i,
    /pix\s+de\s+(.+)/i,
    /pix\s+para\s+(.+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

// Verificar se o nome do fornecedor está contido na descrição
function nameMatchesDescription(entityName: string | null, description: string | null): boolean {
  if (!entityName || !description) return false;
  
  const normalizedEntity = normalizeText(entityName);
  const normalizedDesc = normalizeText(description);
  
  // Match exato
  if (normalizedDesc.includes(normalizedEntity)) return true;
  
  // Match por tokens (pelo menos 2 palavras significativas)
  const entityTokens = normalizedEntity.split(/\s+/).filter(t => t.length > 2);
  const descTokens = normalizedDesc.split(/\s+/);
  
  let matchCount = 0;
  for (const token of entityTokens) {
    if (descTokens.some(dt => dt.includes(token) || token.includes(dt))) {
      matchCount++;
    }
  }
  
  // Precisa ter pelo menos 2 tokens ou 50% dos tokens do nome
  const minMatches = Math.max(2, Math.ceil(entityTokens.length * 0.5));
  return matchCount >= minMatches;
}

// Verificar se a regra de extrato casa com a transação
function ruleMatchesTransaction(rule: ExtractRule, description: string | null): boolean {
  if (!description || !rule.search_text) return false;
  
  const normalizedDesc = normalizeText(description);
  const normalizedSearch = normalizeText(rule.search_text);
  
  return normalizedDesc.includes(normalizedSearch);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, max_suggestions = 100 } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[reconciliation-engine] Iniciando análise para company: ${company_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar transações não conciliadas
    const { data: transactions, error: txError } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_reconciled", false)
      .order("transaction_date", { ascending: false })
      .limit(500);

    if (txError) throw txError;

    console.log(`[reconciliation-engine] ${transactions?.length || 0} transações não conciliadas`);

    // 2. Buscar regras de extrato ativas
    const { data: rules } = await supabase
      .from("extract_rules")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true);

    console.log(`[reconciliation-engine] ${rules?.length || 0} regras de extrato ativas`);

    // 3. Buscar títulos a receber não pagos
    const { data: receivables } = await supabase
      .from("accounts_receivable")
      .select("*, clientes(razao_social, nome_fantasia, cpf_cnpj)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    // 4. Buscar títulos a pagar não pagos
    const { data: payables } = await supabase
      .from("payables")
      .select("*, pessoas:supplier_id(razao_social, nome_fantasia, cpf_cnpj)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    // Mapear títulos financeiros
    const financialEntries: FinancialEntry[] = [
      ...(receivables || []).map(r => ({
        id: r.id,
        amount: r.amount,
        due_date: r.due_date,
        description: r.description,
        document_number: r.document_number,
        is_paid: r.is_paid || false,
        type: 'receivable' as const,
        entity_name: (r.clientes as Record<string, string>)?.nome_fantasia || 
                     (r.clientes as Record<string, string>)?.razao_social || null,
        entity_document: (r.clientes as Record<string, string>)?.cpf_cnpj || null,
        inter_nosso_numero: r.inter_nosso_numero,
      })),
      ...(payables || []).map(p => ({
        id: p.id,
        amount: p.amount,
        due_date: p.due_date,
        description: p.description,
        document_number: p.document_number,
        is_paid: p.is_paid || false,
        type: 'payable' as const,
        entity_name: (p.pessoas as Record<string, string>)?.nome_fantasia || 
                     (p.pessoas as Record<string, string>)?.razao_social || null,
        entity_document: (p.pessoas as Record<string, string>)?.cpf_cnpj || null,
        inter_nosso_numero: null,
      }))
    ];

    console.log(`[reconciliation-engine] ${financialEntries.length} títulos financeiros em aberto`);

    const suggestions: ReconciliationSuggestion[] = [];
    const unmatchedTransactions: BankTransaction[] = [];
    const ruleMatches: { transaction_id: string; rule_id: string }[] = [];

    // 5. Analisar cada transação
    for (const tx of transactions || []) {
      const isCredit = tx.type === "CREDIT" || tx.amount > 0;
      const txAmount = Math.abs(tx.amount);
      let matched = false;

      // 5.1 PRIMEIRO: Tentar match por REGRA DE EXTRATO
      if (rules && rules.length > 0) {
        for (const rule of rules) {
          if (ruleMatchesTransaction(rule, tx.description)) {
            console.log(`[reconciliation-engine] Regra "${rule.search_text}" casou com tx ${tx.id}`);
            
            // Regra casou - marcar para conciliação automática
            ruleMatches.push({ transaction_id: tx.id, rule_id: rule.id });
            
            suggestions.push({
              transaction_id: tx.id,
              transaction: tx,
              entries: [],
              confidence_score: 100,
              confidence_level: 'high',
              match_reasons: [`✓ Regra de extrato: "${rule.search_text}"`],
              match_type: 'rule',
              total_matched: txAmount,
              difference: 0,
              rule_id: rule.id,
              requires_review: false
            });
            
            matched = true;
            break;
          }
        }
      }

      if (matched) continue;

      // 5.2 SEGUNDO: Tentar match por NOSSO NÚMERO (boletos Inter)
      if (tx.nsu || tx.description) {
        for (const entry of financialEntries) {
          if (entry.inter_nosso_numero) {
            const searchIn = `${tx.nsu || ''} ${tx.description || ''}`;
            if (searchIn.includes(entry.inter_nosso_numero)) {
              console.log(`[reconciliation-engine] Nosso número ${entry.inter_nosso_numero} encontrado em tx ${tx.id}`);
              
              suggestions.push({
                transaction_id: tx.id,
                transaction: tx,
                entries: [{
                  id: entry.id,
                  type: entry.type,
                  amount: entry.amount,
                  entity_name: entry.entity_name,
                  due_date: entry.due_date
                }],
                confidence_score: 98,
                confidence_level: 'high',
                match_reasons: [`✓ Nosso número: ${entry.inter_nosso_numero}`],
                match_type: 'nosso_numero',
                total_matched: entry.amount,
                difference: txAmount - entry.amount,
                requires_review: false
              });
              
              matched = true;
              break;
            }
          }
        }
      }

      if (matched) continue;

      // 5.3 TERCEIRO: Tentar match por VALOR EXATO + NOME NA DESCRIÇÃO
      // Para débitos (saídas), buscar payables
      // Para créditos (entradas), buscar receivables
      const relevantEntries = financialEntries.filter(e => 
        isCredit ? e.type === 'receivable' : e.type === 'payable'
      );

      for (const entry of relevantEntries) {
        const amountDiff = Math.abs(txAmount - entry.amount);
        
        // Só considera se valor for EXATO (diferença < R$ 0.01)
        if (amountDiff >= 0.01) continue;
        
        // Verificar se o nome do fornecedor está na descrição
        const nameMatches = nameMatchesDescription(entry.entity_name, tx.description);
        
        if (nameMatches) {
          console.log(`[reconciliation-engine] Match exato com nome: tx ${tx.id} -> entry ${entry.id} (${entry.entity_name})`);
          
          suggestions.push({
            transaction_id: tx.id,
            transaction: tx,
            entries: [{
              id: entry.id,
              type: entry.type,
              amount: entry.amount,
              entity_name: entry.entity_name,
              due_date: entry.due_date
            }],
            confidence_score: 95,
            confidence_level: 'high',
            match_reasons: [
              '✓ Valor exato',
              `✓ Nome "${entry.entity_name}" encontrado na descrição`
            ],
            match_type: 'exact_value_name',
            total_matched: entry.amount,
            difference: 0,
            requires_review: false
          });
          
          matched = true;
          break;
        }
      }

      if (matched) continue;

      // 5.4 QUARTO: Match por VALOR EXATO apenas (baixa confiança)
      // Só sugere se não tem nome diferente na descrição
      const extractedName = extractNameFromDescription(tx.description);
      
      for (const entry of relevantEntries) {
        const amountDiff = Math.abs(txAmount - entry.amount);
        
        // Só considera se valor for EXATO
        if (amountDiff >= 0.01) continue;
        
        // Se extraiu um nome da descrição e é diferente do fornecedor, REJEITAR
        if (extractedName && entry.entity_name) {
          const normalizedExtracted = normalizeText(extractedName);
          const normalizedEntity = normalizeText(entry.entity_name);
          
          // Verificar se os nomes são completamente diferentes
          const entityTokens = normalizedEntity.split(/\s+/).filter(t => t.length > 2);
          const extractedTokens = normalizedExtracted.split(/\s+/).filter(t => t.length > 2);
          
          let anyMatch = false;
          for (const et of entityTokens) {
            for (const xt of extractedTokens) {
              if (et.includes(xt) || xt.includes(et)) {
                anyMatch = true;
                break;
              }
            }
            if (anyMatch) break;
          }
          
          if (!anyMatch) {
            // Nomes são completamente diferentes - NÃO SUGERIR
            console.log(`[reconciliation-engine] REJEITADO: Nome "${extractedName}" diferente de "${entry.entity_name}"`);
            continue;
          }
        }
        
        // Valor exato sem nome identificado - baixa confiança
        console.log(`[reconciliation-engine] Match por valor exato apenas: tx ${tx.id} -> entry ${entry.id}`);
        
        suggestions.push({
          transaction_id: tx.id,
          transaction: tx,
          entries: [{
            id: entry.id,
            type: entry.type,
            amount: entry.amount,
            entity_name: entry.entity_name,
            due_date: entry.due_date
          }],
          confidence_score: 60,
          confidence_level: 'low',
          match_reasons: [
            '✓ Valor exato',
            '? Nome não identificado na descrição'
          ],
          match_type: 'exact_value_only',
          total_matched: entry.amount,
          difference: 0,
          requires_review: true
        });
        
        matched = true;
        break;
      }

      // 5.5 Se não encontrou match, adicionar como exceção
      if (!matched) {
        unmatchedTransactions.push(tx);
      }
    }

    // 6. Ordenar sugestões por confiança
    suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
    const limitedSuggestions = suggestions.slice(0, max_suggestions);

    // 7. Categorizar por nível de confiança
    const highConfidence = limitedSuggestions.filter(s => s.confidence_level === 'high');
    const mediumConfidence = limitedSuggestions.filter(s => s.confidence_level === 'medium');
    const lowConfidence = limitedSuggestions.filter(s => s.confidence_level === 'low');

    console.log(`[reconciliation-engine] Resultado:`);
    console.log(`  - Alta confiança: ${highConfidence.length}`);
    console.log(`  - Média confiança: ${mediumConfidence.length}`);
    console.log(`  - Baixa confiança: ${lowConfidence.length}`);
    console.log(`  - Sem match (exceções): ${unmatchedTransactions.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggestions: limitedSuggestions,
          unmatched_transactions: unmatchedTransactions.map(tx => ({
            id: tx.id,
            date: tx.transaction_date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type
          })),
          rule_matches: ruleMatches,
          summary: {
            total_suggestions: limitedSuggestions.length,
            high_confidence: highConfidence.length,
            medium_confidence: mediumConfidence.length,
            low_confidence: lowConfidence.length,
            unmatched: unmatchedTransactions.length,
            transactions_analyzed: transactions?.length || 0,
            rules_active: rules?.length || 0
          }
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[reconciliation-engine] Erro:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
