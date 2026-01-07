import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

    const { company_id, sync } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[field-service-types] Buscando tipos de serviço para empresa ${company_id}`);

    // Buscar API key
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .single();

    if (settingsError || !settings?.field_control_api_key) {
      console.log('[field-service-types] API Key não configurada');
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Field Control não configurada', services: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = settings.field_control_api_key;

    // Buscar tipos de serviço do Field Control
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/services`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[field-service-types] Erro ao buscar serviços: ${response.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar serviços: ${response.status}`, services: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const services = data.items || data.data || data || [];

    console.log(`[field-service-types] ${services.length} tipos de serviço encontrados`);

    // Se sync=true, sincronizar com tabela service_types
    if (sync && services.length > 0) {
      console.log('[field-service-types] Iniciando sincronização com banco local...');
      
      for (const fieldService of services) {
        const fieldServiceId = String(fieldService.id);
        const serviceName = fieldService.name || fieldService.title || `Serviço ${fieldService.id}`;
        const serviceColor = fieldService.color || '#3b82f6';
        const defaultDuration = fieldService.duration || fieldService.defaultDuration || 60;

        // Verificar se já existe pelo field_service_id
        const { data: existing } = await supabaseClient
          .from('service_types')
          .select('id')
          .eq('company_id', company_id)
          .eq('field_service_id', fieldServiceId)
          .single();

        if (existing) {
          // Atualizar
          await supabaseClient
            .from('service_types')
            .update({
              name: serviceName,
              color: serviceColor,
              default_duration: defaultDuration,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          
          console.log(`[field-service-types] Atualizado: ${serviceName}`);
        } else {
          // Inserir novo
          await supabaseClient
            .from('service_types')
            .insert({
              company_id,
              name: serviceName,
              field_service_id: fieldServiceId,
              color: serviceColor,
              default_duration: defaultDuration,
              is_active: true
            });
          
          console.log(`[field-service-types] Criado: ${serviceName}`);
        }
      }
      
      console.log('[field-service-types] Sincronização concluída');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        services: services.map((s: any) => ({ 
          id: s.id, 
          name: s.name || s.title,
          color: s.color,
          duration: s.duration || s.defaultDuration
        })),
        synced: sync ? services.length : 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-service-types] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error), services: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
