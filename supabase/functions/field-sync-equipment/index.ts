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
}

interface FieldEquipmentType {
  id: string;
  name: string;
}

interface FieldCustomer {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
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

    // Buscar API key para a empresa específica
    const { data: settings, error: settingsError } = await supabaseClient
      .from('system_settings')
      .select('field_control_api_key')
      .eq('company_id', company_id)
      .maybeSingle();

    console.log('[field-sync-equipment] Settings:', settings, 'Error:', settingsError);

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

// Buscar tipos de equipamento do Field Control
async function fetchEquipmentTypes(apiKey: string): Promise<Map<string, string>> {
  const typeMap = new Map<string, string>();
  try {
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/equipment-types`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      const types: FieldEquipmentType[] = Array.isArray(data) ? data : (data.items || data.data || []);
      console.log('[field-sync-equipment] Tipos encontrados:', types.length);
      for (const t of types) {
        typeMap.set(t.id, t.name);
      }
    }
  } catch (err) {
    console.error('[field-sync-equipment] Erro ao buscar tipos:', err);
  }
  return typeMap;
}

// Buscar e sincronizar clientes do Field Control
async function syncAndGetCustomers(supabaseClient: any, company_id: string, apiKey: string): Promise<Map<string, string>> {
  const customerMap = new Map<string, string>(); // field_id -> wai_id
  
  try {
    // Buscar clientes do Field Control
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.log('[field-sync-equipment] Erro ao buscar customers:', response.status);
      return customerMap;
    }
    
    const data = await response.json();
    const customers: FieldCustomer[] = Array.isArray(data) ? data : (data.items || data.data || []);
    console.log('[field-sync-equipment] Customers encontrados:', customers.length);
    
    for (const customer of customers) {
      const fieldCustomerId = String(customer.id);
      
      // Verificar se já existe sync
      const { data: existingSync } = await supabaseClient
        .from('field_control_sync')
        .select('wai_id')
        .eq('company_id', company_id)
        .eq('field_id', fieldCustomerId)
        .eq('entity_type', 'customer')
        .maybeSingle();
      
      if (existingSync?.wai_id) {
        customerMap.set(fieldCustomerId, existingSync.wai_id);
        continue;
      }
      
      // Buscar cliente no WAI pelo documento
      let clienteId: string | null = null;
      if (customer.document) {
        const doc = customer.document.replace(/\D/g, '');
        const { data: existingCliente } = await supabaseClient
          .from('clientes')
          .select('id')
          .eq('company_id', company_id)
          .or(`cpf_cnpj.eq.${doc},cpf_cnpj.ilike.%${doc}%`)
          .maybeSingle();
        
        if (existingCliente?.id) {
          clienteId = existingCliente.id;
        }
      }
      
      // Se não encontrou, criar cliente
      if (!clienteId) {
        const tipoPessoa = customer.document && customer.document.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF';
        const { data: newCliente, error: insertError } = await supabaseClient
          .from('clientes')
          .insert({
            company_id,
            razao_social: customer.name,
            nome_fantasia: customer.name,
            cpf_cnpj: customer.document?.replace(/\D/g, '') || null,
            email: customer.email || null,
            telefone: customer.phone || null,
            logradouro: customer.address?.street || null,
            numero: customer.address?.number || null,
            complemento: customer.address?.complement || null,
            bairro: customer.address?.neighborhood || null,
            cidade: customer.address?.city || null,
            estado: customer.address?.state || null,
            cep: customer.address?.zipCode?.replace(/\D/g, '') || null,
            tipo_pessoa: tipoPessoa,
            status: 'ativo',
          })
          .select('id')
          .single();
        
        if (newCliente?.id) {
          clienteId = newCliente.id;
          console.log('[field-sync-equipment] Cliente criado:', customer.name);
        } else {
          console.error('[field-sync-equipment] Erro ao criar cliente:', insertError);
        }
      }
      
      // Salvar sync
      if (clienteId) {
        await supabaseClient.from('field_control_sync').upsert({
          company_id,
          field_id: fieldCustomerId,
          entity_type: 'customer',
          wai_id: clienteId,
          last_sync: new Date().toISOString(),
        }, { onConflict: 'company_id,field_id,entity_type' });
        
        customerMap.set(fieldCustomerId, clienteId);
      }
    }
  } catch (err) {
    console.error('[field-sync-equipment] Erro ao sincronizar customers:', err);
  }
  
  return customerMap;
}

// Buscar customer específico da API do Field Control e sincronizar
async function fetchAndSyncCustomer(supabaseClient: any, company_id: string, apiKey: string, fieldCustomerId: string): Promise<string | null> {
  try {
    // Buscar customer específico da API do Field Control
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${fieldCustomerId}`, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.log(`[field-sync-equipment] Erro ao buscar customer ${fieldCustomerId}:`, response.status);
      return null;
    }
    
    const customer: FieldCustomer = await response.json();
    console.log(`[field-sync-equipment] Customer encontrado: ${customer.name}`);
    
    // Buscar cliente no WAI pelo documento
    let clienteId: string | null = null;
    if (customer.document) {
      const doc = customer.document.replace(/\D/g, '');
      const { data: existingCliente } = await supabaseClient
        .from('clientes')
        .select('id')
        .eq('company_id', company_id)
        .or(`cpf_cnpj.eq.${doc},cpf_cnpj.ilike.%${doc}%`)
        .maybeSingle();
      
      if (existingCliente?.id) {
        clienteId = existingCliente.id;
      }
    }
    
    // Se não encontrou pelo documento, buscar pelo nome
    if (!clienteId && customer.name) {
      const { data: existingByName } = await supabaseClient
        .from('clientes')
        .select('id')
        .eq('company_id', company_id)
        .or(`razao_social.ilike.%${customer.name}%,nome_fantasia.ilike.%${customer.name}%`)
        .maybeSingle();
      
      if (existingByName?.id) {
        clienteId = existingByName.id;
      }
    }
    
    // Se não encontrou, criar cliente
    if (!clienteId) {
      const tipoPessoa = customer.document && customer.document.replace(/\D/g, '').length > 11 ? 'PJ' : 'PF';
      const { data: newCliente, error: insertError } = await supabaseClient
        .from('clientes')
        .insert({
          company_id,
          razao_social: customer.name,
          nome_fantasia: customer.name,
          cpf_cnpj: customer.document?.replace(/\D/g, '') || null,
          email: customer.email || null,
          telefone: customer.phone || null,
          logradouro: customer.address?.street || null,
          numero: customer.address?.number || null,
          complemento: customer.address?.complement || null,
          bairro: customer.address?.neighborhood || null,
          cidade: customer.address?.city || null,
          estado: customer.address?.state || null,
          cep: customer.address?.zipCode?.replace(/\D/g, '') || null,
          tipo_pessoa: tipoPessoa,
          status: 'ativo',
        })
        .select('id')
        .single();
      
      if (newCliente?.id) {
        clienteId = newCliente.id;
        console.log(`[field-sync-equipment] Cliente criado: ${customer.name}`);
      } else {
        console.error(`[field-sync-equipment] Erro ao criar cliente:`, insertError);
        return null;
      }
    }
    
    // Salvar sync
    if (clienteId) {
      await supabaseClient.from('field_control_sync').upsert({
        company_id,
        field_id: fieldCustomerId,
        entity_type: 'customer',
        wai_id: clienteId,
        last_sync: new Date().toISOString(),
      }, { onConflict: 'company_id,field_id,entity_type' });
      
      console.log(`[field-sync-equipment] Sync criado: Field ${fieldCustomerId} -> WAI ${clienteId}`);
    }
    
    return clienteId;
  } catch (err) {
    console.error(`[field-sync-equipment] Erro ao buscar/sincronizar customer ${fieldCustomerId}:`, err);
    return null;
  }
}

