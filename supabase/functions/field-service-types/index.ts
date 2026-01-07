import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

/**
 * FIELD-SERVICE-TYPES
 * 
 * Busca e sincroniza tipos de OS (task-types) do Field Control
 * 
 * Endpoints do Field:
 * - GET /task-types - lista tipos de tarefas
 * - GET /services - lista serviços (diferente de task-types!)
 * 
 * Usamos /task-types pois é o que define o tipo de OS
 */
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

    console.log(`[field-service-types] Buscando tipos de OS para empresa ${company_id}`);

    // Buscar API key do system_settings
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

    // Buscar SERVICES do Field Control (tipos de OS/serviço)
    // O Field Control usa "services" para os tipos de tarefa
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/services`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[field-service-types] Erro ao buscar services: ${response.status}`);
      const errorText = await response.text();
      console.error(`[field-service-types] Response: ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar tipos: ${response.status}`, services: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const services = data.items || data.data || data || [];

    console.log(`[field-service-types] ${services.length} tipos de OS encontrados`);

    // Se sync=true, sincronizar com tabela service_types
    if (sync && services.length > 0) {
      console.log('[field-service-types] Iniciando sincronização com banco local...');
      
      let syncedCount = 0;
      
      for (const service of services) {
        const fieldServiceId = String(service.id);
        const serviceName = service.name || service.title || `Tipo ${service.id}`;
        const serviceColor = service.color || '#3b82f6';
        const defaultDuration = service.duration || service.defaultDuration || 60;

        try {
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
                is_active: true,
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
          syncedCount++;
        } catch (upsertError) {
          console.error(`[field-service-types] Erro ao sincronizar ${serviceName}:`, upsertError);
        }
      }
      
      // Registrar no audit_logs
      await supabaseClient.from('audit_logs').insert({
        company_id,
        entity: 'service_types',
        action: 'service_types_synced',
        metadata_json: { synced_count: syncedCount, source: 'field_control' }
      });
      
      console.log(`[field-service-types] Sincronização concluída: ${syncedCount} tipos`);
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
