import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br/api';

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

    const body = await req.json().catch(() => ({}));
    const { company_id, client_id } = body;

    // Se company_id for "ALL", buscar todas as empresas com API key configurada
    if (company_id === 'ALL') {
      console.log('[field-sync-equipment] Executando sync para todas as empresas');
      
      const { data: allSettings } = await supabaseClient
        .from('system_settings')
        .select('company_id, field_control_api_key')
        .not('field_control_api_key', 'is', null);

      const results: any[] = [];
      for (const setting of allSettings || []) {
        if (setting.field_control_api_key) {
          try {
            const syncResult = await syncCompanyEquipments(supabaseClient, setting.company_id, setting.field_control_api_key, null);
            results.push({ company_id: setting.company_id, ...syncResult });
          } catch (err) {
            results.push({ company_id: setting.company_id, error: String(err) });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!company_id) {
      return new Response(JSON.stringify({ success: false, error: 'company_id é obrigatório' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { data: settings } = await supabaseClient
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .single();

    if (!settings?.field_control_api_key) {
      return new Response(JSON.stringify({ success: false, error: 'API Key do Field Control não configurada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const result = await syncCompanyEquipments(supabaseClient, company_id, settings.field_control_api_key, client_id);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[field-sync-equipment] Erro:', error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});

async function syncCompanyEquipments(supabaseClient: any, company_id: string, apiKey: string, client_id: string | null) {
  const equipmentsResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });

  if (!equipmentsResponse.ok) {
    return { success: false, error: `Erro Field API: ${equipmentsResponse.status}` };
  }

  const equipmentsData = await equipmentsResponse.json();
  let equipments: FieldEquipment[] = Array.isArray(equipmentsData) ? equipmentsData : (equipmentsData.data || equipmentsData.items || equipmentsData.equipments || []);

  let created = 0, updated = 0, errors = 0;

  for (const equipment of equipments) {
    try {
      const fieldEquipmentId = String(equipment.id);
      const { data: existing } = await supabaseClient.from('equipments').select('id').eq('company_id', company_id).eq('field_equipment_id', fieldEquipmentId).maybeSingle();

      const equipmentData = {
        company_id,
        serial_number: equipment.serialNumber || equipment.name || `FIELD-${fieldEquipmentId}`,
        brand: equipment.brand || null,
        model: equipment.model || null,
        equipment_type: equipment.type || null,
        field_equipment_id: fieldEquipmentId,
        is_active: true,
      };

      if (existing?.id) {
        await supabaseClient.from('equipments').update({ ...equipmentData, updated_at: new Date().toISOString() }).eq('id', existing.id);
        updated++;
      } else {
        await supabaseClient.from('equipments').insert(equipmentData);
        created++;
      }
    } catch (err) {
      errors++;
    }
  }

  return { success: true, created, updated, errors, total: equipments.length };
}
