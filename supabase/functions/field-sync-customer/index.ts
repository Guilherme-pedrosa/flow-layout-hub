import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';
const BATCH_SIZE = 50; // Processar 50 por vez para evitar timeout

interface CustomerRecord {
  id: string;
  razao_social?: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cidade?: string;
  estado?: string;
  company_id?: string;
}

interface SyncRequest {
  record?: CustomerRecord;
  sync_all?: boolean;
  sync_pending?: boolean;
  link_existing?: boolean; // Linkar clientes existentes no Field com ERP
  company_id?: string;
  customer_ids?: string[];
  filter_name?: string;
  offset?: number;
  limit?: number;
}

function cleanDocument(doc: string | undefined): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

function buildFieldControlPayload(record: CustomerRecord) {
  const cleanZipCode = (cep: string | null | undefined): string => {
    if (!cep) return '';
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.length === 8 ? cleaned : '';
  };

  const cleanPhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const displayName = record.nome_fantasia?.trim() || record.razao_social?.trim() || 'Cliente sem nome';
  
  // NÃO enviar documentNumber (CNPJ) para evitar erro de duplicidade
  // Usar apenas externalId (ID do ERP) como amarração
  return {
    name: displayName,
    externalId: record.id, // ID do ERP como chave de amarração
    contact: {
      email: record.email || '',
      phone: cleanPhone(record.telefone)
    },
    address: {
      zipCode: cleanZipCode(record.cep),
      street: record.logradouro || '',
      number: record.numero || '',
      neighborhood: record.bairro || '',
      complement: record.complemento || '',
      city: record.cidade || '',
      state: record.estado || '',
      coords: { latitude: 0, longitude: 0 }
    }
  };
}

// Buscar cliente existente no Field Control pelo CNPJ ou externalId
async function findExistingCustomer(
  documentNumber: string,
  externalId: string,
  apiKey: string
): Promise<string | null> {
  const headers = { 'X-Api-Key': apiKey };
  
  // Tentar buscar por externalId primeiro (mais preciso)
  try {
    const extResponse = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?externalId=${externalId}`,
      { method: 'GET', headers }
    );
    
    if (extResponse.ok) {
      const data = await extResponse.json();
      if (data && data.length > 0) {
        console.log(`[field-sync] Encontrado por externalId: ${data[0].id}`);
        return data[0].id;
      }
    }
  } catch (error) {
    console.log(`[field-sync] Erro buscando por externalId: ${error}`);
  }
  
  // Tentar buscar por documento
  if (documentNumber && documentNumber.length >= 11) {
    try {
      const docResponse = await fetch(
        `${FIELD_CONTROL_BASE_URL}/customers?documentNumber=${documentNumber}`,
        { method: 'GET', headers }
      );
      
      if (docResponse.ok) {
        const data = await docResponse.json();
        if (data && data.length > 0) {
          console.log(`[field-sync] Encontrado por CNPJ: ${data[0].id}`);
          return data[0].id;
        }
      }
    } catch (error) {
      console.log(`[field-sync] Erro buscando por CNPJ: ${error}`);
    }
  }
  
  // Buscar todos e filtrar localmente (último recurso, limitado)
  try {
    const allResponse = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?limit=1000`,
      { method: 'GET', headers }
    );
    
    if (allResponse.ok) {
      const data = await allResponse.json();
      if (data && data.length > 0) {
        // Buscar por externalId
        const byExternal = data.find((c: any) => c.externalId === externalId);
        if (byExternal) {
          console.log(`[field-sync] Encontrado na lista por externalId: ${byExternal.id}`);
          return byExternal.id;
        }
        
        // Buscar por documento
        if (documentNumber) {
          const byDoc = data.find((c: any) => c.documentNumber === documentNumber);
          if (byDoc) {
            console.log(`[field-sync] Encontrado na lista por CNPJ: ${byDoc.id}`);
            return byDoc.id;
          }
        }
      }
    }
  } catch (error) {
    console.log(`[field-sync] Erro buscando lista: ${error}`);
  }
  
  return null;
}

