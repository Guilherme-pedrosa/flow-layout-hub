import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface WorkOrderInput {
  company_id: string;
  service_order_id: string;
  order_number: string | number;
  field_customer_id: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time?: string; // HH:MM
  description?: string;
  equipment_field_ids?: string[];
  technician_ids?: string[];
}

/**
 * FIELD-CREATE-WORK-ORDER
 * 
 * Fluxo: WAI → Field Control
 * 
 * 1. Cria Work Order + Task no Field Control
 * 2. Usa order_number do WAI como identifier no Field
 * 3. Retorna { field_work_order_id, field_task_id, identifier }
 * 4. Salva IDs no WAI
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIELD_CONTROL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIELD_CONTROL_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input: WorkOrderInput = await req.json();

    // Validações
    if (!input.company_id || !input.service_order_id || !input.order_number || !input.field_customer_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios: company_id, service_order_id, order_number, field_customer_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!input.scheduled_date) {
      return new Response(
        JSON.stringify({ success: false, error: 'scheduled_date é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[field-create-work-order] Criando OS ${input.order_number} para customer ${input.field_customer_id}`);

    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    };

    // Formatar data/hora
    const scheduledDate = input.scheduled_date;
    const scheduledTime = input.scheduled_time || '08:00';
    const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;

    // Criar Task no Field Control
    // A API do Field Control usa Tasks como unidade principal
    const taskPayload = {
      identifier: String(input.order_number), // WAI order_number = Field identifier
      customer: {
        id: input.field_customer_id
      },
      scheduledTo: scheduledDateTime,
      description: input.description || `Ordem de Serviço #${input.order_number}`,
      equipments: (input.equipment_field_ids || []).map(id => ({ id })),
      assignees: (input.technician_ids || []).map(id => ({ id }))
    };

    console.log(`[field-create-work-order] Task payload:`, JSON.stringify(taskPayload));

    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(taskPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[field-create-work-order] Erro Field ${response.status}: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro no Field Control: HTTP ${response.status}`,
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    
    const fieldTaskId = result.id;
    const fieldWorkOrderId = result.workOrder?.id || result.workOrderId || null;
    const identifier = result.identifier || String(input.order_number);

    console.log(`[field-create-work-order] Criado: task=${fieldTaskId}, workOrder=${fieldWorkOrderId}, identifier=${identifier}`);

    if (!fieldTaskId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Field Control não retornou task ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar a OS no WAI com os IDs do Field
    const { error: updateError } = await supabase
      .from('service_orders')
      .update({
        field_task_id: fieldTaskId,
        field_order_id: fieldWorkOrderId,
        field_sync_status: 'synced',
        field_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', input.service_order_id)
      .eq('company_id', input.company_id);

    if (updateError) {
      console.error(`[field-create-work-order] Erro atualizando WAI: ${updateError.message}`);
    }

    // Registrar na tabela de sync
    await supabase.from('field_control_sync').upsert({
      company_id: input.company_id,
      entity_type: 'service_order',
      wai_id: input.service_order_id,
      field_id: fieldTaskId,
      last_sync: new Date().toISOString()
    }, { onConflict: 'wai_id,entity_type' });

    return new Response(
      JSON.stringify({ 
        success: true,
        field_work_order_id: fieldWorkOrderId,
        field_task_id: fieldTaskId,
        identifier: identifier
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[field-create-work-order] Erro: ${msg}`);
    
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
