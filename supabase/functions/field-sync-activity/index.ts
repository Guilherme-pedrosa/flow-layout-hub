import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface ServiceOrderData {
  id: string;
  order_number: number;
  client_id: string;
  technician_id?: string;
  delivery_date?: string;
  scheduled_time?: string;
  estimated_duration?: number;
  equipment_type?: string;
  equipment_brand?: string;
  equipment_model?: string;
  equipment_serial?: string;
  reported_issue?: string;
  diagnosis?: string;
  observations?: string;
  total_value?: number;
  company_id: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { service_order_id, company_id } = body;

    console.log(`[field-sync-activity] Iniciando sync para OS ${service_order_id}`);

    if (!service_order_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'service_order_id e company_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar credenciais do Field Control
    const { data: credentials, error: credError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('company_id', company_id)
      .eq('setting_key', 'field_control_api_key')
      .single();

    if (credError || !credentials?.setting_value) {
      console.error('[field-sync-activity] API Key do Field Control não configurada');
      return new Response(
        JSON.stringify({ error: 'API Key do Field Control não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = credentials.setting_value;

    // Buscar dados completos da OS
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        *,
        clientes:client_id (
          id,
          razao_social,
          nome_fantasia,
          cpf_cnpj,
          telefone,
          email,
          logradouro,
          numero,
          bairro,
          cidade,
          estado,
          cep
        ),
        technician:technician_id (
          id,
          name,
          field_employee_id
        ),
        service_type:service_type_id (
          id,
          name,
          field_service_id,
          default_duration
        ),
        equipment:equipment_id (
          id,
          serial_number,
          brand,
          model,
          equipment_type,
          location_description
        )
      `)
      .eq('id', service_order_id)
      .single();

    if (orderError || !order) {
      console.error('[field-sync-activity] OS não encontrada:', orderError);
      return new Response(
        JSON.stringify({ error: 'OS não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já foi sincronizada
    if (order.field_order_id) {
      console.log(`[field-sync-activity] OS ${order.order_number} já sincronizada: ${order.field_order_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OS já sincronizada',
          field_order_id: order.field_order_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar field_id do cliente na tabela de sync
    const { data: clientSync } = await supabase
      .from('field_control_sync')
      .select('field_id')
      .eq('wai_id', order.client_id)
      .eq('entity_type', 'customer')
      .single();

    if (!clientSync?.field_id) {
      console.error('[field-sync-activity] Cliente não sincronizado com Field Control');
      
      // Marcar como erro
      await supabase
        .from('service_orders')
        .update({ 
          field_sync_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', service_order_id);

      return new Response(
        JSON.stringify({ error: 'Cliente não sincronizado com Field Control. Sincronize o cliente primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar payload da atividade para o Field Control
    const scheduledDate = order.delivery_date || new Date().toISOString().split('T')[0];
    const scheduledTime = order.scheduled_time || '09:00';
    const duration = order.estimated_duration || 60;

    // Montar descrição completa
    const descriptionParts = [];
    descriptionParts.push(`OS #${order.order_number}`);
    
    // Adicionar tipo de serviço se disponível
    if (order.service_type?.name) {
      descriptionParts.push(`\n🏷️ TIPO: ${order.service_type.name}`);
    }
    
    // Usar dados do equipamento cadastrado se disponível, senão usar campos manuais
    const equipType = order.equipment?.equipment_type || order.equipment_type;
    const equipBrand = order.equipment?.brand || order.equipment_brand;
    const equipModel = order.equipment?.model || order.equipment_model;
    const equipSerial = order.equipment?.serial_number || order.equipment_serial;
    const equipLocation = order.equipment?.location_description;
    
    if (equipType || equipBrand || equipModel) {
      descriptionParts.push(`\n\n📦 EQUIPAMENTO:`);
      if (equipType) descriptionParts.push(`Tipo: ${equipType}`);
      if (equipBrand) descriptionParts.push(`Marca: ${equipBrand}`);
      if (equipModel) descriptionParts.push(`Modelo: ${equipModel}`);
      if (equipSerial) descriptionParts.push(`Série: ${equipSerial}`);
      if (equipLocation) descriptionParts.push(`Local: ${equipLocation}`);
    }

    if (order.reported_issue) {
      descriptionParts.push(`\n\n🔧 PROBLEMA RELATADO:\n${order.reported_issue}`);
    }

    if (order.diagnosis) {
      descriptionParts.push(`\n\n📋 DIAGNÓSTICO:\n${order.diagnosis}`);
    }

    if (order.observations) {
      descriptionParts.push(`\n\n📝 OBSERVAÇÕES:\n${order.observations}`);
    }

    if (order.total_value > 0) {
      descriptionParts.push(`\n\n💰 VALOR: R$ ${order.total_value.toFixed(2)}`);
    }

    const activityPayload: Record<string, any> = {
      customerId: clientSync.field_id,
      identifier: `OS-${order.order_number}`,
      description: descriptionParts.join('\n'),
      scheduledTo: `${scheduledDate}T${scheduledTime}:00`,
      duration: duration,
      externalId: order.id
    };

    // Adicionar service_id do Field se o tipo de serviço tiver mapeamento
    if (order.service_type?.field_service_id) {
      activityPayload.serviceId = order.service_type.field_service_id;
    }

    // Se tiver técnico com field_employee_id, atribuir
    if (order.technician?.field_employee_id) {
      activityPayload.assignedEmployeeId = order.technician.field_employee_id;
    }

    console.log('[field-sync-activity] Payload:', JSON.stringify(activityPayload, null, 2));

    // Criar atividade no Field Control
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify(activityPayload)
    });

    const responseText = await response.text();
    console.log(`[field-sync-activity] Response ${response.status}: ${responseText}`);

    if (!response.ok) {
      console.error('[field-sync-activity] Erro ao criar atividade:', responseText);
      
      // Marcar como erro
      await supabase
        .from('service_orders')
        .update({ 
          field_sync_status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', service_order_id);

      return new Response(
        JSON.stringify({ error: `Erro Field Control: ${responseText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldResponse = JSON.parse(responseText);
    const fieldOrderId = fieldResponse.id || fieldResponse.orderId;

    console.log(`[field-sync-activity] Atividade criada: ${fieldOrderId}`);

    // Atualizar a OS com o ID do Field
    await supabase
      .from('service_orders')
      .update({
        field_order_id: fieldOrderId,
        field_synced_at: new Date().toISOString(),
        field_sync_status: 'synced',
        updated_at: new Date().toISOString()
      })
      .eq('id', service_order_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        field_order_id: fieldOrderId,
        message: `OS #${order.order_number} sincronizada com sucesso!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-sync-activity] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