async function syncCustomerToField(
  record: CustomerRecord,
  apiKey: string,
  supabase: any
): Promise<{ success: boolean; field_id?: string; error?: string; action?: string }> {
  try {
    const companyId = record.company_id;
    if (!companyId) {
      return { success: false, error: 'company_id não encontrado' };
    }

    // Verificar se já existe sincronização
    const { data: existingSync } = await supabase
      .from('field_control_sync')
      .select('field_id')
      .eq('company_id', companyId)
      .eq('entity_type', 'customer')
      .eq('wai_id', record.id)
      .maybeSingle();

    const payload = buildFieldControlPayload(record);
    
    // Validar CEP antes de enviar
    if (!payload.address.zipCode) {
      console.log(`[field-sync] Pulando ${record.id} - CEP inválido`);
      return { success: false, error: 'CEP inválido ou vazio' };
    }

    // Validar nome mínimo (Field Control exige 6 caracteres)
    if (payload.name.length < 6) {
      console.log(`[field-sync] Pulando ${record.id} - Nome muito curto: ${payload.name}`);
      return { success: false, error: 'Nome deve ter pelo menos 6 caracteres' };
    }

    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    };

    let response: Response;
    let action: string;
    let fieldId = existingSync?.field_id;

    if (fieldId) {
      // Já tem sync, apenas atualiza
      console.log(`[field-sync] Atualizando ${record.id} -> ${fieldId}`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${fieldId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'update';
    } else {
      // Tentar criar
      console.log(`[field-sync] Criando ${record.id}: ${payload.name}`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'create';
      
      // Se deu erro 422 (antes era CNPJ duplicado, agora pode ser outro motivo)
      if (response.status === 422) {
        const errorBody = await response.text();
        console.log(`[field-sync] Erro 422: ${errorBody}`);
        
        // Tentar buscar por externalId e linkar
        const existingFieldId = await findExistingCustomer('', record.id, apiKey);
        if (existingFieldId) {
          // Salvar o link e tentar atualizar
          await supabase.from('field_control_sync').insert({
            company_id: companyId,
            entity_type: 'customer',
            wai_id: record.id,
            field_id: existingFieldId,
            last_sync: new Date().toISOString()
          });
          
          // Agora atualizar o registro existente
          const updateResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${existingFieldId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          
          if (updateResponse.ok) {
            console.log(`[field-sync] OK: linked e atualizado ${record.id} -> ${existingFieldId}`);
            return { success: true, field_id: existingFieldId, action: 'linked' };
          } else {
            console.log(`[field-sync] OK: linked ${record.id} -> ${existingFieldId} (sem update)`);
            return { success: true, field_id: existingFieldId, action: 'linked' };
          }
        }
        
        return { success: false, error: `HTTP 422: ${errorBody}`, action };
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[field-sync] Erro ${response.status}: ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}`, action };
    }

    const result = await response.json();
    fieldId = result.id || fieldId;

    if (!fieldId) {
      return { success: false, error: 'Field Control não retornou ID', action };
    }

    // Salvar sincronização
    if (action === 'create') {
      await supabase.from('field_control_sync').insert({
        company_id: companyId,
        entity_type: 'customer',
        wai_id: record.id,
        field_id: fieldId,
        last_sync: new Date().toISOString()
      });
    } else {
      await supabase.from('field_control_sync')
        .update({ last_sync: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('entity_type', 'customer')
        .eq('wai_id', record.id);
    }

    console.log(`[field-sync] OK: ${action} ${record.id} -> ${fieldId}`);
    return { success: true, field_id: fieldId, action };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[field-sync] Erro ${record.id}: ${msg}`);
    return { success: false, error: msg };
  }
}

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

    const payload: SyncRequest = await req.json();

    // Modo 1: Sincronizar um único registro
    if (payload.record) {
      const result = await syncCustomerToField(payload.record, apiKey, supabase);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Modo 2: Linkar clientes existentes no Field Control com o ERP (OTIMIZADO)
    if (payload.link_existing && payload.company_id) {
      const batchPage = payload.offset || 0; // Página do Field Control a processar
      console.log(`[field-sync] link_existing: buscando página ${batchPage + 1} do Field Control...`);
      
      // Buscar UMA página do Field Control por vez
      const pageSize = 100;
      const response = await fetch(
        `${FIELD_CONTROL_BASE_URL}/customers?page=${batchPage + 1}&limit=${pageSize}`,
        { method: 'GET', headers: { 'X-Api-Key': apiKey } }
      );
      
      if (!response.ok) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Erro buscando Field: ${response.status}` 
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      const data = await response.json();
      const fieldCustomers = Array.isArray(data) ? data : (data?.customers || data?.items || data?.data || []);
      
      console.log(`[field-sync] Página ${batchPage + 1}: ${fieldCustomers.length} clientes do Field`);
      
      if (fieldCustomers.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Fim das páginas do Field Control',
          page: batchPage,
          linked: 0,
          has_more: false
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      // Buscar pessoas do ERP (uma vez só - cache)
      const { data: pessoas } = await supabase
        .from('pessoas')
        .select('id, cpf_cnpj')
        .eq('company_id', payload.company_id);
      
      // Buscar todos os links existentes
      const { data: existingLinks } = await supabase
        .from('field_control_sync')
        .select('wai_id')
        .eq('company_id', payload.company_id)
        .eq('entity_type', 'customer');
      
      const existingSet = new Set((existingLinks || []).map(l => l.wai_id));
      
      // Criar mapa CNPJ -> pessoa
      const cnpjMap = new Map<string, string>();
      for (const p of pessoas || []) {
        const cleanCnpj = cleanDocument(p.cpf_cnpj);
        if (cleanCnpj) cnpjMap.set(cleanCnpj, p.id);
      }
      
      // Preparar inserts em batch
      const toInsert: any[] = [];
      
      for (const fc of fieldCustomers) {
        const cleanDoc = cleanDocument(fc.documentNumber);
        const pessoaId = cnpjMap.get(cleanDoc);
        
        if (pessoaId && !existingSet.has(pessoaId)) {
          toInsert.push({
            company_id: payload.company_id,
            entity_type: 'customer',
            wai_id: pessoaId,
            field_id: fc.id,
            last_sync: new Date().toISOString()
          });
          existingSet.add(pessoaId); // Evitar duplicatas neste batch
        }
      }
      
      // Insert em batch
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('field_control_sync')
          .upsert(toInsert, { onConflict: 'wai_id,entity_type' });
        
        if (insertError) {
          console.error(`[field-sync] Erro insert: ${insertError.message}`);
        } else {
          console.log(`[field-sync] Linked ${toInsert.length} clientes na página ${batchPage + 1}`);
        }
      }
      
      const hasMore = fieldCustomers.length >= pageSize;
      
      return new Response(JSON.stringify({ 
        success: true, 
        page: batchPage,
        field_in_page: fieldCustomers.length,
        erp_total: pessoas?.length || 0,
        linked: toInsert.length,
        has_more: hasMore,
        next_offset: hasMore ? batchPage + 1 : null
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Modo 3: Sincronizar por filtro de nome
    if (payload.filter_name && payload.company_id) {
      console.log(`[field-sync] Filtro: ${payload.filter_name}`);
      
      const { data: pessoas } = await supabase
        .from('pessoas')
        .select('id, razao_social, nome_fantasia, cpf_cnpj, email, telefone, cep, logradouro, numero, bairro, complemento, cidade, estado, company_id')
        .eq('company_id', payload.company_id)
        .eq('is_active', true)
        .or(`nome_fantasia.ilike.%${payload.filter_name}%,razao_social.ilike.%${payload.filter_name}%`);

      const results = { total: pessoas?.length || 0, created: 0, updated: 0, errors: 0 };

      for (const pessoa of pessoas || []) {
        const result = await syncCustomerToField(pessoa, apiKey, supabase);
        if (result.success) {
          if (result.action === 'create') results.created++;
          else results.updated++;
        } else {
          results.errors++;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      return new Response(JSON.stringify({ success: true, ...results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // NOVO Modo 4: Sincronizar APENAS os pendentes (que não estão em field_control_sync)
    if (payload.sync_pending && payload.company_id) {
      const limit = payload.limit || BATCH_SIZE;
      const offset = payload.offset || 0;
      
      console.log(`[field-sync] sync_pending: offset=${offset}, limit=${limit}`);

      // Buscar IDs já sincronizados
      const { data: syncedIds } = await supabase
        .from('field_control_sync')
        .select('wai_id')
        .eq('company_id', payload.company_id)
        .eq('entity_type', 'customer');

      const syncedIdSet = new Set((syncedIds || []).map(s => s.wai_id));
      console.log(`[field-sync] Já sincronizados: ${syncedIdSet.size}`);

      // Buscar pessoas com CEP válido que ainda não foram sincronizadas
      const { data: pessoas, error: fetchError } = await supabase
        .from('pessoas')
        .select('id, razao_social, nome_fantasia, cpf_cnpj, email, telefone, cep, logradouro, numero, bairro, complemento, cidade, estado, company_id')
        .eq('company_id', payload.company_id)
        .eq('is_active', true)
        .not('cep', 'is', null)
        .neq('cep', '')
        .order('created_at', { ascending: true });

      if (fetchError) {
        return new Response(JSON.stringify({ success: false, error: fetchError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Filtrar os que ainda não foram sincronizados e têm CEP válido (8 dígitos)
      const pendingPessoas = (pessoas || []).filter(p => {
        if (syncedIdSet.has(p.id)) return false;
        const cleanCep = (p.cep || '').replace(/\D/g, '');
        return cleanCep.length === 8;
      });

      console.log(`[field-sync] Total pendentes com CEP válido: ${pendingPessoas.length}`);

      // Aplicar paginação
      const batch = pendingPessoas.slice(offset, offset + limit);
      console.log(`[field-sync] Processando batch: ${batch.length} registros`);

      const results = { 
        total_pending: pendingPessoas.length,
        batch_size: batch.length,
        offset,
        created: 0, 
        updated: 0, 
        errors: 0,
        next_offset: offset + batch.length < pendingPessoas.length ? offset + batch.length : null,
        has_more: offset + batch.length < pendingPessoas.length
      };

      for (const pessoa of batch) {
        const result = await syncCustomerToField(pessoa, apiKey, supabase);
        if (result.success) {
          if (result.action === 'create') results.created++;
          else results.updated++;
        } else {
          results.errors++;
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      }

      console.log(`[field-sync] Batch concluído: ${results.created} criados, ${results.errors} erros. has_more=${results.has_more}`);
      return new Response(JSON.stringify({ success: true, ...results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Modo 5: sync_all (mantido para compatibilidade, mas recomenda-se usar sync_pending)
    if (payload.sync_all && payload.company_id) {
      const limit = payload.limit || BATCH_SIZE;
      const offset = payload.offset || 0;
      
      console.log(`[field-sync] sync_all: offset=${offset}, limit=${limit}`);
      
      const { data: pessoas, error: fetchError } = await supabase
        .from('pessoas')
        .select('id, razao_social, nome_fantasia, cpf_cnpj, email, telefone, cep, logradouro, numero, bairro, complemento, cidade, estado, company_id')
        .eq('company_id', payload.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (fetchError) {
        return new Response(JSON.stringify({ success: false, error: fetchError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Contar total
      const { count } = await supabase
        .from('pessoas')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', payload.company_id)
        .eq('is_active', true);

      const results = { 
        total: count || 0,
        batch_size: pessoas?.length || 0,
        offset,
        created: 0, 
        updated: 0, 
        errors: 0,
        next_offset: offset + (pessoas?.length || 0) < (count || 0) ? offset + (pessoas?.length || 0) : null,
        has_more: offset + (pessoas?.length || 0) < (count || 0)
      };

      for (const pessoa of pessoas || []) {
        const result = await syncCustomerToField(pessoa, apiKey, supabase);
        if (result.success) {
          if (result.action === 'create') results.created++;
          else results.updated++;
        } else {
          results.errors++;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`[field-sync] Batch: ${results.created + results.updated} processados, ${results.errors} erros. has_more=${results.has_more}`);
      return new Response(JSON.stringify({ success: true, ...results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Payload inválido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[field-sync] Erro fatal:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
