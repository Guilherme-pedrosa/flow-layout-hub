import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BankTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  description: string | null;
  type: string | null;
  category: string | null;
  is_reconciled: boolean;
  raw_data: any;
}

interface Payable {
  id: string;
  amount: number;
  recipient_name: string | null;
  recipient_document: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  payment_status: string | null;
  description: string | null;
  due_date: string;
  supplier_id: string;
  supplier?: {
    razao_social: string | null;
    cpf_cnpj: string | null;
  };
}

// Função para normalizar CPF/CNPJ (remover pontuação)
function normalizeDocument(doc: string | null): string {
  return doc?.replace(/\D/g, "") || "";
}

// Função para normalizar nome (uppercase, sem acentos)
function normalizeName(name: string | null): string {
  return (
    name
      ?.toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim() || ""
  );
}

// Função para calcular score de match entre transação bancária e payable
function calculateMatchScore(
  transaction: BankTransaction,
  payable: Payable
): { score: number; reasons: string[]; isValid: boolean } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Comparar valor (peso: 40) - Transações de débito são negativas
  const valorExtrato = Math.abs(transaction.amount);
  const valorPayable = payable.amount;
  const percentDiff = Math.abs((valorExtrato - valorPayable) / valorPayable) * 100;

  // REGRA CRÍTICA: Se a diferença de valor for > 20%, o match é INVÁLIDO
  if (percentDiff > 20) {
    return { score: 0, reasons: ["Valor incompatível"], isValid: false };
  }

  if (Math.abs(valorExtrato - valorPayable) < 0.01) {
    score += 40;
    reasons.push("Valor exato");
  } else if (Math.abs(valorExtrato - valorPayable) < 1) {
    score += 30;
    reasons.push("Valor aproximado (diferença < R$1)");
  } else if (percentDiff <= 5) {
    score += 20;
    reasons.push("Valor similar (diferença < 5%)");
  } else if (percentDiff <= 10) {
    score += 10;
    reasons.push("Valor próximo (diferença < 10%)");
  } else {
    score += 5;
    reasons.push("Valor com diferença tolerável (< 20%)");
  }

  // 2. Comparar data da transação com vencimento (peso: 20)
  const transactionDate = new Date(transaction.transaction_date);
  const dueDate = new Date(payable.due_date);
  const daysDiff = Math.abs((transactionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 3) {
    score += 20;
    reasons.push("Data muito próxima ao vencimento");
  } else if (daysDiff <= 7) {
    score += 15;
    reasons.push("Data próxima ao vencimento");
  } else if (daysDiff <= 15) {
    score += 10;
    reasons.push("Data razoavelmente próxima");
  } else if (daysDiff <= 30) {
    score += 5;
    reasons.push("Data dentro de 30 dias");
  }
  // Se mais de 30 dias de diferença, não adiciona pontos de data

  // 3. Comparar CPF/CNPJ do fornecedor (peso: 30)
  const cpfPayable = normalizeDocument(payable.recipient_document || payable.supplier?.cpf_cnpj || null);
  const descricao = normalizeName(transaction.description);

  // Tentar encontrar CPF/CNPJ na descrição
  if (cpfPayable && cpfPayable.length >= 11) {
    if (descricao.includes(cpfPayable)) {
      score += 30;
      reasons.push("CPF/CNPJ encontrado na descrição");
    }
  }

  // 4. Comparar nome do fornecedor na descrição (peso: 20)
  const nomePayable = normalizeName(payable.recipient_name || payable.supplier?.razao_social || null);

  if (nomePayable && nomePayable.length > 3) {
    // Verificar se partes do nome estão na descrição
    const nomePartes = nomePayable.split(" ").filter(p => p.length > 3);
    let partesEncontradas = 0;
    
    for (const parte of nomePartes) {
      if (descricao.includes(parte)) {
        partesEncontradas++;
      }
    }

    if (nomePartes.length > 0) {
      const percentMatch = partesEncontradas / nomePartes.length;
      if (percentMatch >= 0.5) {
        score += 20;
        reasons.push("Nome do fornecedor encontrado");
      } else if (percentMatch >= 0.25) {
        score += 10;
        reasons.push("Nome parcial do fornecedor");
      }
    }
  }

  // 5. Comparar chave PIX (peso: 10)
  const chavePayable = payable.pix_key || "";
  if (chavePayable && descricao.includes(chavePayable.toUpperCase())) {
    score += 10;
    reasons.push("Chave PIX encontrada");
  }

  // 6. Verificar se é pagamento PIX (bônus pequeno)
  if (transaction.type?.toUpperCase().includes("PIX") || 
      transaction.category?.toUpperCase().includes("PIX") ||
      descricao.includes("PIX")) {
    score += 3;
    reasons.push("Transação PIX");
  }

  return { score, reasons, isValid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, dias_retroativos = 30 } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[conciliacao-ai] Iniciando para company_id: ${company_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Calcular período de busca
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - dias_retroativos);

    const dataInicioStr = dataInicio.toISOString().split("T")[0];
    const dataFimStr = hoje.toISOString().split("T")[0];

    console.log(`[conciliacao-ai] Período: ${dataInicioStr} a ${dataFimStr}`);

    // 2. Buscar transações bancárias não conciliadas (débitos = valores negativos)
    const { data: transactions, error: transError } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_reconciled", false)
      .lt("amount", 0) // Apenas débitos (saídas)
      .gte("transaction_date", dataInicioStr)
      .lte("transaction_date", dataFimStr)
      .order("transaction_date", { ascending: false });

    if (transError) {
      throw new Error(`Erro ao buscar transações: ${transError.message}`);
    }

    console.log(`[conciliacao-ai] Transações bancárias não conciliadas: ${transactions?.length || 0}`);

    // 3. Buscar TODAS as contas a pagar pendentes (sem filtro de data)
    // Importante: não filtrar por due_date pois payables vencidos ainda precisam ser conciliados
    const { data: payables, error: payablesError } = await supabase
      .from("payables")
      .select(`
        *,
        supplier:pessoas!payables_supplier_id_fkey(razao_social, cpf_cnpj)
      `)
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .is("reconciliation_id", null);

    if (payablesError) {
      throw new Error(`Erro ao buscar payables: ${payablesError.message}`);
    }

    console.log(`[conciliacao-ai] Payables pendentes: ${payables?.length || 0}`);

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma transação bancária não conciliada no período",
          data: {
            transacoes_processadas: 0,
            payables_pendentes: payables?.length || 0,
            auto_reconciled: 0,
            suggestions_created: 0,
            no_match: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payables || payables.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma conta a pagar pendente no período",
          data: {
            transacoes_processadas: transactions.length,
            payables_pendentes: 0,
            auto_reconciled: 0,
            suggestions_created: 0,
            no_match: transactions.length,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      auto_reconciled: 0,
      suggestions_created: 0,
      no_match: 0,
    };

    const transactionsList = [...transactions] as BankTransaction[];
    const payablesList = [...payables] as Payable[];
    const processedPayables = new Set<string>();

    // 4. Para cada transação bancária, tentar encontrar match com payables
    for (const transaction of transactionsList) {
      let bestMatch: { payable: Payable; score: number; reasons: string[] } | null = null;

      for (const payable of payablesList) {
        // Pular se já foi processado
        if (processedPayables.has(payable.id)) continue;

        const { score, reasons, isValid } = calculateMatchScore(transaction, payable);

        // Só considerar matches válidos (valores compatíveis)
        if (isValid && score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { payable, score, reasons };
        }
      }

      if (bestMatch) {
        const valorExtrato = Math.abs(transaction.amount);

        console.log(
          `[conciliacao-ai] Match encontrado: Transação ${transaction.id} -> Payable ${bestMatch.payable.id}, Score: ${bestMatch.score}, Reasons: ${bestMatch.reasons.join(", ")}`
        );

        // Score >= 70 = conciliação automática
        if (bestMatch.score >= 70) {
          console.log(
            `[conciliacao-ai] Conciliação automática para payable ${bestMatch.payable.id}`
          );

          // Marcar payable como pago
          const { error: updatePayableError } = await supabase
            .from("payables")
            .update({
              is_paid: true,
              paid_at: transaction.transaction_date,
              paid_amount: valorExtrato,
              payment_status: "paid",
              reconciled_at: new Date().toISOString(),
              reconciliation_source: "auto_ai",
              bank_transaction_id: transaction.id,
            })
            .eq("id", bestMatch.payable.id);

          if (updatePayableError) {
            console.error(`[conciliacao-ai] Erro ao atualizar payable:`, updatePayableError);
            continue;
          }

          // Marcar transação como conciliada
          const { error: updateTransError } = await supabase
            .from("bank_transactions")
            .update({
              is_reconciled: true,
              reconciled_at: new Date().toISOString(),
              reconciled_with_id: bestMatch.payable.id,
              reconciled_with_type: "payable",
            })
            .eq("id", transaction.id);

          if (updateTransError) {
            console.error(`[conciliacao-ai] Erro ao atualizar transação:`, updateTransError);
          }

          results.auto_reconciled++;
          processedPayables.add(bestMatch.payable.id);

        } else if (bestMatch.score >= 15) {
          console.log(
            `[conciliacao-ai] Criando sugestão para payable ${bestMatch.payable.id} (score: ${bestMatch.score})`
          );

          // Verificar se já existe sugestão pendente para este payable
          const { data: existingSuggestion } = await supabase
            .from("reconciliation_suggestions")
            .select("id")
            .eq("payable_id", bestMatch.payable.id)
            .eq("status", "pending")
            .single();

          if (!existingSuggestion) {
            // Criar sugestão para revisão manual
            const { error: insertError } = await supabase
              .from("reconciliation_suggestions")
              .insert({
                company_id,
                payable_id: bestMatch.payable.id,
                bank_transaction_id: transaction.id,
                extrato_data: transaction.transaction_date,
                extrato_valor: valorExtrato,
                extrato_descricao: transaction.description,
                extrato_cpf_cnpj: bestMatch.payable.recipient_document || bestMatch.payable.supplier?.cpf_cnpj,
                extrato_nome: bestMatch.payable.recipient_name || bestMatch.payable.supplier?.razao_social,
                confidence_score: bestMatch.score,
                match_reason: bestMatch.reasons.join(", "),
                status: "pending",
              });

            if (insertError) {
              console.error(`[conciliacao-ai] Erro ao criar sugestão:`, insertError);
            } else {
              results.suggestions_created++;
            }
          } else {
            console.log(`[conciliacao-ai] Sugestão já existe para payable ${bestMatch.payable.id}`);
          }
        } else {
          results.no_match++;
        }
      } else {
        results.no_match++;
      }
    }

    console.log(`[conciliacao-ai] Resultados finais:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transacoes_processadas: transactions.length,
          payables_pendentes: payables.length,
          ...results,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[conciliacao-ai] Erro:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
