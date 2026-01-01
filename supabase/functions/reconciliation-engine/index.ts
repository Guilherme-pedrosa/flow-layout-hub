import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Motor de Conciliação Inteligente v2.0 - WAI ERP
 * Baseado em referências: Kamino, Dynamics 365, Cashbook
 * 
 * Características:
 * - Matching 1:1, 1:N (aglutinação), N:1 (pagamento parcelado)
 * - Pesos configuráveis por critério
 * - Níveis de confiança: Alta (≥90), Média (70-89), Baixa (<70)
 * - NUNCA executa conciliação automática sem confirmação humana
 * - Processa tanto créditos (recebimentos) quanto débitos (pagamentos)
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
  raw_data: Record<string, unknown> | null;
  category: string | null;
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
  inter_boleto_id: string | null;
  pix_key: string | null;
  payment_date: string | null;
}

interface MatchingConfig {
  // Pesos para cada critério (total deve dar ~100)
  peso_valor_exato: number;
  peso_valor_proximo: number;
  peso_data_exata: number;
  peso_data_proxima: number;
  peso_nome_completo: number;
  peso_nome_parcial: number;
  peso_documento: number;
  peso_nosso_numero: number;
  peso_chave_pix: number;
  peso_numero_documento: number;
  
  // Tolerâncias
  tolerancia_valor_percentual: number; // ex: 0.05 = 5%
  tolerancia_valor_absoluto: number;   // ex: 10.00 = R$ 10
  tolerancia_dias: number;             // ex: 7 = 7 dias
  
  // Scores mínimos
  score_minimo_sugestao: number;       // ex: 40
  score_alta_confianca: number;        // ex: 90
  score_media_confianca: number;       // ex: 70
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
  match_type: 'exact' | 'aggregation' | 'partial' | 'split';
  total_matched: number;
  difference: number;
  requires_review: boolean;
}

// Configuração padrão de pesos (baseada em melhores práticas)
const defaultConfig: MatchingConfig = {
  peso_valor_exato: 40,
  peso_valor_proximo: 30,
  peso_data_exata: 15,
  peso_data_proxima: 10,
  peso_nome_completo: 15,
  peso_nome_parcial: 8,
  peso_documento: 20,
  peso_nosso_numero: 25,
  peso_chave_pix: 20,
  peso_numero_documento: 15,
  tolerancia_valor_percentual: 0.02, // 2%
  tolerancia_valor_absoluto: 5.00,   // R$ 5
  tolerancia_dias: 7,
  score_minimo_sugestao: 45,
  score_alta_confianca: 90,
  score_media_confianca: 70,
};

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

// Normalização de documento (CPF/CNPJ)
function normalizeDocument(doc: string | null): string {
  return doc?.replace(/\D/g, '') || '';
}

// Extrair possíveis documentos da descrição
function extractDocumentsFromText(text: string): string[] {
  if (!text) return [];
  const docs: string[] = [];
  
  // CPF: 11 dígitos
  const cpfMatches = text.match(/\d{11}/g);
  if (cpfMatches) docs.push(...cpfMatches);
  
  // CNPJ: 14 dígitos
  const cnpjMatches = text.match(/\d{14}/g);
  if (cnpjMatches) docs.push(...cnpjMatches);
  
  return docs;
}

// Calcular score de valor
function calculateValueScore(
  txAmount: number, 
  entryAmount: number, 
  config: MatchingConfig
): { score: number; reason: string; isValid: boolean } {
  const diff = Math.abs(txAmount - entryAmount);
  const percentDiff = diff / Math.max(entryAmount, 0.01);
  
  // Valor exato (diferença < 1 centavo)
  if (diff < 0.01) {
    return { score: config.peso_valor_exato, reason: '✓ Valor exato', isValid: true };
  }
  
  // Valor muito próximo (diferença de centavos, até R$ 1)
  if (diff <= 1) {
    return { score: config.peso_valor_exato - 5, reason: '✓ Valor muito próximo (centavos)', isValid: true };
  }
  
  // Dentro da tolerância percentual E absoluta
  if (percentDiff <= config.tolerancia_valor_percentual && diff <= config.tolerancia_valor_absoluto) {
    return { score: config.peso_valor_proximo, reason: `✓ Valor dentro da tolerância (${(percentDiff * 100).toFixed(1)}%)`, isValid: true };
  }
  
  // Dentro apenas da tolerância percentual (até 5%)
  if (percentDiff <= 0.05) {
    return { score: config.peso_valor_proximo - 10, reason: `~ Valor próximo (${(percentDiff * 100).toFixed(1)}% diferença)`, isValid: true };
  }
  
  // Dentro de 10% - ainda válido mas com score baixo
  if (percentDiff <= 0.10) {
    return { score: 15, reason: `~ Valor com diferença moderada (${(percentDiff * 100).toFixed(1)}%)`, isValid: true };
  }
  
  // Fora da tolerância - inválido
  return { score: 0, reason: 'Valores incompatíveis', isValid: false };
}

