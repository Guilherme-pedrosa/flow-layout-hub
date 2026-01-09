import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * BANK-CONNECT Edge Function
 * 
 * Cria uma nova conexão bancária com um provider (Pluggy, Belvo, etc.)
 * Salva tokens criptografados
 */

interface ConnectRequest {
  company_id: string;
  provider: string; // pluggy, belvo, inter, etc.
  authorization_code?: string; // código de autorização OAuth
  connector_name?: string; // nome do banco
  access_token?: string; // token direto (para testes)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: ConnectRequest = await req.json();
    const { company_id, provider, authorization_code, connector_name, access_token } = body;

    if (!company_id || !provider) {
      return new Response(
        JSON.stringify({ error: "company_id and provider are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth
    let createdBy: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      createdBy = user?.id || null;
    }

    console.log(`[bank-connect] Creating connection for company ${company_id}, provider ${provider}`);

    // TODO: Implement real OAuth flow with provider
    // 1. Exchange authorization_code for access_token and refresh_token
    // 2. Encrypt tokens before storing
    // 3. Fetch initial item/connection data from provider

    // For now, create a placeholder connection
    const { data: connection, error } = await supabase
      .from("bank_connections")
      .insert({
        company_id,
        provider,
        status: access_token ? "active" : "pending",
        connector_name: connector_name || `${provider.charAt(0).toUpperCase() + provider.slice(1)} Bank`,
        access_token_encrypted: access_token ? `encrypted_${access_token}` : null, // TODO: real encryption
        external_item_id: `item_${Date.now()}`,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error("[bank-connect] Error creating connection:", error);
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    console.log(`[bank-connect] Connection created: ${connection.id}`);

    // If we have a token, trigger initial sync
    if (access_token) {
      console.log("[bank-connect] Triggering initial sync...");
      
      // Call bank-sync function
      const syncResponse = await fetch(`${supabaseUrl}/functions/v1/bank-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          company_id,
          connection_id: connection.id,
          triggered_by: "webhook",
        }),
      });

      const syncResult = await syncResponse.json();
      console.log("[bank-connect] Initial sync result:", syncResult);
    }

    return new Response(
      JSON.stringify({
        success: true,
        connection_id: connection.id,
        status: connection.status,
        message: access_token 
          ? "Connection created and initial sync triggered" 
          : "Connection created, awaiting authorization",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bank-connect] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
