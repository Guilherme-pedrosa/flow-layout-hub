import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Motor de Conciliação v3.0 - WeDo ERP
 * 
 * LÓGICA PRINCIPAL:
 * 1. Extrai automaticamente o nome de pessoa/empresa da descrição do extrato
 * 2. Compara com os fornecedores/clientes cadastrados no sistema
 * 3. Se encontrar match de nome + valor próximo, sugere conciliação
 * 4. Regras de extrato são apenas para exceções (nomes diferentes do cadastro)
 * 
 * NUNCA sugere match quando nomes são claramente diferentes!
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
}

interface Entity {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
}

interface Suggestion {
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
  match_type: 'name_match' | 'nosso_numero' | 'rule' | 'exact_value';
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
  // Ex: "PIX ENVIADO - Cp :08561701-Danilo Rosa de Jesus"
  // Ex: "PIX RECEBIDO - Cp :12345678-Maria Silva Santos"
  const pixPattern1 = /PIX\s+(?:ENVIADO|RECEBIDO)\s*-\s*(?:Cp\s*:?\s*)?[\d\-]*-?\s*(.+)/i;
  const match1 = description.match(pixPattern1);
  if (match1 && match1[1]) {
    name = match1[1].trim();
  }
  
  // Padrão 2: PIX direto com nome
  // Ex: "PIX ENVIADO DANILO ROSA"
  if (!name) {
    const pixPattern2 = /PIX\s+(?:ENVIADO|RECEBIDO)\s+(?:DE\s+|PARA\s+)?(.+)/i;
    const match2 = description.match(pixPattern2);
    if (match2 && match2[1]) {
      name = match2[1].replace(/^[\d\s\-:]+/, '').trim();
    }
  }
  
  // Padrão 3: TED com nome
  // Ex: "TED 123456 JOAO SILVA"
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
  
  // Padrão 6: Pagamento de boleto
  if (!name) {
    const boletoPattern = /(?:PGTO|PAGAMENTO)\s+(?:BOLETO\s+)?(.+)/i;
    const matchBoleto = description.match(boletoPattern);
    if (matchBoleto && matchBoleto[1]) {
      name = matchBoleto[1].replace(/^[\d\s\-:]+/, '').trim();
    }
  }
  
  // Limpar o nome extraído
  if (name) {
    // Remove caracteres especiais do final
    name = name.replace(/[\*\-\s]+$/, '').trim();
    // Remove códigos numéricos longos (mais de 6 dígitos)
    name = name.replace(/\d{6,}/g, '').trim();
    // Remove "LTDA", "ME", "EIRELI" etc do final para comparação
    name = name.replace(/\s+(LTDA|ME|EPP|EIRELI|S\/A|SA)\.?$/i, '').trim();
    // Se ficou muito curto (menos de 3 caracteres), ignora
    if (name.length < 3) return null;
  }
  
  return name;
}

// Normaliza texto para comparação
function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^A-Z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();
}

// Calcula similaridade entre dois textos (0 a 1)
function calculateSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  // Match exato
  if (norm1 === norm2) return 1;
  
  // Um contém o outro completamente
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.95;
  
  // Verifica palavras em comum
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matchingWords = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      // Match exato de palavra ou uma contém a outra
      if (word1 === word2 || 
          (word1.length >= 4 && word2.length >= 4 && (word1.includes(word2) || word2.includes(word1)))) {
        matchingWords++;
        break;
      }
    }
  }
  
  // Calcula score baseado em quantas palavras casaram
  const maxWords = Math.max(words1.length, words2.length);
  const similarity = matchingWords / maxWords;
  
  return similarity;
}

