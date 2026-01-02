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

    const { company_id, equipment_id } = await req.json();

    if (!company_id || !equipment_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id e equipment_id são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[field-create-equipment] Enviando equipamento ${equipment_id} para Field Control`);

    // Buscar API key do Field Control
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .single();

    if (settingsError || !settings?.field_control_api_key) {
      console.error('[field-create-equipment] API Key não configurada:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Field Control não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = settings.field_control_api_key;

    // Buscar o equipamento
    const { data: equipment, error: equipmentError } = await supabaseClient
      .from('equipments')
      .select(`
        *,
        client:clientes(id, razao_social)
      `)
      .eq('id', equipment_id)
      .single();

    if (equipmentError || !equipment) {
      console.error('[field-create-equipment] Equipamento não encontrado:', equipmentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Equipamento não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Buscar o field_id do cliente (se tiver cliente associado)
    let fieldCustomerId: string | null = null;
    if (equipment.client_id) {
      const { data: syncData } = await supabaseClient
        .from('field_control_sync')
        .select('field_id')
        .eq('company_id', company_id)
        .eq('wai_id', equipment.client_id)
        .eq('entity_type', 'customer')
        .single();

      if (syncData?.field_id) {
        fieldCustomerId = syncData.field_id;
      }
    }

    // Preparar payload para o Field Control
    const fieldPayload: any = {
      serialNumber: equipment.serial_number,
      brand: equipment.brand || undefined,
      model: equipment.model || undefined,
      type: equipment.equipment_type || undefined,
      location: equipment.location_description || undefined,
      sector: equipment.sector || undefined,
      notes: equipment.notes || undefined,
      qrCode: equipment.qr_code || undefined,
    };

    if (fieldCustomerId) {
      fieldPayload.customerId = fieldCustomerId;
    }

    // Verificar se já existe no Field Control
    if (equipment.field_equipment_id) {
      // Atualizar
      console.log(`[field-create-equipment] Atualizando equipamento ${equipment.field_equipment_id}`);
      
      const updateResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments/${equipment.field_equipment_id}`, {
        method: 'PUT',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fieldPayload),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('[field-create-equipment] Erro ao atualizar:', updateResponse.status, errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao atualizar no Field Control: ${updateResponse.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: 'updated', field_equipment_id: equipment.field_equipment_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Criar novo
      console.log(`[field-create-equipment] Criando novo equipamento:`, JSON.stringify(fieldPayload));
      
      const createResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fieldPayload),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[field-create-equipment] Erro ao criar:', createResponse.status, errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao criar no Field Control: ${createResponse.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const responseData = await createResponse.json();
      const fieldEquipmentId = responseData.id || responseData.data?.id;

      if (fieldEquipmentId) {
        // Atualizar o equipamento com o field_equipment_id
        await supabaseClient
          .from('equipments')
          .update({ 
            field_equipment_id: String(fieldEquipmentId),
            updated_at: new Date().toISOString()
          })
          .eq('id', equipment_id);

        console.log(`[field-create-equipment] Equipamento criado com ID: ${fieldEquipmentId}`);
      }

      return new Response(
        JSON.stringify({ success: true, action: 'created', field_equipment_id: fieldEquipmentId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[field-create-equipment] Erro geral:', error);
    const errMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
