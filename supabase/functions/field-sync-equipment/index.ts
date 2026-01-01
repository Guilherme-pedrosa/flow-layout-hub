import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://production.fieldcontrol.com.br/api';

interface FieldEquipment {
  id: string | number;
  name?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  type?: string;
  location?: string;
  sector?: string;
  notes?: string;
  qrCode?: string;
  customerId?: string | number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id, client_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[field-sync-equipment] Iniciando sync para company: ${company_id}, client: ${client_id || 'todos'}`);

    // Buscar API key do Field Control
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .single();

    if (settingsError || !settings?.field_control_api_key) {
      console.error('[field-sync-equipment] API Key não configurada:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Field Control não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = settings.field_control_api_key;

    // Buscar equipamentos do Field Control
    const equipmentsResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!equipmentsResponse.ok) {
      const errorText = await equipmentsResponse.text();
      console.error('[field-sync-equipment] Erro Field API:', equipmentsResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar equipamentos: ${equipmentsResponse.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const equipmentsData = await equipmentsResponse.json();
    console.log('[field-sync-equipment] Resposta Field Control:', JSON.stringify(equipmentsData).slice(0, 500));

    // Extrair lista de equipamentos (pode estar em diferentes formatos)
    let equipments: FieldEquipment[] = [];
    if (Array.isArray(equipmentsData)) {
      equipments = equipmentsData;
    } else if (equipmentsData.data && Array.isArray(equipmentsData.data)) {
      equipments = equipmentsData.data;
    } else if (equipmentsData.items && Array.isArray(equipmentsData.items)) {
      equipments = equipmentsData.items;
    } else if (equipmentsData.equipments && Array.isArray(equipmentsData.equipments)) {
      equipments = equipmentsData.equipments;
    }

    console.log(`[field-sync-equipment] ${equipments.length} equipamentos encontrados`);

    // Se client_id fornecido, buscar o field_id do cliente
    let fieldCustomerId: string | null = null;
    if (client_id) {
      const { data: syncData } = await supabaseClient
        .from('field_control_sync')
        .select('field_id')
        .eq('company_id', company_id)
        .eq('wai_id', client_id)
        .eq('entity_type', 'customer')
        .single();

      if (syncData?.field_id) {
        fieldCustomerId = syncData.field_id;
        console.log(`[field-sync-equipment] Filtrando por cliente Field: ${fieldCustomerId}`);
        
        // Filtrar equipamentos do cliente
        equipments = equipments.filter(e => 
          String(e.customerId) === fieldCustomerId
        );
      }
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const equipment of equipments) {
      try {
        const fieldEquipmentId = String(equipment.id);
        const serialNumber = equipment.serialNumber || equipment.name || `FIELD-${fieldEquipmentId}`;

        // Verificar se já existe
        const { data: existing } = await supabaseClient
          .from('equipments')
          .select('id')
          .eq('company_id', company_id)
          .eq('field_equipment_id', fieldEquipmentId)
          .single();

        // Buscar client_id do WAI se tiver customerId
        let waiClientId: string | null = null;
        if (equipment.customerId) {
          const { data: clientSync } = await supabaseClient
            .from('field_control_sync')
            .select('wai_id')
            .eq('company_id', company_id)
            .eq('field_id', String(equipment.customerId))
            .eq('entity_type', 'customer')
            .single();

          if (clientSync?.wai_id) {
            waiClientId = clientSync.wai_id;
          }
        }

        const equipmentData = {
          company_id,
          client_id: waiClientId,
          serial_number: serialNumber,
          brand: equipment.brand || null,
          model: equipment.model || null,
          equipment_type: equipment.type || null,
          location_description: equipment.location || null,
          sector: equipment.sector || null,
          notes: equipment.notes || null,
          qr_code: equipment.qrCode || null,
          field_equipment_id: fieldEquipmentId,
          is_active: true,
        };

        if (existing) {
          // Update
          await supabaseClient
            .from('equipments')
            .update({ ...equipmentData, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          updated++;
        } else {
          // Insert
          await supabaseClient
            .from('equipments')
            .insert(equipmentData);
          created++;
        }
      } catch (err) {
        console.error(`[field-sync-equipment] Erro no equipamento ${equipment.id}:`, err);
        errors++;
      }
    }

    console.log(`[field-sync-equipment] Concluído: ${created} criados, ${updated} atualizados, ${errors} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        created, 
        updated, 
        errors,
        total: equipments.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-sync-equipment] Erro geral:', error);
    const errMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