// Calcular score de data
function calculateDateScore(
  txDate: string, 
  entryDate: string, 
  config: MatchingConfig
): { score: number; reason: string } {
  const d1 = new Date(txDate);
  const d2 = new Date(entryDate);
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return { score: config.peso_data_exata, reason: '✓ Mesma data' };
  }
  if (diffDays <= 1) {
    return { score: config.peso_data_exata - 2, reason: '✓ Data muito próxima (1 dia)' };
  }
  if (diffDays <= 3) {
    return { score: config.peso_data_proxima, reason: '✓ Data próxima (até 3 dias)' };
  }
  if (diffDays <= config.tolerancia_dias) {
    return { score: config.peso_data_proxima - 5, reason: `~ Data dentro da tolerância (${Math.round(diffDays)} dias)` };
  }
  if (diffDays <= 15) {
    return { score: 3, reason: `~ Data distante (${Math.round(diffDays)} dias)` };
  }
  
  return { score: 0, reason: '' };
}

// Calcular score de nome/entidade
function calculateNameScore(
  txDescription: string | null,
  entityName: string | null,
  config: MatchingConfig
): { score: number; reason: string } {
  if (!txDescription || !entityName) return { score: 0, reason: '' };
  
  const descNorm = normalizeText(txDescription);
  const nameNorm = normalizeText(entityName);
  
  if (!descNorm || !nameNorm) return { score: 0, reason: '' };
  
  // Nome completo encontrado
  if (descNorm.includes(nameNorm)) {
    return { score: config.peso_nome_completo, reason: '✓ Nome completo encontrado' };
  }
  
  // Verificar tokens do nome (palavras com mais de 3 caracteres)
  const nameTokens = nameNorm.split(/\s+/).filter(t => t.length > 3);
  if (nameTokens.length === 0) return { score: 0, reason: '' };
  
  const matchedTokens = nameTokens.filter(t => descNorm.includes(t));
  const matchRatio = matchedTokens.length / nameTokens.length;
  
  if (matchRatio >= 0.7) {
    return { score: config.peso_nome_completo - 3, reason: `✓ Nome encontrado (${matchedTokens.length}/${nameTokens.length} palavras)` };
  }
  if (matchRatio >= 0.5) {
    return { score: config.peso_nome_parcial, reason: `~ Nome parcial (${matchedTokens.length}/${nameTokens.length} palavras)` };
  }
  if (matchedTokens.length >= 1) {
    return { score: config.peso_nome_parcial - 3, reason: `~ ${matchedTokens.length} palavra(s) do nome` };
  }
  
  return { score: 0, reason: '' };
}

// Calcular score de documento (CPF/CNPJ)
function calculateDocumentScore(
  txDescription: string | null,
  entityDocument: string | null,
  config: MatchingConfig
): { score: number; reason: string } {
  if (!txDescription || !entityDocument) return { score: 0, reason: '' };
  
  const docNorm = normalizeDocument(entityDocument);
  if (docNorm.length < 11) return { score: 0, reason: '' };
  
  // Verificar se documento está na descrição
  const descClean = txDescription.replace(/\D/g, '');
  if (descClean.includes(docNorm)) {
    return { score: config.peso_documento, reason: '✓ CPF/CNPJ encontrado' };
  }
  
  // Verificar documentos extraídos da descrição
  const extractedDocs = extractDocumentsFromText(txDescription);
  if (extractedDocs.includes(docNorm)) {
    return { score: config.peso_documento, reason: '✓ CPF/CNPJ identificado' };
  }
  
  return { score: 0, reason: '' };
}

