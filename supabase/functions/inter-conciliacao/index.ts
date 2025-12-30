import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Transacao {
  dataEntrada?: string;
  dataMovimento?: string;
  valor: string | number;
  descricao?: string;
  titulo?: string;
  tipoTransacao?: string;
  tipoOperacao?: string;
  detalhes?: {
    cpfCnpj?: string;
    nome?: string;
    chavePix?: string;
  };
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

// Função para calcular score de match
function calculateMatchScore(
  transacao: Transacao,
  payable: Payable
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Comparar valor (peso: 30)
  const valorExtrato = typeof transacao.valor === "string" 
    ? parseFloat(transacao.valor) 
    : transacao.valor;
  const valorPayable = payable.amount;

  if (Math.abs(valorExtrato - valorPayable) < 0.01) {
    score += 30;
    reasons.push("Valor exato");
  } else if (Math.abs(valorExtrato - valorPayable) < 1) {
    score += 15;
    reasons.push("Valor aproximado");
  }

  // 2. Comparar CPF/CNPJ (peso: 40)
  const cpfExtrato = normalizeDocument(transacao.detalhes?.cpfCnpj || "");
  const cpfPayable = normalizeDocument(payable.recipient_document);

  if (cpfExtrato && cpfPayable && cpfExtrato === cpfPayable) {
    score += 40;
    reasons.push("CPF/CNPJ idêntico");
  }

  // 3. Comparar nome (peso: 20)
  const nomeExtrato = normalizeName(
    transacao.detalhes?.nome || transacao.descricao || transacao.titulo || ""
  );
  const nomePayable = normalizeName(payable.recipient_name);

  if (nomeExtrato && nomePayable) {
    if (nomeExtrato === nomePayable) {
      score += 20;
      reasons.push("Nome idêntico");
    } else if (
      nomeExtrato.includes(nomePayable) ||
      nomePayable.includes(nomeExtrato)
    ) {
      score += 10;
      reasons.push("Nome parcial");
    }
  }

  // 4. Comparar chave PIX (peso: 10)
  const chaveExtrato = transacao.detalhes?.chavePix || "";
  const chavePayable = payable.pix_key || "";

  if (chaveExtrato && chavePayable) {
    const chaveExtratoNorm = normalizeDocument(chaveExtrato);
    const chavePayableNorm = normalizeDocument(chavePayable);
    
    if (chaveExtratoNorm === chavePayableNorm || chaveExtrato === chavePayable) {
      score += 10;
      reasons.push("Chave PIX idêntica");
    }
  }

  return { score, reasons };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, dias_retroativos = 7 } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[inter-conciliacao] Iniciando para company_id: ${company_id}`);

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

    console.log(`[inter-conciliacao] Período: ${dataInicioStr} a ${dataFimStr}`);

    // 2. Chamar edge function de extrato
    const extratoResponse = await supabase.functions.invoke("inter-extrato", {
      body: {
        company_id,
        data_inicio: dataInicioStr,
        data_fim: dataFimStr,
        tipo_operacao: "D", // Débito = saídas
      },
    });

    if (!extratoResponse.data?.success) {
      console.error("[inter-conciliacao] Erro no extrato:", extratoResponse.error);
      throw new Error(
        `Erro ao buscar extrato: ${extratoResponse.error?.message || "desconhecido"}`
      );
    }

    const transacoes: Transacao[] = extratoResponse.data.data.transacoes || [];
    console.log(`[inter-conciliacao] Transações PIX recebidas: ${transacoes.length}`);

    // 3. Buscar contas a pagar pendentes (enviadas para aprovação no banco)
    const { data: payables, error: payablesError } = await supabase
      .from("payables")
      .select("*")
      .eq("company_id", company_id)
      .in("payment_status", ["sent_to_bank", "processing", "pending"])
      .eq("is_paid", false);

    if (payablesError) {
      throw new Error(`Erro ao buscar payables: ${payablesError.message}`);
    }

    console.log(`[inter-conciliacao] Payables pendentes: ${payables?.length || 0}`);

    if (!payables || payables.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhuma conta a pagar pendente",
          data: {
            transacoes_processadas: transacoes.length,
            auto_reconciled: 0,
            suggestions_created: 0,
            no_match: 0,
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

    const payablesList = [...payables] as Payable[];

    // 4. Para cada transação do extrato, tentar encontrar match
    for (const transacao of transacoes) {
      let bestMatch: { payable: Payable; score: number; reasons: string[] } | null = null;

      for (const payable of payablesList) {
        const { score, reasons } = calculateMatchScore(transacao, payable);

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { payable, score, reasons };
        }
      }

      if (bestMatch) {
        const valorExtrato = typeof transacao.valor === "string"
          ? parseFloat(transacao.valor)
          : transacao.valor;
        const dataExtrato = transacao.dataEntrada || transacao.dataMovimento;

        console.log(
          `[inter-conciliacao] Match encontrado: Payable ${bestMatch.payable.id}, Score: ${bestMatch.score}, Reasons: ${bestMatch.reasons.join(", ")}`
        );

        // Score >= 70 E mesmo CPF/CNPJ = conciliação automática
        if (bestMatch.score >= 70 && bestMatch.reasons.includes("CPF/CNPJ idêntico")) {
          console.log(
            `[inter-conciliacao] Conciliação automática para payable ${bestMatch.payable.id}`
          );

          // Conciliação automática
          const { error: updateError } = await supabase
            .from("payables")
            .update({
              is_paid: true,
              paid_at: dataExtrato,
              paid_amount: valorExtrato,
              payment_status: "paid",
              reconciled_at: new Date().toISOString(),
              reconciliation_source: "auto",
            })
            .eq("id", bestMatch.payable.id);

          if (updateError) {
            console.error(
              `[inter-conciliacao] Erro ao atualizar payable:`,
              updateError
            );
          } else {
            results.auto_reconciled++;

            // Remover da lista para não processar novamente
            const index = payablesList.findIndex((p) => p.id === bestMatch!.payable.id);
            if (index > -1) payablesList.splice(index, 1);
          }
        } else if (bestMatch.score >= 40) {
          console.log(
            `[inter-conciliacao] Criando sugestão para payable ${bestMatch.payable.id}`
          );

          // Verificar se já existe sugestão para este payable
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
                extrato_data: dataExtrato,
                extrato_valor: valorExtrato,
                extrato_descricao: transacao.descricao || transacao.titulo,
                extrato_cpf_cnpj: transacao.detalhes?.cpfCnpj,
                extrato_nome: transacao.detalhes?.nome,
                extrato_chave_pix: transacao.detalhes?.chavePix,
                confidence_score: bestMatch.score,
                match_reason: bestMatch.reasons.join(", "),
                status: "pending",
              });

            if (insertError) {
              console.error(
                `[inter-conciliacao] Erro ao criar sugestão:`,
                insertError
              );
            } else {
              results.suggestions_created++;
            }
          } else {
            console.log(
              `[inter-conciliacao] Sugestão já existe para payable ${bestMatch.payable.id}`
            );
          }
        } else {
          results.no_match++;
        }
      } else {
        results.no_match++;
      }
    }

    console.log(`[inter-conciliacao] Resultados:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transacoes_processadas: transacoes.length,
          payables_pendentes: payables.length,
          ...results,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[inter-conciliacao] Erro:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
