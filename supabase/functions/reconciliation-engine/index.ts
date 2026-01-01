import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * CONCILIADOR BANCÁRIO MAX v4.0
 * 
 * Funcionalidades:
 * - Matching 1:1 (uma transação = um título)
 * - Matching 1:N (uma transação = vários títulos - aglutinação)
 * - Matching N:1 (várias transações = um título - parcelamento)
 * - Extração automática de nome do extrato
 * - Comparação com fornecedores cadastrados
 * - Confidence score para cada sugestão
 * - Regras de extrato para exceções
 * - Nunca executa sem confirmação do usuário
 */

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
}

interface FinancialEntry {
  id: string;
  amount: number;
  due_date: string;
  supplier_id?: string;
  customer_id?: string;
  entity_name?: string;
  document_number?: string;
  nosso_numero?: string;
  inter_nosso_numero?: string;
  type: 'receivable' | 'payable';
  description?: string;
}

interface Entity {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
}

interface SuggestionEntry {
  id: string;
  type: 'receivable' | 'payable';
  amount: number;
  amount_used: number;
  entity_name: string | null;
  due_date: string;
  document_number?: string;
}

interface Suggestion {
  transaction_id: string;
  transaction: BankTransaction;
  entries: SuggestionEntry[];
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  match_reasons: string[];
  match_type: 'exact_1_1' | 'aggregation_1_n' | 'name_match' | 'nosso_numero' | 'rule' | 'value_only';
  total_matched: number;
  difference: number;
  rule_id?: string;
  requires_review: boolean;
  extracted_name?: string;
  matched_entity?: string;
}

// Extrai o nome de pessoa/empresa da descrição do PIX/TED/etc
function extractNameFromDescription(description: string | null): string | null {
  if (!description) return null;
  
  let name: string | null = null;
  
  // Padrão 1: PIX com código e nome após hífen
  const pixPattern1 = /PIX\s+(?:ENVIADO|RECEBIDO)\s*-\s*(?:Cp\s*:?\s*)?[\d\-]*-?\s*(.+)/i;
  const match1 = description.match(pixPattern1);
  if (match1 && match1[1]) {
    name = match1[1].trim();
  }
  
  // Padrão 2: PIX direto com nome
  if (!name) {
    const pixPattern2 = /PIX\s+(?:ENVIADO|RECEBIDO)\s+(?:DE\s+|PARA\s+)?(.+)/i;
    const match2 = description.match(pixPattern2);
    if (match2 && match2[1]) {
      name = match2[1].replace(/^[\d\s\-:]+/, '').trim();
    }
  }
  
  // Padrão 3: TED com nome
  if (!name) {
    const tedPattern = /TED\s+[\d\s]+(.+)/i;
    const matchTed = description.match(tedPattern);
    if (matchTed && matchTed[1]) {
      name = matchTed[1].trim();
    }
  }
  
  // Padrão 4: Transferência com nome
  if (!name) {
    const transPattern = /TRANSF(?:ERENCIA)?\s+(?:PIX\s+)?(?:DE\s+|PARA\s+)?(.+)/i;
    const matchTrans = description.match(transPattern);
    if (matchTrans && matchTrans[1]) {
      name = matchTrans[1].replace(/^[\d\s\-:]+/, '').trim();
    }
  }
  
  // Padrão 5: PAG* (pagamentos)
  if (!name) {
    const pagPattern = /PAG\*(.+)/i;
    const matchPag = description.match(pagPattern);
    if (matchPag && matchPag[1]) {
      name = matchPag[1].trim();
    }
  }
  
  // Limpar o nome extraído
  if (name) {
    name = name.replace(/[\*\-\s]+$/, '').trim();
    name = name.replace(/\d{6,}/g, '').trim();
    name = name.replace(/\s+(LTDA|ME|EPP|EIRELI|S\/A|SA)\.?$/i, '').trim();
    if (name.length < 3) return null;
  }
  
  return name;
}

// Normaliza texto para comparação
function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calcula similaridade entre dois textos (0 a 1)
function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  if (norm1 === norm2) return 1;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.95;
  
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matchingWords = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || 
          (word1.length >= 4 && word2.length >= 4 && (word1.includes(word2) || word2.includes(word1)))) {
        matchingWords++;
        break;
      }
    }
  }
  
  return matchingWords / Math.max(words1.length, words2.length);
}

