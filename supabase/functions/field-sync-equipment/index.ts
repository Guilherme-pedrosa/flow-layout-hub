import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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
  location?: string;
  locationSector?: string;
  locationEnvironment?: string;
  qrCode?: string;
  archived?: boolean;
  avatarUrl?: string;
  brand?: string;
}

/**
 * FIELD-SYNC-EQUIPMENT (v3 - Otimizado para 2000+ equipamentos)
 * 
 * Otimizações:
 * 1. Busca todos equipamentos em paralelo (paginação rápida)
 * 2. Carrega customers e syncs existentes em batch
 * 3. Upsert em lotes de 100
 * 4. Timeout-safe: salva progresso parcial
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_TIME = 50000; // 50 segundos (deixa margem para finalizar)

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { company_id } = body;

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar API key
    const { data: settings } = await supabase
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .maybeSingle();

    if (!settings?.field_control_api_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Field Control não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = settings.field_control_api_key;
    const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };

    console.log('[field-sync-equipment] Iniciando sync para company:', company_id);

    // FASE 0: Buscar equipment-types para mapear ID → nome
    const typeMap = new Map<string, string>();
    try {
      const typesResp = await fetch(`${FIELD_CONTROL_BASE_URL}/equipment-types`, { method: 'GET', headers });
      if (typesResp.ok) {
        const typesData = await typesResp.json();
        const types = typesData.items || typesData.data || (Array.isArray(typesData) ? typesData : []);
        for (const t of types) {
          if (t.id && t.name) typeMap.set(String(t.id), t.name);
        }
        console.log('[field-sync-equipment] Equipment types mapeados:', typeMap.size);
      }
    } catch (e) {
      console.log('[field-sync-equipment] Erro ao buscar types:', e);
    }

    // FASE 1: Buscar TODOS os equipamentos do Field (paginação rápida)
    const allEquipments: FieldEquipment[] = [];
    let offset = 0;
    const pageSize = 100;
    let totalExpected = 0;

    console.log('[field-sync-equipment] Buscando equipamentos do Field...');
    
    while (true) {
      if (Date.now() - startTime > MAX_TIME) {
        console.log('[field-sync-equipment] Timeout na busca, processando parcial');
        break;
      }

      const response = await fetch(
        `${FIELD_CONTROL_BASE_URL}/equipments?offset=${offset}&limit=${pageSize}`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        console.error('[field-sync-equipment] Erro API:', response.status);
        break;
      }

      const data = await response.json();
      
      if (offset === 0) {
        totalExpected = data.totalCount || 0;
        console.log('[field-sync-equipment] Total esperado da API:', totalExpected);
        // Log da estrutura do primeiro equipamento para debug
        if (data.items?.[0]) {
          console.log('[field-sync-equipment] Estrutura equipamento:', JSON.stringify(data.items[0]).substring(0, 500));
        }
      }

      const items: FieldEquipment[] = data.items || data.data || [];
      
      if (items.length === 0) break;
      
      allEquipments.push(...items);
      offset += items.length;

      if (offset % 500 === 0) {
        console.log(`[field-sync-equipment] Buscados ${allEquipments.length}/${totalExpected}`);
      }

      if (allEquipments.length >= totalExpected || items.length < pageSize) break;
    }

    console.log('[field-sync-equipment] Total equipamentos buscados:', allEquipments.length);

    // FASE 2: Carregar dados existentes em batch
    console.log('[field-sync-equipment] Carregando dados existentes...');

    // Equipamentos existentes
    const { data: existingEquipments } = await supabase
      .from('equipments')
      .select('id, field_equipment_id')
      .eq('company_id', company_id)
      .not('field_equipment_id', 'is', null);

    const existingMap = new Map<string, string>();
    for (const eq of existingEquipments || []) {
      if (eq.field_equipment_id) {
        existingMap.set(eq.field_equipment_id, eq.id);
      }
    }
    console.log('[field-sync-equipment] Equipamentos existentes:', existingMap.size);

    // Syncs de customers existentes
    const { data: customerSyncs } = await supabase
      .from('field_control_sync')
      .select('field_id, wai_id')
      .eq('company_id', company_id)
      .eq('entity_type', 'customer');

    const customerMap = new Map<string, string>();
    for (const sync of customerSyncs || []) {
      customerMap.set(sync.field_id, sync.wai_id);
    }
    console.log('[field-sync-equipment] Customers mapeados:', customerMap.size);

    // Clientes existentes por field_customer_id
    const { data: clientesWithField } = await supabase
      .from('clientes')
      .select('id, field_customer_id')
      .eq('company_id', company_id)
      .not('field_customer_id', 'is', null);

    for (const c of clientesWithField || []) {
      if (c.field_customer_id && !customerMap.has(c.field_customer_id)) {
        customerMap.set(c.field_customer_id, c.id);
      }
    }
    console.log('[field-sync-equipment] Total customers após clientes:', customerMap.size);

    // FASE 3: Processar equipamentos usando UPSERT (muito mais rápido)
    let processed = 0, errors = 0;
    const BATCH_SIZE = 100;
    const missingCustomers = new Set<string>();

    for (let i = 0; i < allEquipments.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > MAX_TIME) {
        console.log('[field-sync-equipment] Timeout no processamento, salvando parcial');
        break;
      }

      const batch = allEquipments.slice(i, i + BATCH_SIZE);
      const records: any[] = [];

      for (const eq of batch) {
        const fieldEquipmentId = String(eq.id);
        const existingId = existingMap.get(fieldEquipmentId);

        // Buscar client_id
        let clientId: string | null = null;
        if (eq.customer?.id) {
          const fieldCustomerId = String(eq.customer.id);
          clientId = customerMap.get(fieldCustomerId) || null;
          
          if (!clientId) {
            missingCustomers.add(fieldCustomerId);
          }
        }

        // Mapear tipo pelo ID se existir
        const typeName = eq.type?.id ? typeMap.get(String(eq.type.id)) : eq.type?.name;

        const record: any = {
          company_id,
          serial_number: eq.number || `FIELD-${fieldEquipmentId}`,
          model: eq.name || null,
          brand: eq.brand || null,
          equipment_type: typeName || null,
          notes: eq.notes || null,
          field_equipment_id: fieldEquipmentId,
          is_active: !eq.archived,
          sector: eq.locationSector || null,
          environment: eq.locationEnvironment || null,
          location_description: eq.location || null,
          qr_code: eq.qrCode || null,
          image_url: eq.avatarUrl || null,
          client_id: clientId,
          sync_status: 'synced',
          sync_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Se existe, incluir ID para upsert
        if (existingId) {
          record.id = existingId;
        }

        records.push(record);
      }

      // UPSERT em batch (muito mais rápido que insert/update individual)
      const { error: upsertError } = await supabase
        .from('equipments')
        .upsert(records, { 
          onConflict: 'company_id,field_equipment_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('[field-sync-equipment] Erro batch upsert:', upsertError.message);
        errors += records.length;
      } else {
        processed += records.length;
      }

      if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= allEquipments.length) {
        console.log(`[field-sync-equipment] Processados ${Math.min(i + BATCH_SIZE, allEquipments.length)}/${allEquipments.length}`);
      }
    }

    // FASE 4: Buscar customers faltantes (em background para não travar)
    if (missingCustomers.size > 0 && Date.now() - startTime < MAX_TIME - 5000) {
      console.log('[field-sync-equipment] Buscando', missingCustomers.size, 'customers faltantes...');
      
      const customersToSync = Array.from(missingCustomers).slice(0, 50); // Limita a 50
      
      for (const fieldCustomerId of customersToSync) {
        if (Date.now() - startTime > MAX_TIME - 2000) break;

        try {
          const response = await fetch(
            `${FIELD_CONTROL_BASE_URL}/customers/${fieldCustomerId}`,
            { method: 'GET', headers }
          );

          if (response.ok) {
            const customer = await response.json();
            
            // Criar cliente no WAI
            const tipoPessoa = customer.document && customer.document.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF';
            const { data: newCliente } = await supabase
              .from('clientes')
              .insert({
                company_id,
                razao_social: customer.name,
                nome_fantasia: customer.name,
                cpf_cnpj: customer.document?.replace(/\D/g, '') || null,
                email: customer.contact?.email || null,
                telefone: customer.contact?.phone || null,
                logradouro: customer.address?.street || null,
                numero: customer.address?.number || null,
                bairro: customer.address?.neighborhood || null,
                cidade: customer.address?.city || null,
                estado: customer.address?.state || null,
                cep: customer.address?.zipCode?.replace(/\D/g, '') || null,
                tipo_pessoa: tipoPessoa,
                field_customer_id: fieldCustomerId,
                status: 'ATIVO',
              })
              .select('id')
              .single();

            if (newCliente?.id) {
              // Registrar sync
              await supabase.from('field_control_sync').insert({
                company_id,
                entity_type: 'customer',
                field_id: fieldCustomerId,
                wai_id: newCliente.id,
              });

              // Atualizar equipamentos deste customer
              await supabase
                .from('equipments')
                .update({ client_id: newCliente.id })
                .eq('company_id', company_id)
                .is('client_id', null)
                .in('field_equipment_id', 
                  allEquipments
                    .filter(e => String(e.customer?.id) === fieldCustomerId)
                    .map(e => String(e.id))
                );

              console.log('[field-sync-equipment] Customer criado:', customer.name);
            }
          }
        } catch (err) {
          console.error('[field-sync-equipment] Erro ao buscar customer:', err);
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log('[field-sync-equipment] Finalizado em', elapsed, 'ms:', { processed, errors, total: allEquipments.length });

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        total: allEquipments.length,
        totalExpected,
        missingCustomers: missingCustomers.size,
        elapsed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[field-sync-equipment] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
