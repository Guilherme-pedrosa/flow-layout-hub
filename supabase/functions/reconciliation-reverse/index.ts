import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * ESTORNO DE CONCILIAÇÃO
 * 
 * Reverte uma conciliação bancária:
 * - Marca a conciliação como estornada
 * - Desmarca a transação bancária como conciliada
 * - Desmarca os títulos financeiros como pagos
 * - Registra log de auditoria
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reconciliation_id, user_id, reason } = await req.json();

    if (!reconciliation_id) {
      throw new Error("reconciliation_id é obrigatório");
    }

    console.log(`[reconciliation-reverse] Estornando conciliação: ${reconciliation_id}`);

    // 1. Buscar a conciliação
    const { data: reconciliation, error: recError } = await supabase
      .from("bank_reconciliations")
      .select("*")
      .eq("id", reconciliation_id)
      .single();

    if (recError || !reconciliation) {
      throw new Error("Conciliação não encontrada");
    }

    if (reconciliation.status === 'reversed') {
      throw new Error("Esta conciliação já foi estornada");
    }

    // 2. Buscar os itens da conciliação
    const { data: items, error: itemsError } = await supabase
      .from("bank_reconciliation_items")
      .select("*")
      .eq("reconciliation_id", reconciliation_id);

    if (itemsError) throw itemsError;

    // 3. Marcar conciliação como estornada
    const { error: updateRecError } = await supabase
      .from("bank_reconciliations")
      .update({
        status: 'reversed',
        reversed_at: new Date().toISOString(),
        reversed_by: user_id,
        reverse_reason: reason
      })
      .eq("id", reconciliation_id);

    if (updateRecError) throw updateRecError;

    // 4. Desmarcar transação bancária
    const { error: updateTxError } = await supabase
      .from("bank_transactions")
      .update({
        is_reconciled: false,
        reconciled_at: null
      })
      .eq("id", reconciliation.bank_transaction_id);

    if (updateTxError) throw updateTxError;

    // 5. Desmarcar títulos financeiros
    for (const item of items || []) {
      const table = item.financial_type === 'receivable' ? 'accounts_receivable' : 'payables';
      
      const { error: updateFinError } = await supabase
        .from(table)
        .update({
          is_paid: false,
          paid_at: null,
          reconciliation_id: null
        })
        .eq("id", item.financial_id);

      if (updateFinError) {
        console.error(`Erro ao desmarcar título ${item.financial_id}:`, updateFinError);
      }
    }

    // 6. Registrar log de auditoria
    await supabase
      .from("reconciliation_audit_log")
      .insert({
        company_id: reconciliation.company_id,
        event_type: 'reversed',
        reconciliation_id: reconciliation_id,
        bank_transaction_id: reconciliation.bank_transaction_id,
        event_data: {
          reconciliation,
          items,
          reason,
          reversed_by: user_id
        },
        user_id: user_id
      });

    console.log(`[reconciliation-reverse] Conciliação ${reconciliation_id} estornada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conciliação estornada com sucesso",
        data: {
          reconciliation_id,
          items_reversed: items?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[reconciliation-reverse] Erro:", error);
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
