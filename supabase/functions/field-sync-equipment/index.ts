import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface FieldEquipment {
  id: string;
  name?: string;
  number?: string;
  notes?: string;
  customer?: { id: string };
  type?: { id: string; name?: string };
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
    headers: { 
      'x-api-key': apiKey,
      'Content-Type': 'application/json' 
    },
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

      // Buscar client_id se tiver customer no Field
      let clientId: string | null = null;
      if (equipment.customer?.id) {
        const { data: syncData } = await supabaseClient
          .from('field_control_sync')
          .select('wai_id')
          .eq('company_id', company_id)
          .eq('field_id', equipment.customer.id)
          .eq('entity_type', 'customer')
          .maybeSingle();
        
        if (syncData?.wai_id) {
          clientId = syncData.wai_id;
        }
      }

      const equipmentData: any = {
        company_id,
        serial_number: equipment.number || equipment.name || `FIELD-${fieldEquipmentId}`,
        equipment_type: equipment.type?.name || equipment.type?.id || null,
        notes: equipment.notes || null,
        field_equipment_id: fieldEquipmentId,
        is_active: true,
      };

      if (clientId) {
        equipmentData.client_id = clientId;
      }

      if (existing?.id) {
        await supabaseClient.from('equipments').update({ ...equipmentData, updated_at: new Date().toISOString() }).eq('id', existing.id);
        updated++;
      } else {
        await supabaseClient.from('equipments').insert(equipmentData);
        created++;
      }
    } catch (err) {
      console.error('[field-sync-equipment] Erro ao processar equipamento:', err);
      errors++;
    }
  }

  return { success: true, created, updated, errors, total: equipments.length };
}