// Calcular score de identificadores específicos (nosso número, boleto, PIX)
function calculateIdentifierScore(
  tx: BankTransaction,
  entry: FinancialEntry,
  config: MatchingConfig
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const descNorm = normalizeText(tx.description);
  
  // Nosso número (boleto Inter)
  if (entry.inter_nosso_numero) {
    if (tx.nsu?.includes(entry.inter_nosso_numero) || 
        entry.inter_nosso_numero.includes(tx.nsu || '')) {
      score += config.peso_nosso_numero;
      reasons.push('✓ Nosso número do boleto');
    } else if (tx.description?.includes(entry.inter_nosso_numero)) {
      score += config.peso_nosso_numero - 5;
      reasons.push('✓ Nosso número na descrição');
    }
  }
  
  // Chave PIX
  if (entry.pix_key && tx.description) {
    const pixNorm = normalizeText(entry.pix_key);
    if (descNorm.includes(pixNorm)) {
      score += config.peso_chave_pix;
      reasons.push('✓ Chave PIX encontrada');
    }
  }
  
  // Número do documento
  if (entry.document_number && tx.description) {
    if (tx.description.includes(entry.document_number)) {
      score += config.peso_numero_documento;
      reasons.push('✓ Número do documento');
    }
  }
  
  return { score, reasons };
}

// Motor principal de matching para uma transação vs um título
function calculateMatchScore(
  tx: BankTransaction,
  entry: FinancialEntry,
  config: MatchingConfig
): { score: number; reasons: string[]; isValid: boolean } {
  const reasons: string[] = [];
  let totalScore = 0;
  
  const txAmount = Math.abs(tx.amount);
  
  // 1. Score de valor (obrigatório)
  const valueResult = calculateValueScore(txAmount, entry.amount, config);
  if (!valueResult.isValid) {
    return { score: 0, reasons: [valueResult.reason], isValid: false };
  }
  totalScore += valueResult.score;
  if (valueResult.reason) reasons.push(valueResult.reason);
  
  // 2. Score de data
  const dateResult = calculateDateScore(tx.transaction_date, entry.due_date, config);
  totalScore += dateResult.score;
  if (dateResult.reason) reasons.push(dateResult.reason);
  
  // 3. Score de nome/entidade
  const nameResult = calculateNameScore(tx.description, entry.entity_name, config);
  totalScore += nameResult.score;
  if (nameResult.reason) reasons.push(nameResult.reason);
  
  // 4. Score de documento
  const docResult = calculateDocumentScore(tx.description, entry.entity_document, config);
  totalScore += docResult.score;
  if (docResult.reason) reasons.push(docResult.reason);
  
  // 5. Score de identificadores específicos
  const idResult = calculateIdentifierScore(tx, entry, config);
  totalScore += idResult.score;
  reasons.push(...idResult.reasons);
  
  // Limitar a 100
  const finalScore = Math.min(100, totalScore);
  
  return { score: finalScore, reasons, isValid: true };
}

// Encontrar combinações de títulos que somam o valor (aglutinação 1:N)
function findAggregations(
  targetAmount: number,
  entries: FinancialEntry[],
  config: MatchingConfig,
  maxItems: number = 8
): FinancialEntry[][] {
  const results: FinancialEntry[][] = [];
  const tolerance = Math.max(
    targetAmount * config.tolerancia_valor_percentual,
    config.tolerancia_valor_absoluto
  );
  
  // Ordenar por valor decrescente para otimização
  const sorted = [...entries].sort((a, b) => b.amount - a.amount);
  
  const backtrack = (start: number, remaining: number, current: FinancialEntry[]) => {
    // Encontrou combinação válida
    if (Math.abs(remaining) <= tolerance && current.length >= 2) {
      results.push([...current]);
      return;
    }
    
    // Limite de itens ou valor negativo demais
    if (current.length >= maxItems || remaining < -tolerance) return;
    
    // Limite de resultados
    if (results.length >= 10) return;
    
    for (let i = start; i < sorted.length; i++) {
      // Poda: se o item é maior que o restante + tolerância, pular
      if (sorted[i].amount > remaining + tolerance) continue;
      
      current.push(sorted[i]);
      backtrack(i + 1, remaining - sorted[i].amount, current);
      current.pop();
    }
  };
  
  backtrack(0, targetAmount, []);
  return results;
}

