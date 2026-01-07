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

    // Buscar TASK-TYPES do Field Control (tipos de OS)
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/task-types`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[field-service-types] Erro ao buscar task-types: ${response.status}`);
      const errorText = await response.text();
      console.error(`[field-service-types] Response: ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar tipos: ${response.status}`, services: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const taskTypes = data.items || data.data || data || [];

    console.log(`[field-service-types] ${taskTypes.length} tipos de OS encontrados`);

    // Se sync=true, sincronizar com tabela service_types
    if (sync && taskTypes.length > 0) {
      console.log('[field-service-types] Iniciando sincronização com banco local...');
      
      let syncedCount = 0;
      
      for (const taskType of taskTypes) {
        const fieldTaskTypeId = String(taskType.id);
        const typeName = taskType.name || taskType.title || `Tipo ${taskType.id}`;
        const typeColor = taskType.color || '#3b82f6';
        const defaultDuration = taskType.duration || taskType.defaultDuration || 60;

        try {
          // Verificar se já existe pelo field_service_id (que armazena o task-type id)
          const { data: existing } = await supabaseClient
            .from('service_types')
            .select('id')
            .eq('company_id', company_id)
            .eq('field_service_id', fieldTaskTypeId)
            .single();

          if (existing) {
            // Atualizar
            await supabaseClient
              .from('service_types')
              .update({
                name: typeName,
                color: typeColor,
                default_duration: defaultDuration,
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            
            console.log(`[field-service-types] Atualizado: ${typeName}`);
          } else {
            // Inserir novo
            await supabaseClient
              .from('service_types')
              .insert({
                company_id,
                name: typeName,
                field_service_id: fieldTaskTypeId,
                color: typeColor,
                default_duration: defaultDuration,
                is_active: true
              });
            
            console.log(`[field-service-types] Criado: ${typeName}`);
          }
          syncedCount++;
        } catch (upsertError) {
          console.error(`[field-service-types] Erro ao sincronizar ${typeName}:`, upsertError);
        }
      }
      
      // Registrar no audit_logs
      await supabaseClient.from('audit_logs').insert({
        company_id,
        entity: 'service_types',
        action: 'task_types_synced',
        metadata_json: { synced_count: syncedCount, source: 'field_control' }
      });
      
      console.log(`[field-service-types] Sincronização concluída: ${syncedCount} tipos`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        services: taskTypes.map((t: any) => ({ 
          id: t.id, 
          name: t.name || t.title,
          color: t.color,
          duration: t.duration || t.defaultDuration
        })),
        synced: sync ? taskTypes.length : 0
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
