import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface SyncEquipmentsInput {
  company_id: string;
  field_customer_id?: string; // Se informado, busca só desse cliente
  wai_customer_id?: string; // Cliente WAI para vincular equipamentos
  sync_all?: boolean; // Sincronizar todos os equipamentos
}

/**
 * FIELD-SYNC-EQUIPMENTS
 * 
 * Fluxo: Field Control → WAI
 * 
 * 1. Busca equipamentos do Field por field_customer_id
 * 2. Atualiza/insere na tabela equipments do WAI
 * 3. Campos: field_equipment_id, serial_number, model, brand, type, notes
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

    const input: SyncEquipmentsInput = await req.json();

    if (!input.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = { 'X-Api-Key': apiKey };
    let equipments: any[] = [];

    if (input.field_customer_id) {
      // Buscar equipamentos de um cliente específico
      console.log(`[field-sync-equipments] Buscando equipamentos do customer ${input.field_customer_id}`);
      
      const response = await fetch(
        `${FIELD_CONTROL_BASE_URL}/customers/${input.field_customer_id}/equipments`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        // Tentar endpoint alternativo
        const altResponse = await fetch(
          `${FIELD_CONTROL_BASE_URL}/equipments?customerId=${input.field_customer_id}`,
          { method: 'GET', headers }
        );

        if (altResponse.ok) {
          const data = await altResponse.json();
          equipments = Array.isArray(data) ? data : (data?.items || data?.equipments || []);
        }
      } else {
        const data = await response.json();
        equipments = Array.isArray(data) ? data : (data?.items || data?.equipments || []);
      }
    } else if (input.sync_all) {
      // Buscar todos os equipamentos
      console.log(`[field-sync-equipments] Buscando todos os equipamentos`);
      
      const response = await fetch(
        `${FIELD_CONTROL_BASE_URL}/equipments?limit=1000`,
        { method: 'GET', headers }
      );

      if (response.ok) {
        const data = await response.json();
        equipments = Array.isArray(data) ? data : (data?.items || data?.equipments || []);
      }
    }

    console.log(`[field-sync-equipments] Encontrados ${equipments.length} equipamentos`);

    if (equipments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: 0,
          message: 'Nenhum equipamento encontrado no Field Control'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar cliente WAI pelo field_customer_id (se não informado diretamente)
    let waiCustomerId = input.wai_customer_id;
    
    if (!waiCustomerId && input.field_customer_id) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('company_id', input.company_id)
        .eq('field_customer_id', input.field_customer_id)
        .maybeSingle();

      waiCustomerId = cliente?.id;
    }

    let synced = 0;
    let errors = 0;

    for (const eq of equipments) {
      try {
        const fieldEquipmentId = eq.id;
        const serialNumber = eq.number || eq.serialNumber || eq.serial || `FIELD-${fieldEquipmentId}`;
        const model = eq.name || eq.model || '';
        const brand = eq.brand || '';
        const equipmentType = eq.type?.name || eq.typeName || eq.type || '';
        const notes = eq.notes || eq.description || '';

        // Verificar se já existe pelo field_equipment_id
        const { data: existing } = await supabase
          .from('equipments')
          .select('id')
          .eq('company_id', input.company_id)
          .eq('field_equipment_id', fieldEquipmentId)
          .maybeSingle();

        if (existing) {
          // Atualizar
          await supabase
            .from('equipments')
            .update({
              serial_number: serialNumber,
              model: model,
              brand: brand,
              equipment_type: equipmentType,
              notes: notes,
              client_id: waiCustomerId || existing.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Inserir
          await supabase
            .from('equipments')
            .insert({
              company_id: input.company_id,
              client_id: waiCustomerId,
              field_equipment_id: fieldEquipmentId,
              serial_number: serialNumber,
              model: model,
              brand: brand,
              equipment_type: equipmentType,
              notes: notes,
              is_active: true
            });
        }

        synced++;
      } catch (err) {
        console.error(`[field-sync-equipments] Erro equipamento ${eq.id}: ${err}`);
        errors++;
      }
    }

    console.log(`[field-sync-equipments] Sincronizados: ${synced}, Erros: ${errors}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        synced,
        errors,
        total_field: equipments.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[field-sync-equipments] Erro: ${msg}`);
    
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
