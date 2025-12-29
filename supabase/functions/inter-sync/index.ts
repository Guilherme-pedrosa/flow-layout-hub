import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  company_id: string;
  date_from: string;
  date_to: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id, date_from, date_to }: SyncRequest = await req.json();
    console.log(`[inter-sync] Sincronização: ${company_id}, ${date_from} a ${date_to}`);

    const { data: credentials, error: credError } = await supabase
      .from("inter_credentials")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (credError || !credentials) {
      throw new Error("Credenciais do Banco Inter não configuradas");
    }

    // Gerar transações de demonstração (MVP)
    const mockTransactions = [];
    const startDate = new Date(date_from);
    const endDate = new Date(date_to);
    let currentDate = new Date(startDate);
    let nsuCounter = Date.now();

    while (currentDate <= endDate) {
      const txCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < txCount; i++) {
        const isCredit = Math.random() > 0.4;
        const amount = Math.round((Math.random() * 4950 + 50) * 100) / 100;
        mockTransactions.push({
          date: currentDate.toISOString().split("T")[0],
          description: isCredit ? "PIX RECEBIDO" : "PAGAMENTO BOLETO",
          amount: isCredit ? amount : -amount,
          type: isCredit ? "CREDIT" : "DEBIT",
          nsu: `NSU${nsuCounter++}`,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let importedCount = 0;
    for (const tx of mockTransactions) {
      const { error } = await supabase
        .from("bank_transactions")
        .upsert({
          company_id,
          transaction_date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          nsu: tx.nsu,
        }, { onConflict: "company_id,nsu", ignoreDuplicates: true });
      if (!error) importedCount++;
    }

    await supabase
      .from("inter_credentials")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("company_id", company_id);

    return new Response(
      JSON.stringify({ success: true, imported: importedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro interno";
    console.error("[inter-sync] Erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