// Encontra a entidade que melhor corresponde ao nome extraído
function findMatchingEntity(extractedName: string, entities: Entity[]): { entity: Entity; similarity: number; matchedName: string } | null {
  if (!extractedName) return null;
  
  let bestMatch: { entity: Entity; similarity: number; matchedName: string } | null = null;
  
  for (const entity of entities) {
    if (entity.razao_social) {
      const sim = calculateSimilarity(extractedName, entity.razao_social);
      if (sim >= 0.5 && (!bestMatch || sim > bestMatch.similarity)) {
        bestMatch = { entity, similarity: sim, matchedName: entity.razao_social };
      }
    }
    
    if (entity.nome_fantasia) {
      const sim = calculateSimilarity(extractedName, entity.nome_fantasia);
      if (sim >= 0.5 && (!bestMatch || sim > bestMatch.similarity)) {
        bestMatch = { entity, similarity: sim, matchedName: entity.nome_fantasia };
      }
    }
  }
  
  return bestMatch;
}

// Encontra combinações de títulos que somam o valor da transação (1:N matching)
function findAggregations(
  targetAmount: number, 
  entries: FinancialEntry[], 
  maxEntries: number = 10,
  tolerance: number = 0.01
): FinancialEntry[][] {
  const results: FinancialEntry[][] = [];
  
  // Ordenar por valor decrescente para otimização
  const sortedEntries = [...entries].sort((a, b) => b.amount - a.amount);
  
  function backtrack(
    remaining: number, 
    startIndex: number, 
    currentCombination: FinancialEntry[]
  ) {
    // Encontrou combinação válida
    if (Math.abs(remaining) <= tolerance) {
      results.push([...currentCombination]);
      return;
    }
    
    // Limite de combinações encontradas
    if (results.length >= 5) return;
    
    // Limite de títulos por combinação
    if (currentCombination.length >= maxEntries) return;
    
    // Não tem mais títulos para tentar
    if (startIndex >= sortedEntries.length) return;
    
    // Valor restante é negativo (passou do valor)
    if (remaining < -tolerance) return;
    
    for (let i = startIndex; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      
      // Pular se o título sozinho já é maior que o restante
      if (entry.amount > remaining + tolerance) continue;
      
      currentCombination.push(entry);
      backtrack(remaining - entry.amount, i + 1, currentCombination);
      currentCombination.pop();
    }
  }
  
  backtrack(targetAmount, 0, []);
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { company_id, max_suggestions = 100, date_tolerance_days = 5 } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[reconciliation-engine] Iniciando análise para company: ${company_id}`);

    // 1. Buscar configurações de conciliação
    const { data: settings } = await supabase
      .from("reconciliation_settings")
      .select("*")
      .eq("company_id", company_id)
      .single();

    const dateTolerance = settings?.date_tolerance_days || date_tolerance_days;
    const valueTolerance = settings?.value_tolerance_percent || 0;

    // 2. Buscar transações não conciliadas
    const { data: transactions, error: txError } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_reconciled", false)
      .order("transaction_date", { ascending: false })
      .limit(500);

    if (txError) throw txError;
    console.log(`[reconciliation-engine] ${transactions?.length || 0} transações não conciliadas`);

    // 3. Buscar todas as entidades (fornecedores/clientes)
    const { data: pessoas } = await supabase
      .from("pessoas")
      .select("id, razao_social, nome_fantasia, cpf_cnpj")
      .eq("company_id", company_id);

    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, razao_social, nome_fantasia, cpf_cnpj")
      .eq("company_id", company_id);

    const allEntities: Entity[] = [...(pessoas || []), ...(clientes || [])];

    // 4. Buscar contas a pagar não pagas
    const { data: payablesData } = await supabase
      .from("payables")
      .select("*, pessoas:supplier_id(razao_social, nome_fantasia)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    const payables: FinancialEntry[] = (payablesData || []).map(p => ({
      id: p.id,
      amount: p.amount,
      due_date: p.due_date,
      supplier_id: p.supplier_id,
      entity_name: (p.pessoas as any)?.nome_fantasia || (p.pessoas as any)?.razao_social || null,
      document_number: p.document_number,
      nosso_numero: p.nosso_numero,
      description: p.description,
      type: 'payable' as const
    }));

    // 5. Buscar contas a receber não pagas
    const { data: receivablesData } = await supabase
      .from("accounts_receivable")
      .select("*, clientes(razao_social, nome_fantasia)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    const receivables: FinancialEntry[] = (receivablesData || []).map(r => ({
      id: r.id,
      amount: r.amount,
      due_date: r.due_date,
      customer_id: r.customer_id,
      entity_name: (r.clientes as any)?.nome_fantasia || (r.clientes as any)?.razao_social || null,
      document_number: r.document_number,
      inter_nosso_numero: r.inter_nosso_numero,
      description: r.description,
      type: 'receivable' as const
    }));

    console.log(`[reconciliation-engine] ${payables.length} contas a pagar, ${receivables.length} contas a receber`);

    // 6. Buscar regras de extrato
    const { data: rules } = await supabase
      .from("extract_rules")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true);

    const extractRules = rules || [];

    // 7. Processar cada transação
    const suggestions: Suggestion[] = [];
    const unmatchedTransactions: any[] = [];
    const usedEntryIds = new Set<string>(); // Para não sugerir o mesmo título duas vezes

    for (const tx of transactions || []) {
      const txAmount = Math.abs(tx.amount);
      const isDebit = tx.amount < 0;
      const entries = isDebit ? payables : receivables;
      const availableEntries = entries.filter(e => !usedEntryIds.has(e.id));
      
      let bestSuggestion: Suggestion | null = null;
      const allSuggestionsForTx: Suggestion[] = [];

      // ESTRATÉGIA 1: Match por NOSSO NÚMERO (boletos)
      if (tx.nsu || tx.description) {
        const searchIn = `${tx.nsu || ''} ${tx.description || ''}`;
        for (const entry of availableEntries) {
          const nossoNum = entry.nosso_numero || entry.inter_nosso_numero;
          if (nossoNum && searchIn.includes(nossoNum)) {
            const suggestion: Suggestion = {
              transaction_id: tx.id,
              transaction: tx,
              entries: [{
                id: entry.id,
                type: entry.type,
                amount: entry.amount,
                amount_used: entry.amount,
                entity_name: entry.entity_name || null,
                due_date: entry.due_date,
                document_number: entry.document_number
              }],
              confidence_score: 99,
              confidence_level: 'high',
              match_reasons: ['✓ Nosso número encontrado', `Nosso Nº: ${nossoNum}`],
              match_type: 'nosso_numero',
              total_matched: entry.amount,
              difference: Math.abs(txAmount - entry.amount),
              requires_review: false
            };
            allSuggestionsForTx.push(suggestion);
            break;
          }
        }
      }

      // ESTRATÉGIA 2: Extrair nome e buscar fornecedor
      const extractedName = extractNameFromDescription(tx.description);
      
      if (extractedName) {
        const entityMatch = findMatchingEntity(extractedName, allEntities);
        
        if (entityMatch && entityMatch.similarity >= 0.5) {
          // Buscar títulos dessa entidade
          const entityEntries = availableEntries.filter(e => 
            e.supplier_id === entityMatch.entity.id ||
            e.customer_id === entityMatch.entity.id
          );
          
          // 2a. Match 1:1 exato
          for (const entry of entityEntries) {
            const valueDiff = Math.abs(entry.amount - txAmount);
            if (valueDiff < 0.01) {
              const score = entityMatch.similarity >= 0.9 ? 98 : entityMatch.similarity >= 0.7 ? 92 : 85;
              const suggestion: Suggestion = {
                transaction_id: tx.id,
                transaction: tx,
                entries: [{
                  id: entry.id,
                  type: entry.type,
                  amount: entry.amount,
                  amount_used: entry.amount,
                  entity_name: entry.entity_name || entityMatch.matchedName,
                  due_date: entry.due_date,
                  document_number: entry.document_number
                }],
                confidence_score: score,
                confidence_level: 'high',
                match_reasons: [
                  `✓ Nome: "${extractedName}" → "${entityMatch.matchedName}"`,
                  `Similaridade: ${Math.round(entityMatch.similarity * 100)}%`,
                  '✓ Valor exato'
                ],
                match_type: 'exact_1_1',
                total_matched: entry.amount,
                difference: 0,
                requires_review: false,
                extracted_name: extractedName,
                matched_entity: entityMatch.matchedName
              };
              allSuggestionsForTx.push(suggestion);
              break;
            }
          }
          
          // 2b. Match 1:N (aglutinação) - vários títulos que somam o valor
          if (entityEntries.length > 1) {
            const aggregations = findAggregations(txAmount, entityEntries, 10, 0.01);
            
            for (const combo of aggregations) {
              if (combo.length > 1) {
                const totalMatched = combo.reduce((sum, e) => sum + e.amount, 0);
                const score = entityMatch.similarity >= 0.9 ? 92 : entityMatch.similarity >= 0.7 ? 85 : 75;
                
                const suggestion: Suggestion = {
                  transaction_id: tx.id,
                  transaction: tx,
                  entries: combo.map(e => ({
                    id: e.id,
                    type: e.type,
                    amount: e.amount,
                    amount_used: e.amount,
                    entity_name: e.entity_name || entityMatch.matchedName,
                    due_date: e.due_date,
                    document_number: e.document_number
                  })),
                  confidence_score: score,
                  confidence_level: score >= 90 ? 'high' : 'medium',
                  match_reasons: [
                    `✓ Nome: "${extractedName}" → "${entityMatch.matchedName}"`,
                    `✓ Aglutinação: ${combo.length} títulos`,
                    `Soma: R$ ${totalMatched.toFixed(2)}`
                  ],
                  match_type: 'aggregation_1_n',
                  total_matched: totalMatched,
                  difference: Math.abs(txAmount - totalMatched),
                  requires_review: true,
                  extracted_name: extractedName,
                  matched_entity: entityMatch.matchedName
                };
                allSuggestionsForTx.push(suggestion);
              }
            }
          }
        }
      }

      // ESTRATÉGIA 3: Match por valor exato (sem nome identificado)
      if (allSuggestionsForTx.length === 0) {
        for (const entry of availableEntries) {
          const valueDiff = Math.abs(entry.amount - txAmount);
          if (valueDiff < 0.01) {
            // Verificar se o nome do fornecedor NÃO conflita com a descrição
            if (extractedName && entry.entity_name) {
              const sim = calculateSimilarity(extractedName, entry.entity_name);
              if (sim < 0.3) {
                // Nomes muito diferentes - não sugerir
                continue;
              }
            }
            
            const suggestion: Suggestion = {
              transaction_id: tx.id,
              transaction: tx,
              entries: [{
                id: entry.id,
                type: entry.type,
                amount: entry.amount,
                amount_used: entry.amount,
                entity_name: entry.entity_name || null,
                due_date: entry.due_date,
                document_number: entry.document_number
              }],
              confidence_score: 60,
              confidence_level: 'low',
              match_reasons: [
                '✓ Valor exato',
                '? Nome não identificado na descrição'
              ],
              match_type: 'value_only',
              total_matched: entry.amount,
              difference: 0,
              requires_review: true
            };
            allSuggestionsForTx.push(suggestion);
            break;
          }
        }
      }

      // ESTRATÉGIA 4: Regras de extrato
      if (tx.description && allSuggestionsForTx.length === 0) {
        for (const rule of extractRules) {
          const normalizedDesc = normalizeText(tx.description);
          const normalizedSearch = normalizeText(rule.search_text);
          
          if (normalizedDesc.includes(normalizedSearch)) {
            if (rule.supplier_id) {
              const ruleEntries = availableEntries.filter(e => e.supplier_id === rule.supplier_id);
              
              for (const entry of ruleEntries) {
                const valueDiff = Math.abs(entry.amount - txAmount);
                if (valueDiff <= txAmount * 0.05) {
                  const suggestion: Suggestion = {
                    transaction_id: tx.id,
                    transaction: tx,
                    entries: [{
                      id: entry.id,
                      type: entry.type,
                      amount: entry.amount,
                      amount_used: entry.amount,
                      entity_name: entry.entity_name || null,
                      due_date: entry.due_date,
                      document_number: entry.document_number
                    }],
                    confidence_score: 95,
                    confidence_level: 'high',
                    match_reasons: [`✓ Regra: "${rule.search_text}"`, '✓ Fornecedor vinculado'],
                    match_type: 'rule',
                    total_matched: entry.amount,
                    difference: valueDiff,
                    rule_id: rule.id,
                    requires_review: false
                  };
                  allSuggestionsForTx.push(suggestion);
                  break;
                }
              }
            }
            break;
          }
        }
      }

      // Escolher a melhor sugestão para esta transação
      if (allSuggestionsForTx.length > 0) {
        // Ordenar por score e pegar a melhor
        allSuggestionsForTx.sort((a, b) => b.confidence_score - a.confidence_score);
        bestSuggestion = allSuggestionsForTx[0];
        
        // Marcar títulos como usados
        for (const entry of bestSuggestion.entries) {
          usedEntryIds.add(entry.id);
        }
        
        suggestions.push(bestSuggestion);
      } else {
        // Nenhuma sugestão - adicionar como exceção
        unmatchedTransactions.push({
          id: tx.id,
          date: tx.transaction_date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          extracted_name: extractedName
        });
      }
    }

    // Ordenar sugestões por confiança
    suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
    const limitedSuggestions = suggestions.slice(0, max_suggestions);

    // Calcular resumo
    const summary = {
      total_suggestions: limitedSuggestions.length,
      high_confidence: limitedSuggestions.filter(s => s.confidence_level === 'high').length,
      medium_confidence: limitedSuggestions.filter(s => s.confidence_level === 'medium').length,
      low_confidence: limitedSuggestions.filter(s => s.confidence_level === 'low').length,
      unmatched: unmatchedTransactions.length,
      transactions_analyzed: (transactions || []).length,
      rules_active: extractRules.length,
      aggregations_found: limitedSuggestions.filter(s => s.match_type === 'aggregation_1_n').length
    };

    console.log(`[reconciliation-engine] Resultado:`);
    console.log(`  - Alta confiança: ${summary.high_confidence}`);
    console.log(`  - Média confiança: ${summary.medium_confidence}`);
    console.log(`  - Baixa confiança: ${summary.low_confidence}`);
    console.log(`  - Aglutinações (1:N): ${summary.aggregations_found}`);
    console.log(`  - Exceções: ${summary.unmatched}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggestions: limitedSuggestions,
          unmatched_transactions: unmatchedTransactions,
          summary
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error("[reconciliation-engine] Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
