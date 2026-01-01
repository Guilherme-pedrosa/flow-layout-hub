import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

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
  company_id?: string;
}

function cleanDocument(doc: string | undefined): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

function buildFieldControlPayload(record: CustomerRecord) {
  return {
    name: record.razao_social || record.nome_fantasia || 'Cliente sem nome',
    documentNumber: cleanDocument(record.cpf_cnpj),
    externalId: record.id,
    contact: {
      email: record.email || '',
      phone: record.telefone || ''
    },
    address: {
      zipCode: record.cep || '',
      street: record.logradouro || '',
      number: record.numero || '',
      neighborhood: record.bairro || '',
      complement: record.complemento || '',
      city: record.cidade || '',
      state: record.estado || ''
    }
  };
}

async function syncCustomerToField(
  record: CustomerRecord,
  apiKey: string,
  supabase: any
): Promise<{ success: boolean; field_id?: string; error?: string; action?: string }> {
  try {
    const companyId = record.company_id;
    if (!companyId) {
      return { success: false, error: 'company_id não encontrado no registro' };
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
    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    };

    let response: Response;
    let action: string;

    if (existingSync?.field_id) {
      // UPDATE - PUT
      console.log(`[field-sync] Atualizando cliente ${record.id} -> Field ID: ${existingSync.field_id}`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${existingSync.field_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'update';
    } else {
      // CREATE - POST
      console.log(`[field-sync] Criando cliente ${record.id} no Field Control`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'create';
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[field-sync] Erro ${response.status}: ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}`, action };
    }

    const result = await response.json();
    const fieldId = result.id || existingSync?.field_id;

    if (!fieldId) {
      return { success: false, error: 'Field Control não retornou ID', action };
    }

    // Salvar ou atualizar sincronização
    if (action === 'create') {
      const { error: insertError } = await supabase
        .from('field_control_sync')
        .insert({
          company_id: companyId,
          entity_type: 'customer',
          wai_id: record.id,
          field_id: fieldId,
          last_sync: new Date().toISOString()
        });

      if (insertError) {
        console.error(`[field-sync] Erro ao salvar sync: ${insertError.message}`);
      }
    } else {
      const { error: updateError } = await supabase
        .from('field_control_sync')
        .update({ last_sync: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('entity_type', 'customer')
        .eq('wai_id', record.id);

      if (updateError) {
        console.error(`[field-sync] Erro ao atualizar sync: ${updateError.message}`);
      }
    }

    console.log(`[field-sync] Sucesso: ${action} cliente ${record.id} -> Field ID: ${fieldId}`);
    return { success: true, field_id: fieldId, action };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[field-sync] Erro ao sincronizar cliente ${record.id}: ${msg}`);
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
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Modo 2: Sincronizar todas as pessoas de uma empresa (clientes, fornecedores, etc.)
    if (payload.sync_all && payload.company_id) {
      console.log(`[field-sync] Iniciando sync_all para company_id: ${payload.company_id}`);
      
      // Buscar TODAS as pessoas ativas da empresa (clientes, fornecedores, transportadoras, etc.)
      // Muitas vezes clientes são fornecedores e vice-versa
      const { data: pessoas, error: fetchError } = await supabase
        .from('pessoas')
        .select('id, razao_social, nome_fantasia, cpf_cnpj, email, telefone, cep, logradouro, numero, bairro, complemento, cidade, estado, company_id')
        .eq('company_id', payload.company_id)
        .eq('is_active', true);

      if (fetchError) {
        return new Response(
          JSON.stringify({ success: false, error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!pessoas || pessoas.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'Nenhuma pessoa encontrada', synced: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[field-sync] Encontradas ${pessoas.length} pessoas para sincronizar`);

      const results = {
        total: pessoas.length,
        created: 0,
        updated: 0,
        errors: 0,
        details: [] as any[]
      };

      for (const pessoa of pessoas) {
        const result = await syncCustomerToField(pessoa, apiKey, supabase);
        
        if (result.success) {
          if (result.action === 'create') results.created++;
          else results.updated++;
        } else {
          results.errors++;
        }
        
        results.details.push({
          wai_id: pessoa.id,
          nome: pessoa.razao_social || pessoa.nome_fantasia,
          ...result
        });

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`[field-sync] Sync concluído: ${results.created} criados, ${results.updated} atualizados, ${results.errors} erros`);

      return new Response(
        JSON.stringify({ success: true, ...results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Payload inválido. Envie {record: ...} ou {sync_all: true, company_id: ...}' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[field-sync] Erro fatal:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});