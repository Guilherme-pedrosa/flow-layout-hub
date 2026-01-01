import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface AuvoClient {
  codigo?: string;
  nome: string;
  cpf_cnpj?: string;
  razao_social?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  latitude?: number;
  longitude?: number;
}

interface ImportRequest {
  clients: AuvoClient[];
  company_id: string;
  sync_to_field?: boolean; // Se true, sincroniza ao Field Control após importar
}

function cleanDocument(doc: string | undefined): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

function cleanZipCode(cep: string | undefined): string {
  if (!cep) return '';
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8 ? cleaned : '';
}

function cleanPhone(phone: string | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

// Extrair endereço do formato do AUVO
function parseAddress(endereco: string | undefined): { logradouro: string; numero: string; bairro: string; cidade: string; estado: string; cep: string } {
  if (!endereco) return { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' };
  
  // Formato comum: "RUA X, 123, BAIRRO, CIDADE, UF, CEP"
  const parts = endereco.split(',').map(p => p.trim());
  
  // Tenta extrair CEP do último item
  let cep = '';
  const lastPart = parts[parts.length - 1] || '';
  const cepMatch = lastPart.match(/(\d{5}[-.\s]?\d{3})/);
  if (cepMatch) {
    cep = cepMatch[1].replace(/\D/g, '');
  }
  
  return {
    logradouro: parts[0] || '',
    numero: parts[1] || '',
    bairro: parts.length > 3 ? parts[2] : '',
    cidade: parts.length > 4 ? parts[3] : (parts.length > 3 ? parts[2] : ''),
    estado: parts.length > 5 ? parts[4] : (parts.length > 4 ? parts[3] : ''),
    cep
  };
}

async function syncToFieldControl(
  pessoaId: string,
  record: any,
  apiKey: string,
  supabase: any,
  companyId: string
): Promise<{ success: boolean; field_id?: string; action?: string; error?: string }> {
  try {
    // Verificar se já existe sincronização
    const { data: existingSync } = await supabase
      .from('field_control_sync')
      .select('field_id')
      .eq('company_id', companyId)
      .eq('entity_type', 'customer')
      .eq('wai_id', pessoaId)
      .maybeSingle();

    const displayName = record.nome_fantasia?.trim() || record.razao_social?.trim() || 'Cliente sem nome';
    const cleanedCep = cleanZipCode(record.cep);
    
    // Field Control exige CEP válido (8 dígitos)
    if (!cleanedCep) {
      return { success: false, error: 'CEP inválido ou ausente' };
    }
    
    const payload = {
      name: displayName,
      documentNumber: cleanDocument(record.cpf_cnpj),
      externalId: pessoaId,
      contact: {
        email: record.email || '',
        phone: cleanPhone(record.telefone)
      },
      address: {
        zipCode: cleanedCep,
        street: record.logradouro || '',
        number: record.numero || '',
        neighborhood: record.bairro || '',
        complement: record.complemento || '',
        city: record.cidade || '',
        state: record.estado || '',
        coords: {
          latitude: record.latitude || 0,
          longitude: record.longitude || 0
        }
      }
    };

    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    };

    let response: Response;
    let action: string;

    if (existingSync?.field_id) {
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${existingSync.field_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'update';
    } else {
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'create';
    }

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}`, action };
    }

    const result = await response.json();
    const fieldId = result.id || existingSync?.field_id;

    if (!fieldId) {
      return { success: false, error: 'Field Control não retornou ID', action };
    }

    // Salvar sincronização
    if (action === 'create') {
      await supabase
        .from('field_control_sync')
        .insert({
          company_id: companyId,
          entity_type: 'customer',
          wai_id: pessoaId,
          field_id: fieldId,
          last_sync: new Date().toISOString()
        });
    } else {
      await supabase
        .from('field_control_sync')
        .update({ last_sync: new Date().toISOString() })
        .eq('wai_id', pessoaId);
    }

    return { success: true, field_id: fieldId, action };

  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const fieldApiKey = Deno.env.get('FIELD_CONTROL_API_KEY');

    const payload: ImportRequest = await req.json();
    
    if (!payload.clients || !Array.isArray(payload.clients)) {
      return new Response(
        JSON.stringify({ success: false, error: 'clients deve ser um array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[import-auvo] Iniciando importação de ${payload.clients.length} clientes`);

    const results = {
      total: payload.clients.length,
      pessoas_created: 0,
      pessoas_updated: 0,
      field_created: 0,
      field_updated: 0,
      field_errors: 0,
      errors: [] as any[]
    };

    for (const client of payload.clients) {
      try {
        const cleanedCnpj = cleanDocument(client.cpf_cnpj);
        
        // Parsear endereço se não vieram campos separados
        let addressData = {
          logradouro: client.logradouro || '',
          numero: client.numero || '',
          bairro: client.bairro || '',
          cidade: client.cidade || '',
          estado: client.estado || '',
          cep: client.cep || ''
        };
        
        if (client.endereco && (!client.logradouro || !client.cidade)) {
          const parsed = parseAddress(client.endereco);
          addressData = {
            logradouro: client.logradouro || parsed.logradouro,
            numero: client.numero || parsed.numero,
            bairro: client.bairro || parsed.bairro,
            cidade: client.cidade || parsed.cidade,
            estado: client.estado || parsed.estado,
            cep: client.cep || parsed.cep
          };
        }

        // Tentar encontrar pelo CNPJ na base
        let existingPessoa = null;
        if (cleanedCnpj) {
          const { data } = await supabase
            .from('pessoas')
            .select('id, nome_fantasia, razao_social')
            .eq('company_id', payload.company_id)
            .or(`cpf_cnpj.eq.${cleanedCnpj},cpf_cnpj.ilike.%${cleanedCnpj}%`)
            .limit(1)
            .maybeSingle();
          existingPessoa = data;
        }

        let pessoaId: string;
        let pessoaRecord: any;

        if (existingPessoa) {
          // Atualizar pessoa existente - principalmente o nome_fantasia
          pessoaId = existingPessoa.id;
          
          const updateData: any = {
            nome_fantasia: client.nome || existingPessoa.nome_fantasia,
            updated_at: new Date().toISOString()
          };
          
          // Atualizar endereço se tiver
          if (addressData.logradouro) updateData.logradouro = addressData.logradouro;
          if (addressData.numero) updateData.numero = addressData.numero;
          if (addressData.bairro) updateData.bairro = addressData.bairro;
          if (addressData.cidade) updateData.cidade = addressData.cidade;
          if (addressData.estado) updateData.estado = addressData.estado;
          if (addressData.cep) updateData.cep = addressData.cep;
          if (client.telefone) updateData.telefone = client.telefone;
          if (client.email) updateData.email = client.email;

          await supabase
            .from('pessoas')
            .update(updateData)
            .eq('id', pessoaId);

          results.pessoas_updated++;

          pessoaRecord = {
            ...updateData,
            cpf_cnpj: cleanedCnpj,
            razao_social: existingPessoa.razao_social
          };

          console.log(`[import-auvo] Atualizado: ${client.nome} (${cleanedCnpj})`);
        } else {
          // Criar nova pessoa
          const newPessoa = {
            company_id: payload.company_id,
            nome_fantasia: client.nome,
            razao_social: client.razao_social || client.nome,
            cpf_cnpj: cleanedCnpj,
            email: client.email,
            telefone: client.telefone,
            ...addressData,
            is_cliente: true,
            is_active: true
          };

          const { data: inserted, error: insertError } = await supabase
            .from('pessoas')
            .insert(newPessoa)
            .select('id')
            .single();

          if (insertError) {
            console.error(`[import-auvo] Erro ao criar pessoa: ${insertError.message}`);
            results.errors.push({ nome: client.nome, error: insertError.message });
            continue;
          }

          pessoaId = inserted.id;
          pessoaRecord = { ...newPessoa, id: pessoaId };
          results.pessoas_created++;
          
          console.log(`[import-auvo] Criado: ${client.nome} (${cleanedCnpj})`);
        }

        // Sincronizar ao Field Control se solicitado
        if (payload.sync_to_field && fieldApiKey) {
          const fieldResult = await syncToFieldControl(
            pessoaId, 
            pessoaRecord, 
            fieldApiKey, 
            supabase, 
            payload.company_id
          );
          
          if (fieldResult.success) {
            if (fieldResult.action === 'create') results.field_created++;
            else results.field_updated++;
          } else {
            results.field_errors++;
            if (fieldResult.error?.includes('CEP')) {
              // CEP inválido - não é erro crítico
            } else {
              results.errors.push({ nome: client.nome, field_error: fieldResult.error });
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`[import-auvo] Erro no cliente ${client.nome}: ${msg}`);
        results.errors.push({ nome: client.nome, error: msg });
      }
    }

    console.log(`[import-auvo] Concluído: ${results.pessoas_created} pessoas criadas, ${results.pessoas_updated} atualizadas`);
    if (payload.sync_to_field) {
      console.log(`[import-auvo] Field Control: ${results.field_created} criados, ${results.field_updated} atualizados, ${results.field_errors} erros`);
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[import-auvo] Erro fatal:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
