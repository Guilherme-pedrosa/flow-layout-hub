import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * BANK-SYNC Edge Function
 * 
 * Sincroniza contas e transações bancárias via provider (Pluggy, Belvo, etc.)
 * REGRA: Sempre UPSERT, NUNCA delete/truncate
 */

interface SyncRequest {
  company_id: string;
  connection_id?: string; // se não informado, sync todas as conexões ativas
  triggered_by?: "manual" | "cron" | "webhook";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: SyncRequest = await req.json();
    const { company_id, connection_id, triggered_by = "manual" } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bank-sync] Starting sync for company ${company_id}`);

    // Get user from auth header if manual
    let triggeredByUser: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && triggered_by === "manual") {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      triggeredByUser = user?.id || null;
    }

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from("bank_sync_logs")
      .insert({
        company_id,
        connection_id,
        triggered_by,
        triggered_by_user: triggeredByUser,
        status: "running",
      })
      .select()
      .single();

    if (logError) {
      console.error("[bank-sync] Error creating sync log:", logError);
    }

    // Get active connections
    let connectionsQuery = supabase
      .from("bank_connections")
      .select("*")
      .eq("company_id", company_id)
      .eq("status", "active");

    if (connection_id) {
      connectionsQuery = connectionsQuery.eq("id", connection_id);
    }

    const { data: connections, error: connError } = await connectionsQuery;

    if (connError) {
      throw new Error(`Failed to fetch connections: ${connError.message}`);
    }

    if (!connections || connections.length === 0) {
      // Update sync log
      if (syncLog) {
        await supabase
          .from("bank_sync_logs")
          .update({
            finished_at: new Date().toISOString(),
            status: "success",
            accounts_synced: 0,
            transactions_synced: 0,
          })
          .eq("id", syncLog.id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No active connections to sync",
          accounts_synced: 0,
          transactions_synced: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalAccountsSynced = 0;
    let totalTransactionsSynced = 0;
    const errors: string[] = [];

    // Process each connection
    for (const connection of connections) {
      try {
        console.log(`[bank-sync] Syncing connection ${connection.id} (${connection.provider})`);

        // TODO: Implement real provider API calls here
        // For now, this is a placeholder that shows the architecture
        
        // Example: Sync accounts from provider
        // const providerAccounts = await fetchAccountsFromProvider(connection);
        
        // PLACEHOLDER: Simulate account data (replace with real API call)
        const mockAccounts = [
          {
            external_account_id: `${connection.id}_checking_001`,
            name: "Conta Corrente Principal",
            bank_name: connection.connector_name || "Banco Placeholder",
            account_type: "checking",
            current_balance: Math.random() * 50000 + 5000,
            available_balance: Math.random() * 45000 + 5000,
          }
        ];

        // Upsert accounts (NEVER delete)
        for (const account of mockAccounts) {
          const { data: upsertedAccount, error: accountError } = await supabase
            .from("bank_accounts_synced")
            .upsert(
              {
                company_id,
                connection_id: connection.id,
                external_account_id: account.external_account_id,
                name: account.name,
                bank_name: account.bank_name,
                account_type: account.account_type,
                current_balance: account.current_balance,
                available_balance: account.available_balance,
                last_refreshed_at: new Date().toISOString(),
                is_active: true,
              },
              {
                onConflict: "company_id,connection_id,external_account_id",
              }
            )
            .select()
            .single();

          if (accountError) {
            console.error("[bank-sync] Error upserting account:", accountError);
            errors.push(`Account upsert error: ${accountError.message}`);
            continue;
          }

          totalAccountsSynced++;

          // PLACEHOLDER: Simulate transaction data (replace with real API call)
          // const providerTransactions = await fetchTransactionsFromProvider(connection, account);
          
          const today = new Date();
          const mockTransactions = Array.from({ length: 10 }, (_, i) => {
            const isIncome = Math.random() > 0.6;
            const amount = Math.random() * 5000 + 100;
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            return {
              external_tx_id: `${account.external_account_id}_tx_${Date.now()}_${i}`,
              posted_at: date.toISOString().split("T")[0],
              description: isIncome 
                ? ["PIX Recebido", "TED Recebida", "Depósito", "Crédito Automático"][Math.floor(Math.random() * 4)]
                : ["Pagamento Boleto", "PIX Enviado", "Débito Automático", "Tarifa Bancária"][Math.floor(Math.random() * 4)],
              amount: isIncome ? amount : -amount,
              direction: isIncome ? "in" : "out",
              category: isIncome ? "Receita" : "Despesa",
            };
          });

          // Upsert transactions (NEVER delete)
          for (const tx of mockTransactions) {
            const { error: txError } = await supabase
              .from("bank_transactions_synced")
              .upsert(
                {
                  company_id,
                  account_id: upsertedAccount.id,
                  external_tx_id: tx.external_tx_id,
                  posted_at: tx.posted_at,
                  description: tx.description,
                  amount: tx.amount,
                  direction: tx.direction,
                  category: tx.category,
                },
                {
                  onConflict: "company_id,account_id,external_tx_id",
                }
              );

            if (txError) {
              console.error("[bank-sync] Error upserting transaction:", txError);
            } else {
              totalTransactionsSynced++;
            }
          }
        }

        // Update connection last_sync
        await supabase
          .from("bank_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: "success",
            last_sync_error: null,
          })
          .eq("id", connection.id);

      } catch (connError) {
        const errorMsg = connError instanceof Error ? connError.message : "Unknown error";
        console.error(`[bank-sync] Error syncing connection ${connection.id}:`, errorMsg);
        errors.push(`Connection ${connection.id}: ${errorMsg}`);

        // Update connection with error
        await supabase
          .from("bank_connections")
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: "error",
            last_sync_error: errorMsg,
          })
          .eq("id", connection.id);
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from("bank_sync_logs")
        .update({
          finished_at: new Date().toISOString(),
          status: errors.length > 0 ? "partial" : "success",
          error_message: errors.length > 0 ? errors.join("; ") : null,
          accounts_synced: totalAccountsSynced,
          transactions_synced: totalTransactionsSynced,
        })
        .eq("id", syncLog.id);
    }

    console.log(`[bank-sync] Completed: ${totalAccountsSynced} accounts, ${totalTransactionsSynced} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        accounts_synced: totalAccountsSynced,
        transactions_synced: totalTransactionsSynced,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bank-sync] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
