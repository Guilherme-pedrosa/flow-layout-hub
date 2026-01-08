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
 * Busca e sincroniza tipos de OS (task-types/services) do Field Control
 * 
 * Endpoints possíveis do Field Control:
 * - GET /services - lista serviços/tipos de tarefa
 * - GET /activities - lista tipos de atividades
 * - GET /categories - lista categorias
 * 
 * Vamos tentar múltiplos endpoints até encontrar o correto
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

    // Buscar API key da variável de ambiente
    const apiKey = Deno.env.get('FIELD_CONTROL_API_KEY');
    if (!apiKey) {
      console.log('[field-service-types] API Key não configurada no ambiente');
      return new Response(
        JSON.stringify({ success: false, error: 'FIELD_CONTROL_API_KEY não configurada', services: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[field-service-types] API Key encontrada, buscando tipos...');

    // Lista de endpoints para tentar buscar tipos de tarefa
    const endpointsToTry = [
      '/services',           // Serviços (mais comum)
      '/activities',         // Atividades
      '/activity-types',     // Tipos de atividade
      '/categories',         // Categorias
      '/order-types',        // Tipos de ordem
      '/work-order-types',   // Tipos de ordem de trabalho
    ];

    let services: any[] = [];
    let successEndpoint = '';

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[field-service-types] Tentando endpoint: ${endpoint}`);
        
        const response = await fetch(`${FIELD_CONTROL_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const items = data.items || data.data || data.services || data.activities || data || [];
          
          if (Array.isArray(items) && items.length > 0) {
            services = items;
            successEndpoint = endpoint;
            console.log(`[field-service-types] Sucesso! Endpoint ${endpoint} retornou ${items.length} tipos`);
            break;
          } else {
            console.log(`[field-service-types] Endpoint ${endpoint} retornou dados vazios ou formato inválido`);
          }
        } else {
          console.log(`[field-service-types] Endpoint ${endpoint} retornou status ${response.status}`);
        }
      } catch (endpointError) {
        console.log(`[field-service-types] Erro ao tentar ${endpoint}:`, endpointError);
      }
    }

    if (services.length === 0) {
      console.log('[field-service-types] Nenhum endpoint retornou tipos válidos');
      
      // Último recurso: buscar uma task existente para ver o formato do taskType
      console.log('[field-service-types] Tentando buscar tasks para extrair tipos...');
      
      try {
        const tasksResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/tasks?limit=50`, {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          const tasks = tasksData.items || tasksData.data || tasksData || [];
          console.log(`[field-service-types] Encontradas ${tasks.length} tasks`);
          
          // Extrair tipos únicos das tasks
          const typesMap = new Map();
          for (const task of tasks) {
            const taskType = task.taskType || task.service || task.activityType || task.type;
            if (taskType && taskType.id) {
              typesMap.set(taskType.id, {
                id: taskType.id,
                name: taskType.name || taskType.title || `Tipo ${taskType.id}`,
                color: taskType.color
              });
            }
          }
          
          services = Array.from(typesMap.values());
          successEndpoint = '/tasks (extraído)';
          console.log(`[field-service-types] Extraídos ${services.length} tipos das tasks`);
        }
      } catch (tasksError) {
        console.error('[field-service-types] Erro ao buscar tasks:', tasksError);
      }
    }

    console.log(`[field-service-types] ${services.length} tipos de OS encontrados via ${successEndpoint}`);

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
            // Atualizar - incluindo field_task_type_id
            await supabaseClient
              .from('service_types')
              .update({
                name: serviceName,
                color: serviceColor,
                default_duration: defaultDuration,
                field_task_type_id: fieldServiceId, // Salvar também como task_type_id
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            
            console.log(`[field-service-types] Atualizado: ${serviceName} (field_task_type_id: ${fieldServiceId})`);
          } else {
            // Inserir novo - incluindo field_task_type_id
            await supabaseClient
              .from('service_types')
              .insert({
                company_id,
                name: serviceName,
                field_service_id: fieldServiceId,
                field_task_type_id: fieldServiceId, // Salvar também como task_type_id
                color: serviceColor,
                default_duration: defaultDuration,
                is_active: true
              });
            
            console.log(`[field-service-types] Criado: ${serviceName} (field_task_type_id: ${fieldServiceId})`);
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
        metadata_json: { synced_count: syncedCount, source: 'field_control', endpoint: successEndpoint }
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
        synced: sync ? services.length : 0,
        endpoint: successEndpoint
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