// Encontra a entidade (fornecedor/cliente) que melhor corresponde ao nome extraído
function findMatchingEntity(extractedName: string, entities: Entity[]): { entity: Entity; similarity: number; matchedName: string } | null {
  if (!extractedName) return null;
  
  let bestMatch: { entity: Entity; similarity: number; matchedName: string } | null = null;
  
  for (const entity of entities) {
    // Compara com razão social
    if (entity.razao_social) {
      const sim = calculateSimilarity(extractedName, entity.razao_social);
      if (sim >= 0.5 && (!bestMatch || sim > bestMatch.similarity)) {
        bestMatch = { entity, similarity: sim, matchedName: entity.razao_social };
      }
    }
    
    // Compara com nome fantasia
    if (entity.nome_fantasia) {
      const sim = calculateSimilarity(extractedName, entity.nome_fantasia);
      if (sim >= 0.5 && (!bestMatch || sim > bestMatch.similarity)) {
        bestMatch = { entity, similarity: sim, matchedName: entity.nome_fantasia };
      }
    }
  }
  
  return bestMatch;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { company_id, max_suggestions = 100 } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[reconciliation-engine] Iniciando análise para company: ${company_id}`);

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

    // 2. Buscar todas as pessoas (fornecedores/clientes) da empresa
    const { data: pessoas, error: pessoasError } = await supabase
      .from("pessoas")
      .select("id, razao_social, nome_fantasia, cpf_cnpj")
      .eq("company_id", company_id);

    if (pessoasError) throw pessoasError;
    
    // 3. Buscar clientes também
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, razao_social, nome_fantasia, cpf_cnpj")
      .eq("company_id", company_id);

    if (clientesError) throw clientesError;

    const allEntities: Entity[] = [
      ...(pessoas || []),
      ...(clientes || [])
    ];
    console.log(`[reconciliation-engine] ${allEntities.length} entidades cadastradas`);

    // 4. Buscar contas a pagar não pagas
    const { data: payablesData, error: payError } = await supabase
      .from("payables")
      .select("*, pessoas:supplier_id(razao_social, nome_fantasia)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    if (payError) throw payError;

    const payables: FinancialEntry[] = (payablesData || []).map(p => ({
      id: p.id,
      amount: p.amount,
      due_date: p.due_date,
      supplier_id: p.supplier_id,
      entity_name: (p.pessoas as any)?.nome_fantasia || (p.pessoas as any)?.razao_social || null,
      document_number: p.document_number,
      nosso_numero: p.nosso_numero,
      type: 'payable' as const
    }));

    // 5. Buscar contas a receber não pagas
    const { data: receivablesData, error: recError } = await supabase
      .from("accounts_receivable")
      .select("*, clientes(razao_social, nome_fantasia)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    if (recError) throw recError;

    const receivables: FinancialEntry[] = (receivablesData || []).map(r => ({
      id: r.id,
      amount: r.amount,
      due_date: r.due_date,
      customer_id: r.customer_id,
      entity_name: (r.clientes as any)?.nome_fantasia || (r.clientes as any)?.razao_social || null,
      document_number: r.document_number,
      inter_nosso_numero: r.inter_nosso_numero,
      type: 'receivable' as const
    }));

    console.log(`[reconciliation-engine] ${payables.length} contas a pagar, ${receivables.length} contas a receber`);

    // 6. Buscar regras de extrato (para exceções)
    const { data: rules } = await supabase
      .from("extract_rules")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true);

    const extractRules = rules || [];
    console.log(`[reconciliation-engine] ${extractRules.length} regras de extrato`);

    // 7. Processar cada transação
    const suggestions: Suggestion[] = [];
    const unmatchedTransactions: any[] = [];

    for (const tx of transactions || []) {
      const txAmount = Math.abs(tx.amount);
      const isDebit = tx.amount < 0; // Débito = pagamento (contas a pagar)
      const isCredit = tx.amount > 0; // Crédito = recebimento (contas a receber)
      
      const entries = isDebit ? payables : receivables;
      
      let bestMatch: Suggestion | null = null;
      
      // ESTRATÉGIA 1: Match por NOSSO NÚMERO (boletos)
      if (tx.nsu || tx.description) {
        const searchIn = `${tx.nsu || ''} ${tx.description || ''}`;
        for (const entry of entries) {
          const nossoNum = entry.nosso_numero || entry.inter_nosso_numero;
          if (nossoNum && searchIn.includes(nossoNum)) {
            console.log(`[reconciliation-engine] Match por nosso número: ${nossoNum}`);
            bestMatch = {
              transaction_id: tx.id,
              transaction: tx,
              entries: [{
                id: entry.id,
                type: entry.type,
                amount: entry.amount,
                entity_name: entry.entity_name || null,
                due_date: entry.due_date
              }],
              confidence_score: 99,
              confidence_level: 'high',
              match_reasons: ['✓ Nosso número encontrado', `Nosso Nº: ${nossoNum}`],
              match_type: 'nosso_numero',
              total_matched: entry.amount,
              difference: Math.abs(txAmount - entry.amount),
              requires_review: false
            };
            break;
          }
        }
      }
      
      if (bestMatch) {
        suggestions.push(bestMatch);
        continue;
      }

      // ESTRATÉGIA 2: Extrair nome da descrição e comparar com entidades cadastradas
      const extractedName = extractNameFromDescription(tx.description);
      
      if (extractedName) {
        console.log(`[reconciliation-engine] Nome extraído: "${extractedName}"`);
        
        const entityMatch = findMatchingEntity(extractedName, allEntities);
        
        if (entityMatch && entityMatch.similarity >= 0.5) {
          console.log(`[reconciliation-engine] Entidade encontrada: "${entityMatch.matchedName}" (${Math.round(entityMatch.similarity * 100)}%)`);
          
          // Buscar títulos dessa entidade
          const entityEntries = entries.filter(e => 
            e.supplier_id === entityMatch.entity.id ||
            e.customer_id === entityMatch.entity.id
          );
          
          // Buscar título com valor mais próximo
          let bestEntry: FinancialEntry | null = null;
          let bestValueDiff = Infinity;
          
          for (const entry of entityEntries) {
            const valueDiff = Math.abs(entry.amount - txAmount);
            const tolerance = txAmount * 0.05; // 5% de tolerância
            
            if (valueDiff <= tolerance && valueDiff < bestValueDiff) {
              bestEntry = entry;
              bestValueDiff = valueDiff;
            }
          }
          
          if (bestEntry) {
            const exactValue = bestValueDiff < 0.01;
            const nameSimilarity = entityMatch.similarity;
            
            // Calcular score baseado em similaridade do nome e valor
            let score = 0;
            if (exactValue && nameSimilarity >= 0.9) score = 98;
            else if (exactValue && nameSimilarity >= 0.7) score = 92;
            else if (exactValue && nameSimilarity >= 0.5) score = 85;
            else if (nameSimilarity >= 0.9) score = 80;
            else if (nameSimilarity >= 0.7) score = 70;
            else score = 60;
            
            bestMatch = {
              transaction_id: tx.id,
              transaction: tx,
              entries: [{
                id: bestEntry.id,
                type: bestEntry.type,
                amount: bestEntry.amount,
                entity_name: bestEntry.entity_name || entityMatch.matchedName,
                due_date: bestEntry.due_date
              }],
              confidence_score: score,
              confidence_level: score >= 90 ? 'high' : score >= 70 ? 'medium' : 'low',
              match_reasons: [
                `✓ Nome extraído: "${extractedName}"`,
                `✓ Fornecedor: "${entityMatch.matchedName}"`,
                `Similaridade: ${Math.round(nameSimilarity * 100)}%`,
                exactValue ? '✓ Valor exato' : `Diferença: R$ ${bestValueDiff.toFixed(2)}`
              ],
              match_type: 'name_match',
              total_matched: bestEntry.amount,
              difference: bestValueDiff,
              requires_review: score < 90,
              extracted_name: extractedName,
              matched_entity: entityMatch.matchedName
            };
          }
        }
      }
      
      if (bestMatch) {
        suggestions.push(bestMatch);
        continue;
      }

      // ESTRATÉGIA 3: Verificar regras de extrato (para exceções)
      if (tx.description) {
        for (const rule of extractRules) {
          const normalizedDesc = normalizeText(tx.description);
          const normalizedSearch = normalizeText(rule.search_text);
          
          if (normalizedDesc.includes(normalizedSearch)) {
            console.log(`[reconciliation-engine] Regra de extrato casou: "${rule.search_text}"`);
            
            // Se a regra tem supplier_id, buscar títulos desse fornecedor
            if (rule.supplier_id) {
              const ruleEntries = entries.filter(e => e.supplier_id === rule.supplier_id);
              
              for (const entry of ruleEntries) {
                const valueDiff = Math.abs(entry.amount - txAmount);
                if (valueDiff <= txAmount * 0.05) {
                  bestMatch = {
                    transaction_id: tx.id,
                    transaction: tx,
                    entries: [{
                      id: entry.id,
                      type: entry.type,
                      amount: entry.amount,
                      entity_name: entry.entity_name || null,
                      due_date: entry.due_date
                    }],
                    confidence_score: 95,
                    confidence_level: 'high',
                    match_reasons: [`✓ Regra de extrato: "${rule.search_text}"`, '✓ Fornecedor vinculado'],
                    match_type: 'rule',
                    total_matched: entry.amount,
                    difference: valueDiff,
                    rule_id: rule.id,
                    requires_review: false
                  };
                  break;
                }
              }
            } else {
              // Regra sem fornecedor vinculado - apenas categorização
              bestMatch = {
                transaction_id: tx.id,
                transaction: tx,
                entries: [],
                confidence_score: 80,
                confidence_level: 'medium',
                match_reasons: [`✓ Regra de extrato: "${rule.search_text}"`, '? Sem fornecedor vinculado'],
                match_type: 'rule',
                total_matched: 0,
                difference: txAmount,
                rule_id: rule.id,
                requires_review: true
              };
            }
            break;
          }
        }
      }
      
      if (bestMatch) {
        suggestions.push(bestMatch);
        continue;
      }

      // Não encontrou match - adicionar como exceção
      unmatchedTransactions.push({
        id: tx.id,
        date: tx.transaction_date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        extracted_name: extractedName
      });
    }

    // Ordenar sugestões por confiança
    suggestions.sort((a, b) => b.confidence_score - a.confidence_score);

    // Limitar número de sugestões
    const limitedSuggestions = suggestions.slice(0, max_suggestions);

    // Calcular resumo
    const summary = {
      total_suggestions: limitedSuggestions.length,
      high_confidence: limitedSuggestions.filter(s => s.confidence_level === 'high').length,
      medium_confidence: limitedSuggestions.filter(s => s.confidence_level === 'medium').length,
      low_confidence: limitedSuggestions.filter(s => s.confidence_level === 'low').length,
      unmatched: unmatchedTransactions.length,
      transactions_analyzed: (transactions || []).length,
      rules_active: extractRules.length
    };

    console.log(`[reconciliation-engine] Resultado:`);
    console.log(`  - Alta confiança: ${summary.high_confidence}`);
    console.log(`  - Média confiança: ${summary.medium_confidence}`);
    console.log(`  - Baixa confiança: ${summary.low_confidence}`);
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

  } catch (error) {
    console.error("[reconciliation-engine] Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
