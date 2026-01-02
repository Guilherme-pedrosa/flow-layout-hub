import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface FieldEmployee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { service_order_id, company_id, field_order_id } = body;

    console.log(`[field-fetch-technicians] Buscando técnicos para OS ${service_order_id}, Field Order: ${field_order_id}`);

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
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
      console.error('[field-fetch-technicians] API Key do Field Control não configurada');
      return new Response(
        JSON.stringify({ error: 'API Key do Field Control não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = credentials.setting_value;

    // Se não tiver field_order_id, buscar da OS
    let orderId = field_order_id;
    if (!orderId && service_order_id) {
      const { data: order } = await supabase
        .from('service_orders')
        .select('field_order_id')
        .eq('id', service_order_id)
        .single();
      
      orderId = order?.field_order_id;
    }

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'OS não está sincronizada com Field Control' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar detalhes da atividade no Field Control
    console.log(`[field-fetch-technicians] Buscando atividade ${orderId} no Field Control`);
    
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[field-fetch-technicians] Erro ao buscar atividade:', errorText);
      return new Response(
        JSON.stringify({ error: `Erro Field Control: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldOrder = await response.json();
    console.log('[field-fetch-technicians] Dados da atividade:', JSON.stringify(fieldOrder, null, 2));

    // Extrair técnicos da atividade
    // O Field Control pode retornar assignedEmployees ou assignedUsers
    const technicians: FieldEmployee[] = [];
    
    // Formato 1: assignedEmployees (array de objetos)
    if (fieldOrder.assignedEmployees && Array.isArray(fieldOrder.assignedEmployees)) {
      for (const emp of fieldOrder.assignedEmployees) {
        technicians.push({
          id: emp.id || emp.employeeId,
          name: emp.name || emp.fullName || 'Técnico',
          email: emp.email,
          phone: emp.phone || emp.cellPhone
        });
      }
    }

    // Formato 2: assignedEmployee (único objeto)
    if (fieldOrder.assignedEmployee && typeof fieldOrder.assignedEmployee === 'object') {
      const emp = fieldOrder.assignedEmployee;
      technicians.push({
        id: emp.id || emp.employeeId,
        name: emp.name || emp.fullName || 'Técnico',
        email: emp.email,
        phone: emp.phone || emp.cellPhone
      });
    }

    // Formato 3: employees (array de IDs)
    if (fieldOrder.employees && Array.isArray(fieldOrder.employees) && technicians.length === 0) {
      // Se tiver apenas IDs, buscar detalhes de cada funcionário
      for (const empId of fieldOrder.employees) {
        try {
          const empResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/employees/${empId}`, {
            headers: { 'X-Api-Key': apiKey }
          });
          if (empResponse.ok) {
            const emp = await empResponse.json();
            technicians.push({
              id: emp.id,
              name: emp.name || emp.fullName || 'Técnico',
              email: emp.email,
              phone: emp.phone || emp.cellPhone
            });
          }
        } catch (e) {
          console.error(`[field-fetch-technicians] Erro ao buscar funcionário ${empId}:`, e);
        }
      }
    }

    console.log(`[field-fetch-technicians] ${technicians.length} técnico(s) encontrado(s)`);

    // Atualizar a OS com os técnicos
    if (service_order_id && technicians.length > 0) {
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          field_technicians: technicians,
          updated_at: new Date().toISOString()
        })
        .eq('id', service_order_id);

      if (updateError) {
        console.error('[field-fetch-technicians] Erro ao atualizar OS:', updateError);
      } else {
        console.log('[field-fetch-technicians] OS atualizada com técnicos');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        technicians,
        field_order: {
          id: fieldOrder.id,
          status: fieldOrder.status,
          scheduledTo: fieldOrder.scheduledTo
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-fetch-technicians] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