// Determinar nível de confiança
function getConfidenceLevel(score: number, config: MatchingConfig): 'high' | 'medium' | 'low' {
  if (score >= config.score_alta_confianca) return 'high';
  if (score >= config.score_media_confianca) return 'medium';
  return 'low';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      company_id,
      config: userConfig,
      date_from,
      date_to,
      max_suggestions = 100,
      include_low_confidence = true,
      transaction_type = 'all' // 'all', 'credit', 'debit'
    } = body;

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    // Mesclar configuração do usuário com padrão
    const config: MatchingConfig = { ...defaultConfig, ...userConfig };

    console.log(`[reconciliation-engine v2] Iniciando para company: ${company_id}`);
    console.log(`[reconciliation-engine v2] Config: score_minimo=${config.score_minimo_sugestao}, alta=${config.score_alta_confianca}, media=${config.score_media_confianca}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar transações não conciliadas
    let txQuery = supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_reconciled", false)
      .order("transaction_date", { ascending: false })
      .limit(500);

    if (date_from) txQuery = txQuery.gte("transaction_date", date_from);
    if (date_to) txQuery = txQuery.lte("transaction_date", date_to);
    
    // Filtrar por tipo se especificado
    if (transaction_type === 'credit') {
      txQuery = txQuery.gt("amount", 0);
    } else if (transaction_type === 'debit') {
      txQuery = txQuery.lt("amount", 0);
    }

    const { data: transactions, error: txError } = await txQuery;
    if (txError) throw txError;

    console.log(`[reconciliation-engine v2] ${transactions?.length || 0} transações não conciliadas`);

    // 2. Buscar contas a receber não pagas (para créditos)
    const { data: receivables, error: recError } = await supabase
      .from("accounts_receivable")
      .select("*, clientes(razao_social, nome_fantasia, cpf_cnpj)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    if (recError) throw recError;

    // 3. Buscar contas a pagar não pagas (para débitos)
    const { data: payables, error: payError } = await supabase
      .from("payables")
      .select("*, pessoas:supplier_id(razao_social, nome_fantasia, cpf_cnpj)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    if (payError) throw payError;

    // Mapear para formato uniforme
    const receivableEntries: FinancialEntry[] = (receivables || []).map(r => ({
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
      inter_boleto_id: r.inter_boleto_id,
      pix_key: null,
      payment_date: r.paid_at
    }));

    const payableEntries: FinancialEntry[] = (payables || []).map(p => ({
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
      inter_boleto_id: null,
      pix_key: p.pix_key,
      payment_date: p.paid_at
    }));

    console.log(`[reconciliation-engine v2] ${receivableEntries.length} recebíveis, ${payableEntries.length} pagáveis`);

    const suggestions: ReconciliationSuggestion[] = [];
    const usedEntryIds = new Set<string>();

    // 4. Processar cada transação
    for (const tx of transactions || []) {
      const isCredit = tx.amount > 0;
      const txAmount = Math.abs(tx.amount);

      // Selecionar títulos relevantes baseado no tipo da transação
      // Créditos (entradas) -> Recebíveis
      // Débitos (saídas) -> Pagáveis
      const relevantEntries = isCredit ? receivableEntries : payableEntries;
      
      // Filtrar apenas não utilizados
      const availableEntries = relevantEntries.filter(e => !usedEntryIds.has(e.id));

      if (availableEntries.length === 0) continue;

      // 4.1 Tentar match 1:1 (exato)
      const exactMatches: { entry: FinancialEntry; score: number; reasons: string[] }[] = [];
      
      for (const entry of availableEntries) {
        const { score, reasons, isValid } = calculateMatchScore(tx, entry, config);
        
        if (isValid && score >= config.score_minimo_sugestao) {
          exactMatches.push({ entry, score, reasons });
        }
      }

      // Ordenar por score decrescente
      exactMatches.sort((a, b) => b.score - a.score);

      // Adicionar melhor match 1:1
      if (exactMatches.length > 0) {
        const best = exactMatches[0];
        const confidenceLevel = getConfidenceLevel(best.score, config);
        
        // Só adicionar se for alta/média confiança, ou se incluir baixa
        if (confidenceLevel !== 'low' || include_low_confidence) {
          const diff = txAmount - best.entry.amount;
          
          suggestions.push({
            transaction_id: tx.id,
            transaction: tx,
            entries: [{
              id: best.entry.id,
              type: best.entry.type,
              amount: best.entry.amount,
              entity_name: best.entry.entity_name,
              due_date: best.entry.due_date
            }],
            confidence_score: best.score,
            confidence_level: confidenceLevel,
            match_reasons: best.reasons,
            match_type: Math.abs(diff) < 0.01 ? 'exact' : 'partial',
            total_matched: best.entry.amount,
            difference: diff,
            requires_review: confidenceLevel !== 'high'
          });

          // Marcar como usado para evitar duplicatas
          usedEntryIds.add(best.entry.id);
        }
      }

      // 4.2 Tentar aglutinação 1:N (se não encontrou match 1:1 bom)
      if (exactMatches.length === 0 || exactMatches[0].score < config.score_alta_confianca) {
        // Agrupar por entidade para aglutinação
        const entriesByEntity = new Map<string, FinancialEntry[]>();
        
        for (const entry of availableEntries) {
          if (usedEntryIds.has(entry.id)) continue;
          const key = entry.entity_name || 'unknown';
          if (!entriesByEntity.has(key)) {
            entriesByEntity.set(key, []);
          }
          entriesByEntity.get(key)!.push(entry);
        }

        for (const [entityName, entityEntries] of entriesByEntity) {
          if (entityName === 'unknown' || entityEntries.length < 2) continue;

          const combinations = findAggregations(txAmount, entityEntries, config);
          
          for (const combo of combinations) {
            const total = combo.reduce((sum, e) => sum + e.amount, 0);
            const diff = txAmount - total;
            
            // Calcular score médio ponderado
            let totalWeight = 0;
            let weightedScore = 0;
            
            for (const entry of combo) {
              const { score } = calculateMatchScore(tx, entry, config);
              weightedScore += score * entry.amount;
              totalWeight += entry.amount;
            }
            
            let avgScore = Math.round(weightedScore / totalWeight);
            
            // Bônus por match exato de valor na aglutinação
            if (Math.abs(diff) < 0.01) {
              avgScore = Math.min(100, avgScore + 10);
            }
            
            const confidenceLevel = getConfidenceLevel(avgScore, config);
            
            if (avgScore >= config.score_minimo_sugestao && 
                (confidenceLevel !== 'low' || include_low_confidence)) {
              suggestions.push({
                transaction_id: tx.id,
                transaction: tx,
                entries: combo.map(e => ({
                  id: e.id,
                  type: e.type,
                  amount: e.amount,
                  entity_name: e.entity_name,
                  due_date: e.due_date
                })),
                confidence_score: avgScore,
                confidence_level: confidenceLevel,
                match_reasons: [`Aglutinação: ${combo.length} títulos de "${entityName}"`],
                match_type: 'aggregation',
                total_matched: total,
                difference: diff,
                requires_review: true // Aglutinação sempre requer revisão
              });
            }
          }
        }
      }
    }

    // 5. Ordenar sugestões por confiança e limitar
    suggestions.sort((a, b) => {
      // Primeiro por nível de confiança
      const levelOrder = { high: 0, medium: 1, low: 2 };
      if (levelOrder[a.confidence_level] !== levelOrder[b.confidence_level]) {
        return levelOrder[a.confidence_level] - levelOrder[b.confidence_level];
      }
      // Depois por score
      return b.confidence_score - a.confidence_score;
    });

    const limitedSuggestions = suggestions.slice(0, max_suggestions);

    // 6. Categorizar
    const highConfidence = limitedSuggestions.filter(s => s.confidence_level === 'high');
    const mediumConfidence = limitedSuggestions.filter(s => s.confidence_level === 'medium');
    const lowConfidence = limitedSuggestions.filter(s => s.confidence_level === 'low');

    // 7. Identificar transações sem match
    const matchedTxIds = new Set(limitedSuggestions.map(s => s.transaction_id));
    const unmatchedTransactions = (transactions || [])
      .filter(tx => !matchedTxIds.has(tx.id))
      .map(tx => ({
        id: tx.id,
        date: tx.transaction_date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type
      }));

    console.log(`[reconciliation-engine v2] Resultado:`);
    console.log(`  - Alta confiança: ${highConfidence.length}`);
    console.log(`  - Média confiança: ${mediumConfidence.length}`);
    console.log(`  - Baixa confiança: ${lowConfidence.length}`);
    console.log(`  - Sem match: ${unmatchedTransactions.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggestions: limitedSuggestions,
          unmatched_transactions: unmatchedTransactions,
          summary: {
            total_suggestions: limitedSuggestions.length,
            high_confidence: highConfidence.length,
            medium_confidence: mediumConfidence.length,
            low_confidence: lowConfidence.length,
            unmatched: unmatchedTransactions.length,
            transactions_analyzed: transactions?.length || 0,
            receivables_available: receivableEntries.length,
            payables_available: payableEntries.length
          },
          config_used: config,
          // IMPORTANTE: Todas as sugestões requerem confirmação humana
          auto_executed: 0,
          pending_human_review: limitedSuggestions.length
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[reconciliation-engine v2] Erro:", error);
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
