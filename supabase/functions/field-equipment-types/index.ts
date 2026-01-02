import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[field-equipment-types] Buscando tipos para empresa ${company_id}`);

    // Buscar API key
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .single();

    if (settingsError || !settings?.field_control_api_key) {
      console.log('[field-equipment-types] API Key não configurada');
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Field Control não configurada', types: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = settings.field_control_api_key;

    // Buscar tipos de equipamento do Field Control
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/equipment-types`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[field-equipment-types] Erro ao buscar tipos: ${response.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar tipos: ${response.status}`, types: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const types = data.items || data.data || data || [];

    console.log(`[field-equipment-types] ${types.length} tipos encontrados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        types: types.map((t: any) => ({ 
          id: t.id, 
          name: t.name 
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-equipment-types] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error), types: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
