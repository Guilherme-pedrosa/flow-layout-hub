import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Motor de Conciliação Inteligente - WeDo ERP
 * 
 * Níveis de Confiança (conforme spec):
 * - ≥95%: Sugestão de alta confiança (ainda requer confirmação humana)
 * - 70-94%: Sugestão de média confiança
 * - <70%: Sugestão de baixa confiança (requer revisão manual)
 * 
 * IMPORTANTE: NUNCA executa conciliação automática sem confirmação humana
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
}

interface ReconciliationSuggestion {
  transaction_id: string;
  entries: {
    id: string;
    type: 'receivable' | 'payable';
    amount_used: number;
  }[];
  confidence_score: number;
  match_reasons: string[];
  match_type: 'exact' | 'aggregation' | 'partial' | 'nsu' | 'document';
  total_matched: number;
  difference: number;
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

// Normalização de documento (CPF/CNPJ)
function normalizeDocument(doc: string | null): string {
  return doc?.replace(/\D/g, '') || '';
}

// Calcular score de proximidade de data
function dateProximityScore(txDate: string, entryDate: string): number {
  const d1 = new Date(txDate);
  const d2 = new Date(entryDate);
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 100;
  if (diffDays <= 1) return 95;
  if (diffDays <= 3) return 85;
  if (diffDays <= 7) return 70;
  if (diffDays <= 14) return 50;
  if (diffDays <= 30) return 30;
  return 10;
}

// Calcular score de similaridade de texto
function textSimilarityScore(text1: string | null, text2: string | null): number {
  const n1 = normalizeText(text1);
  const n2 = normalizeText(text2);
  
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 100;
  
  const tokens1 = n1.split(/\s+/);
  const tokens2 = n2.split(/\s+/);
  
  let matchCount = 0;
  for (const token of tokens1) {
    if (token.length > 2 && tokens2.some(t => t.includes(token) || token.includes(t))) {
      matchCount++;
    }
  }
  
  return Math.round((matchCount / Math.max(tokens1.length, 1)) * 100);
}

// Motor principal de matching
function calculateMatchScore(
  tx: BankTransaction,
  entry: FinancialEntry
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  const txAmount = Math.abs(tx.amount);
  const entryAmount = entry.amount;
  const amountDiff = Math.abs(txAmount - entryAmount);

  // 1. Match por valor (peso 40%)
  if (amountDiff < 0.01) {
    weightedScore += 40;
    reasons.push('Valor exato');
  } else if (amountDiff < 1) {
    weightedScore += 30;
    reasons.push('Valor aproximado (centavos)');
  } else if (amountDiff / entryAmount < 0.02) {
    weightedScore += 20;
    reasons.push('Valor similar (<2% diferença)');
  }
  totalWeight += 40;

  // 2. Match por data (peso 25%)
  const dateScore = dateProximityScore(tx.transaction_date, entry.due_date);
  weightedScore += (dateScore / 100) * 25;
  if (dateScore >= 85) {
    reasons.push('Data próxima');
  }
  totalWeight += 25;

  // 3. Match por nosso número / NSU (peso 20%)
  if (tx.nsu && entry.inter_nosso_numero) {
    if (tx.nsu.includes(entry.inter_nosso_numero) || 
        entry.inter_nosso_numero.includes(tx.nsu)) {
      weightedScore += 20;
      reasons.push('Nosso número identificado');
    }
  }
  if (tx.description && entry.inter_nosso_numero) {
    if (tx.description.includes(entry.inter_nosso_numero)) {
      weightedScore += 15;
      reasons.push('Nosso número na descrição');
    }
  }
  totalWeight += 20;

  // 4. Match por nome/descrição (peso 15%)
  const textScore = textSimilarityScore(tx.description, entry.entity_name || entry.description);
  weightedScore += (textScore / 100) * 15;
  if (textScore >= 50) {
    reasons.push('Nome/descrição similar');
  }
  totalWeight += 15;

  const finalScore = Math.round((weightedScore / totalWeight) * 100);
  
  return { score: finalScore, reasons };
}

// Encontrar combinações de títulos que somam o valor
function findCombinations(
  target: number, 
  entries: FinancialEntry[], 
  maxItems: number = 10,
  tolerance: number = 0.01
): FinancialEntry[][] {
  const results: FinancialEntry[][] = [];
  
  const backtrack = (start: number, remaining: number, current: FinancialEntry[]) => {
    if (Math.abs(remaining) <= tolerance && current.length > 0) {
      results.push([...current]);
      return;
    }
    if (remaining < -tolerance || current.length >= maxItems) return;
    
    for (let i = start; i < entries.length && results.length < 20; i++) {
      current.push(entries[i]);
      backtrack(i + 1, remaining - entries[i].amount, current);
      current.pop();
    }
  };
  
  backtrack(0, target, []);
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      company_id, 
      tolerance_days = 7, 
      tolerance_amount = 0.01,
      max_suggestions = 50,
      include_low_confidence = true
    } = await req.json();

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
      .limit(200);

    if (txError) throw txError;

    console.log(`[reconciliation-engine] ${transactions?.length || 0} transações não conciliadas`);