async function syncCompanyEquipments(supabaseClient: any, company_id: string, apiKey: string, client_id: string | null) {
  // Primeiro, buscar tipos de equipamento e sincronizar clientes
  console.log('[field-sync-equipment] Buscando tipos de equipamento e clientes...');
  const [typeMap, customerMap] = await Promise.all([
    fetchEquipmentTypes(apiKey),
    syncAndGetCustomers(supabaseClient, company_id, apiKey),
  ]);
  
  console.log('[field-sync-equipment] Types mapeados:', typeMap.size, 'Customers mapeados:', customerMap.size);

  // Buscar equipamentos
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
  console.log('[field-sync-equipment] Raw response keys:', Object.keys(equipmentsData));
  
  let equipments: FieldEquipment[] = Array.isArray(equipmentsData) ? equipmentsData : (equipmentsData.data || equipmentsData.items || equipmentsData.equipments || []);
  console.log('[field-sync-equipment] Total equipments from API:', equipments.length);

  let created = 0, updated = 0, errors = 0;
  const errorDetails: string[] = [];

  for (const equipment of equipments) {
    try {
      const fieldEquipmentId = String(equipment.id);
      
      // Log para debug - ver estrutura do customer
      console.log(`[field-sync-equipment] Equipment ${equipment.number || fieldEquipmentId}: customer =`, equipment.customer);
      
      const { data: existing } = await supabaseClient.from('equipments').select('id').eq('company_id', company_id).eq('field_equipment_id', fieldEquipmentId).maybeSingle();

      // Buscar client_id do mapa de clientes sincronizados
      let clientId: string | null = null;
      if (equipment.customer?.id) {
        const fieldCustomerId = String(equipment.customer.id);
        clientId = customerMap.get(fieldCustomerId) || null;
        
        // Fallback: buscar na tabela de sync
        if (!clientId) {
          const { data: syncData } = await supabaseClient
            .from('field_control_sync')
            .select('wai_id')
            .eq('company_id', company_id)
            .eq('field_id', fieldCustomerId)
            .eq('entity_type', 'customer')
            .maybeSingle();
          
          if (syncData?.wai_id) {
            clientId = syncData.wai_id;
          }
        }
        
        // Fallback 2: buscar customer da API do Field e criar/vincular
        if (!clientId) {
          console.log(`[field-sync-equipment] Customer ${fieldCustomerId} não encontrado no mapa, buscando da API...`);
          clientId = await fetchAndSyncCustomer(supabaseClient, company_id, apiKey, fieldCustomerId);
        }
      }

      // Buscar nome do tipo
      const typeName = equipment.type?.id ? typeMap.get(equipment.type.id) : null;

      const equipmentData: any = {
        company_id,
        serial_number: equipment.number || `FIELD-${fieldEquipmentId}`,
        model: equipment.name || null,
        equipment_type: typeName || null,
        notes: equipment.notes || null,
        field_equipment_id: fieldEquipmentId,
        is_active: !equipment.archived,
        sector: equipment.locationSector || null,
        environment: equipment.locationEnvironment || null,
        location_description: equipment.location || null,
        qr_code: equipment.qrCode || null,
      };

      if (clientId) {
        equipmentData.client_id = clientId;
      }

      if (existing?.id) {
        const { error: updateError } = await supabaseClient.from('equipments').update({ ...equipmentData, updated_at: new Date().toISOString() }).eq('id', existing.id);
        if (updateError) {
          console.error('[field-sync-equipment] Erro update:', updateError);
          throw updateError;
        }
        updated++;
      } else {
        const { error: insertError } = await supabaseClient.from('equipments').insert(equipmentData);
        if (insertError) {
          console.error('[field-sync-equipment] Erro insert:', insertError, 'Data:', equipmentData);
          throw insertError;
        }
        created++;
      }
    } catch (err: any) {
      console.log('[field-sync-equipment] CATCH erro ao processar:', err?.message || err);
      errorDetails.push(err?.message || String(err));
      errors++;
    }
  }

  console.log('[field-sync-equipment] Resultado final:', { created, updated, errors, total: equipments.length });
  return { success: true, created, updated, errors, total: equipments.length, customersCreated: customerMap.size, errorDetails: errorDetails.slice(0, 5) };
}
