import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, tolerance_days = 3, tolerance_amount = 0.01 } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[reconciliation-engine] Iniciando conciliação para company: ${company_id}`);

    // Criar cliente Supabase com service role para bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar transações de crédito não conciliadas
    const { data: transactions, error: txError } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", company_id)
      .eq("type", "CREDIT")
      .eq("is_reconciled", false)
      .order("transaction_date", { ascending: true });

    if (txError) {
      console.error("[reconciliation-engine] Erro ao buscar transações:", txError);
      throw txError;
    }

    console.log(`[reconciliation-engine] ${transactions?.length || 0} transações de crédito não conciliadas`);

    // Buscar títulos a receber não pagos
    const { data: receivables, error: recError } = await supabase
      .from("accounts_receivable")
      .select("*, clientes(razao_social, nome_fantasia)")
      .eq("company_id", company_id)
      .eq("is_paid", false)
      .order("due_date", { ascending: true });

    if (recError) {
      console.error("[reconciliation-engine] Erro ao buscar títulos:", recError);
      throw recError;
    }

    console.log(`[reconciliation-engine] ${receivables?.length || 0} títulos em aberto`);

    let matchedCount = 0;
    const matches: any[] = [];

    // Algoritmo de conciliação
    for (const tx of transactions || []) {
      const txDate = new Date(tx.transaction_date);
      const txAmount = Math.abs(tx.amount);

      // Procurar título compatível
      for (const rec of receivables || []) {
        // Já foi conciliado nesta rodada?
        if (rec._matched) continue;

        const recDate = new Date(rec.due_date);
        const recAmount = rec.amount;

        // Verificar tolerância de data (vencimento vs recebimento)
        const daysDiff = Math.abs((txDate.getTime() - recDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Verificar tolerância de valor
        const amountDiff = Math.abs(txAmount - recAmount);

        // Match por valor exato ou dentro da tolerância
        const valueMatch = amountDiff <= tolerance_amount;
        // Match por data (recebido até X dias após vencimento)
        const dateMatch = daysDiff <= tolerance_days && txDate >= recDate;

        // Match também pode ser por nosso número no NSU/descrição
        const nsuMatch = tx.nsu && rec.inter_nosso_numero && 
          tx.nsu.includes(rec.inter_nosso_numero);
        
        const descriptionMatch = tx.description && rec.inter_nosso_numero && 
          tx.description.includes(rec.inter_nosso_numero);

        if ((valueMatch && dateMatch) || nsuMatch || descriptionMatch) {
          console.log(`[reconciliation-engine] Match encontrado: TX ${tx.id} <-> REC ${rec.id}`);
          
          // Marcar como conciliado
          rec._matched = true;
          
          matches.push({
            transaction_id: tx.id,
            receivable_id: rec.id,
            match_type: nsuMatch ? "nsu" : descriptionMatch ? "description" : "value_date",
            tx_amount: txAmount,
            rec_amount: recAmount,
            difference: amountDiff
          });

          // Atualizar transação bancária
          const { error: updateTxError } = await supabase
            .from("bank_transactions")
            .update({
              is_reconciled: true,
              reconciled_at: new Date().toISOString(),
              reconciled_with_id: rec.id,
              reconciled_with_type: "accounts_receivable"
            })
            .eq("id", tx.id);

          if (updateTxError) {
            console.error("[reconciliation-engine] Erro ao atualizar transação:", updateTxError);
          }

          // Atualizar título a receber
          const { error: updateRecError } = await supabase
            .from("accounts_receivable")
            .update({
              is_paid: true,
              paid_at: tx.transaction_date,
              paid_amount: txAmount,
              bank_transaction_id: tx.id,
              reconciled_at: new Date().toISOString(),
              payment_method: "transferencia"
            })
            .eq("id", rec.id);

          if (updateRecError) {
            console.error("[reconciliation-engine] Erro ao atualizar título:", updateRecError);
          }

          matchedCount++;
          break; // Próxima transação
        }
      }
    }

    console.log(`[reconciliation-engine] Conciliação finalizada: ${matchedCount} matches`);

    return new Response(
      JSON.stringify({
        success: true,
        matched: matchedCount,
        details: matches,
        transactions_checked: transactions?.length || 0,
        receivables_checked: receivables?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[reconciliation-engine] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