    // 2. Buscar títulos a receber não pagos
    const { data: receivables, error: recError } = await supabase
      .from("accounts_receivable")
      .select("*, clientes(razao_social, nome_fantasia, cpf_cnpj)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    if (recError) throw recError;

    // 3. Buscar títulos a pagar não pagos
    const { data: payables, error: payError } = await supabase
      .from("payables")
      .select("*, pessoas:supplier_id(razao_social, nome_fantasia, cpf_cnpj)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    if (payError) throw payError;

    // Mapear para formato uniforme
    const financialEntries: FinancialEntry[] = [
      ...(receivables || []).map(r => ({
        id: r.id,
        amount: r.amount,
        due_date: r.due_date,
        description: r.description,
        document_number: r.document_number,
        is_paid: r.is_paid || false,
        type: 'receivable' as const,
        entity_name: (r.clientes as Record<string, string>)?.nome_fantasia || (r.clientes as Record<string, string>)?.razao_social || null,
        entity_document: (r.clientes as Record<string, string>)?.cpf_cnpj || null,
        inter_nosso_numero: r.inter_nosso_numero,
        inter_boleto_id: r.inter_boleto_id,
        pix_key: null
      })),
      ...(payables || []).map(p => ({
        id: p.id,
        amount: p.amount,
        due_date: p.due_date,
        description: p.description,
        document_number: p.document_number,
        is_paid: p.is_paid || false,
        type: 'payable' as const,
        entity_name: (p.pessoas as Record<string, string>)?.nome_fantasia || (p.pessoas as Record<string, string>)?.razao_social || null,
        entity_document: (p.pessoas as Record<string, string>)?.cpf_cnpj || null,
        inter_nosso_numero: null,
        inter_boleto_id: null,
        pix_key: p.pix_key
      }))
    ];

    console.log(`[reconciliation-engine] ${financialEntries.length} títulos financeiros em aberto`);

    const suggestions: ReconciliationSuggestion[] = [];

    // 4. Analisar cada transação
    for (const tx of transactions || []) {
      const isCredit = tx.type === "CREDIT";
      const txAmount = Math.abs(tx.amount);

      // Filtrar títulos do tipo correto (crédito = receber, débito = pagar)
      const relevantEntries = financialEntries.filter(e => 
        isCredit ? e.type === 'receivable' : e.type === 'payable'
      );

      if (relevantEntries.length === 0) continue;

      // 4.1 Tentar match exato (1:1)
      const exactMatches: { entry: FinancialEntry; score: number; reasons: string[] }[] = [];
      
      for (const entry of relevantEntries) {
        const { score, reasons } = calculateMatchScore(tx, entry);
        if (score >= (include_low_confidence ? 30 : 70)) {
          exactMatches.push({ entry, score, reasons });
        }
      }

      // Ordenar por score
      exactMatches.sort((a, b) => b.score - a.score);

      // Adicionar melhor match exato
      if (exactMatches.length > 0) {
        const best = exactMatches[0];
        const amountDiff = Math.abs(txAmount - best.entry.amount);
        
        suggestions.push({
          transaction_id: tx.id,
          entries: [{
            id: best.entry.id,
            type: best.entry.type,
            amount_used: best.entry.amount
          }],
          confidence_score: best.score,
          match_reasons: best.reasons,
          match_type: amountDiff < 0.01 ? 'exact' : 'partial',
          total_matched: best.entry.amount,
          difference: txAmount - best.entry.amount
        });
      }

      // 4.2 Tentar aglutinação por cliente/fornecedor
      const groupedByEntity = new Map<string, FinancialEntry[]>();
      
      for (const entry of relevantEntries) {
        const key = entry.entity_name || 'unknown';
        if (!groupedByEntity.has(key)) {
          groupedByEntity.set(key, []);
        }
        groupedByEntity.get(key)!.push(entry);
      }

      for (const [entityName, group] of groupedByEntity) {
        if (entityName === 'unknown' || group.length < 2) continue;

        const combinations = findCombinations(txAmount, group, 10, tolerance_amount);
        
        for (const combo of combinations) {
          const total = combo.reduce((sum, e) => sum + e.amount, 0);
          
          // Calcular score médio da combinação
          const scores = combo.map(e => calculateMatchScore(tx, e));
          const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
          
          // Boost para aglutinação exata
          const finalScore = Math.abs(total - txAmount) < 0.01 
            ? Math.min(avgScore + 10, 100) 
            : avgScore;

          if (finalScore >= (include_low_confidence ? 30 : 70)) {
            suggestions.push({
              transaction_id: tx.id,
              entries: combo.map(e => ({
                id: e.id,
                type: e.type,
                amount_used: e.amount
              })),
              confidence_score: finalScore,
              match_reasons: [`Aglutinação: ${combo.length} títulos de "${entityName}"`],
              match_type: 'aggregation',
              total_matched: total,
              difference: txAmount - total
            });
          }
        }
      }
    }

    // 5. Ordenar e limitar sugestões
    suggestions.sort((a, b) => b.confidence_score - a.confidence_score);
    const limitedSuggestions = suggestions.slice(0, max_suggestions);

    // 6. Categorizar por nível de confiança
    const highConfidence = limitedSuggestions.filter(s => s.confidence_score >= 95);
    const mediumConfidence = limitedSuggestions.filter(s => s.confidence_score >= 70 && s.confidence_score < 95);
    const lowConfidence = limitedSuggestions.filter(s => s.confidence_score < 70);

    console.log(`[reconciliation-engine] Sugestões geradas: ${limitedSuggestions.length}`);
    console.log(`  - Alta confiança (≥95%): ${highConfidence.length}`);
    console.log(`  - Média confiança (70-94%): ${mediumConfidence.length}`);
    console.log(`  - Baixa confiança (<70%): ${lowConfidence.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggestions: limitedSuggestions,
          summary: {
            total_suggestions: limitedSuggestions.length,
            high_confidence: highConfidence.length,
            medium_confidence: mediumConfidence.length,
            low_confidence: lowConfidence.length,
            transactions_analyzed: transactions?.length || 0,
            financial_entries_analyzed: financialEntries.length
          },
          // IMPORTANTE: Lista de sugestões para confirmação humana
          // A IA NÃO executa nenhuma conciliação automaticamente
          pending_human_review: limitedSuggestions.length,
          auto_executed: 0 // Sempre zero - conciliação requer confirmação
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