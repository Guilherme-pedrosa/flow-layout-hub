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

    const { service_order_id, company_id } = await req.json();

    if (!service_order_id || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'service_order_id e company_id são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[field-create-task] Criando tarefa para OS ${service_order_id}`);

    // 1. Buscar API key do Field Control
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .single();

    if (settingsError || !settings?.field_control_api_key) {
      console.error('[field-create-task] API Key não configurada:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Field Control não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = settings.field_control_api_key;

    // 2. Buscar dados da OS
    const { data: serviceOrder, error: osError } = await supabaseClient
      .from('service_orders')
      .select(`
        *,
        cliente:clientes(id, razao_social, nome_fantasia),
        equipment:equipments(id, field_equipment_id, serial_number, model)
      `)
      .eq('id', service_order_id)
      .single();

    if (osError || !serviceOrder) {
      console.error('[field-create-task] OS não encontrada:', osError);
      return new Response(
        JSON.stringify({ success: false, error: 'Ordem de Serviço não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Se já tem field_task_id, retornar erro
    if (serviceOrder.field_task_id) {
      console.log('[field-create-task] OS já possui tarefa:', serviceOrder.field_task_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta OS já possui uma tarefa no Field Control',
          field_task_id: serviceOrder.field_task_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Buscar field_id do cliente no sync
    let fieldCustomerId: string | null = null;
    if (serviceOrder.cliente_id) {
      const { data: syncData } = await supabaseClient
        .from('field_control_sync')
        .select('field_id')
        .eq('company_id', company_id)
        .eq('wai_id', serviceOrder.cliente_id)
        .eq('entity_type', 'customer')
        .single();

      if (syncData?.field_id) {
        fieldCustomerId = syncData.field_id;
      }
    }

    // 4. Buscar field_equipment_id do equipamento
    let fieldEquipmentId: string | null = null;
    if (serviceOrder.equipment?.field_equipment_id) {
      fieldEquipmentId = serviceOrder.equipment.field_equipment_id;
    }

    // 5. Montar payload para o Field Control
    const osNumber = serviceOrder.order_number || serviceOrder.id.substring(0, 8);
    const clientName = serviceOrder.cliente?.razao_social || serviceOrder.cliente?.nome_fantasia || 'Cliente';
    
    const taskPayload: any = {
      title: `OS #${osNumber}`,
      description: serviceOrder.description || `Ordem de Serviço #${osNumber} - ${clientName}`,
    };

    // Adicionar cliente se tiver
    if (fieldCustomerId) {
      taskPayload.customer = { id: fieldCustomerId };
    }

    // Adicionar equipamento se tiver
    if (fieldEquipmentId) {
      taskPayload.equipment = { id: fieldEquipmentId };
    }

    // Adicionar data/hora agendada se tiver
    if (serviceOrder.scheduled_date) {
      taskPayload.scheduledDate = serviceOrder.scheduled_date;
    }
    if (serviceOrder.scheduled_time) {
      // Converter time para formato HH:mm
      const timeStr = serviceOrder.scheduled_time;
      taskPayload.scheduledTime = timeStr.substring(0, 5); // "HH:mm"
    }

    console.log('[field-create-task] Payload:', JSON.stringify(taskPayload));

    // 6. Criar tarefa no Field Control
    const createResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[field-create-task] Erro ao criar tarefa:', createResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro ao criar tarefa no Field Control: ${createResponse.status}`,
          details: errorText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const responseData = await createResponse.json();
    const fieldTaskId = responseData.id || responseData.data?.id;

    console.log('[field-create-task] Tarefa criada:', fieldTaskId);

    // 7. Atualizar OS com o field_task_id
    if (fieldTaskId) {
      const { error: updateError } = await supabaseClient
        .from('service_orders')
        .update({ 
          field_task_id: String(fieldTaskId),
          updated_at: new Date().toISOString()
        })
        .eq('id', service_order_id);

      if (updateError) {
        console.error('[field-create-task] Erro ao atualizar OS:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        field_task_id: fieldTaskId,
        message: 'Tarefa criada com sucesso no Field Control'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-create-task] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
