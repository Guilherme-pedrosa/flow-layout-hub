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
}

interface SyncRequest {
  auvo_clients: AuvoClient[];
  company_id: string;
  batch_size?: number;
  offset?: number;
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

// Normaliza nome para comparação
function normalizeName(name: string | undefined): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrai palavra principal (primeira palavra significativa)
function getMainWord(name: string): string {
  const normalized = normalizeName(name);
  const words = normalized.split(' ').filter(w => w.length > 2);
  // Pular palavras comuns de razão social
  const skipWords = ['LTDA', 'EIRELI', 'MEI', 'EPP', 'COMERCIO', 'SERVICOS', 'RESTAURANTE', 'BAR', 'LANCHONETE', 'SA', 'SAS'];
  for (const word of words) {
    if (!skipWords.includes(word)) {
      return word;
    }
  }
  return words[0] || '';
}

// Calcula similaridade entre dois nomes (0 a 1)
function nameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  if (n1 === n2) return 1;
  if (!n1 || !n2) return 0;
  
  // Verificar se um contém o outro
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;
  
  // Verificar se a primeira palavra significativa é igual
  const main1 = getMainWord(name1);
  const main2 = getMainWord(name2);
  if (main1 && main2 && main1.length >= 4 && main1 === main2) {
    return 0.85;
  }
  
  // Verificar se primeira palavra de um está contida no outro
  if (main1 && main2 && main1.length >= 4 && (n2.includes(main1) || n1.includes(main2))) {
    return 0.75;
  }
  
  // Comparar palavras em comum
  const words1 = new Set(n1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(n2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let matches = 0;
  for (const word of words1) {
    if (words2.has(word)) matches++;
  }
  
  const similarity = (2 * matches) / (words1.size + words2.size);
  return similarity;
}

// Buscar cliente existente no Field Control pelo CNPJ
async function findExistingCustomerByDocument(
  documentNumber: string,
  apiKey: string
): Promise<string | null> {
  if (!documentNumber || documentNumber.length < 11) return null;
  
  try {
    const response = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?documentNumber=${documentNumber}`,
      {
        method: 'GET',
        headers: { 'X-Api-Key': apiKey }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        console.log(`[sync-auvo] Encontrado cliente existente no Field: ${data[0].id} para CNPJ ${documentNumber}`);
        return data[0].id;
      }
    }
    return null;
  } catch (error) {
    console.error(`[sync-auvo] Erro ao buscar cliente por CNPJ: ${error}`);
    return null;
  }
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
    
    const documentNumber = cleanDocument(record.cpf_cnpj);
    
    const payload = {
      name: displayName,
      documentNumber,
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
    let fieldId = existingSync?.field_id;

    if (fieldId) {
      console.log(`[sync-auvo] Atualizando ${record.id || pessoaId} -> ${fieldId}`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${fieldId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'update';
    } else {
      console.log(`[sync-auvo] Criando ${pessoaId}: ${payload.name}`);
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      action = 'create';
      
      // Se deu erro de CNPJ duplicado, buscar o existente e linkar
      if (response.status === 422) {
        const errorBody = await response.text();
        if (errorBody.includes('document number already exists') || errorBody.includes('documentNumber')) {
          console.log(`[sync-auvo] CNPJ já existe no Field, buscando cliente existente...`);
          const existingFieldId = await findExistingCustomerByDocument(documentNumber, apiKey);
          if (existingFieldId) {
            // Salvar o link
            await supabase.from('field_control_sync').insert({
              company_id: companyId,
              entity_type: 'customer',
              wai_id: pessoaId,
              field_id: existingFieldId,
              last_sync: new Date().toISOString()
            });
            
            // Tentar atualizar o registro existente
            const updateResponse = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${existingFieldId}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(payload)
            });
            
            if (updateResponse.ok) {
              console.log(`[sync-auvo] OK: linked e atualizado ${pessoaId} -> ${existingFieldId}`);
              return { success: true, field_id: existingFieldId, action: 'linked' };
            } else {
              console.log(`[sync-auvo] OK: linked ${pessoaId} -> ${existingFieldId} (sem update)`);
              return { success: true, field_id: existingFieldId, action: 'linked' };
            }
          }
        }
        console.error(`[sync-auvo] Erro 422: ${errorBody}`);
        return { success: false, error: `HTTP 422: ${errorBody}`, action };
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sync-auvo] Erro HTTP ${response.status}: ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}`, action };
    }

    const result = await response.json();
    fieldId = result.id || fieldId;

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

    console.log(`[sync-auvo] Sucesso: ${pessoaId} -> ${fieldId} (${action})`);
    return { success: true, field_id: fieldId, action };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[sync-auvo] Erro: ${msg}`);
    return { success: false, error: msg };
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
    if (!fieldApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIELD_CONTROL_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SyncRequest = await req.json();
    
    if (!payload.auvo_clients || !Array.isArray(payload.auvo_clients)) {
      return new Response(
        JSON.stringify({ success: false, error: 'auvo_clients deve ser um array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batchSize = payload.batch_size || 50;
    const offset = payload.offset || 0;
    const clientsToProcess = payload.auvo_clients.slice(offset, offset + batchSize);

    console.log(`[sync-auvo] Processando ${clientsToProcess.length} clientes AUVO (offset ${offset}, total ${payload.auvo_clients.length})`);

    // Buscar todas as pessoas do ERP
    const { data: erpPessoas, error: pessoasError } = await supabase
      .from('pessoas')
      .select('id, razao_social, nome_fantasia, cpf_cnpj, cep, logradouro, numero, bairro, cidade, estado, telefone, email')
      .eq('company_id', payload.company_id);

    if (pessoasError) {
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar pessoas: ${pessoasError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-auvo] ${erpPessoas?.length || 0} pessoas encontradas no ERP`);

    // Criar mapa de CNPJ -> pessoa
    const cnpjMap = new Map<string, any>();
    for (const pessoa of erpPessoas || []) {
      const cleanedCnpj = cleanDocument(pessoa.cpf_cnpj);
      if (cleanedCnpj && cleanedCnpj.length >= 11) {
        cnpjMap.set(cleanedCnpj, pessoa);
      }
    }

    const results = {
      total_auvo: payload.auvo_clients.length,
      processed: clientsToProcess.length,
      offset,
      matched_by_cnpj: 0,
      matched_by_name: 0,
      not_matched: 0,
      synced: 0,
      sync_errors: 0,
      skipped_no_cep: 0,
      matches: [] as any[],
      errors: [] as any[]
    };

    for (const auvoClient of clientsToProcess) {
      const cleanedCnpj = cleanDocument(auvoClient.cpf_cnpj);
      let matchedPessoa: any = null;
      let matchType = '';

      // 1. Tentar match por CNPJ
      if (cleanedCnpj && cleanedCnpj.length >= 11) {
        matchedPessoa = cnpjMap.get(cleanedCnpj);
        if (matchedPessoa) {
          matchType = 'cnpj';
          results.matched_by_cnpj++;
        }
      }

      // 2. Se não encontrou por CNPJ, tentar por nome similar
      if (!matchedPessoa && auvoClient.nome) {
        let bestMatch: any = null;
        let bestScore = 0;

        for (const pessoa of erpPessoas || []) {
          // Comparar com razao_social e nome_fantasia
          const scoreRazao = nameSimilarity(auvoClient.nome, pessoa.razao_social);
          const scoreFantasia = nameSimilarity(auvoClient.nome, pessoa.nome_fantasia);
          const maxScore = Math.max(scoreRazao, scoreFantasia);
          
          if (maxScore > bestScore && maxScore >= 0.6) { // Threshold de 60% similaridade
            bestScore = maxScore;
            bestMatch = pessoa;
          }
        }

        if (bestMatch) {
          matchedPessoa = bestMatch;
          matchType = 'name';
          results.matched_by_name++;
          console.log(`[sync-auvo] Match por nome: "${auvoClient.nome}" -> "${bestMatch.razao_social || bestMatch.nome_fantasia}" (${(bestScore * 100).toFixed(0)}%)`);
        }
      }

      if (!matchedPessoa) {
        results.not_matched++;
        continue;
      }

      // Verificar se tem CEP válido
      const cep = cleanZipCode(matchedPessoa.cep);
      if (!cep) {
        results.skipped_no_cep++;
        results.matches.push({
          auvo_nome: auvoClient.nome,
          erp_razao: matchedPessoa.razao_social,
          match_type: matchType,
          synced: false,
          reason: 'CEP inválido'
        });
        continue;
      }

      // Atualizar nome_fantasia no ERP se veio do AUVO
      if (auvoClient.nome && auvoClient.nome !== matchedPessoa.nome_fantasia) {
        await supabase
          .from('pessoas')
          .update({ 
            nome_fantasia: auvoClient.nome,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedPessoa.id);
        
        matchedPessoa.nome_fantasia = auvoClient.nome;
      }

      // Sincronizar para o Field Control
      const syncResult = await syncToFieldControl(
        matchedPessoa.id,
        matchedPessoa,
        fieldApiKey,
        supabase,
        payload.company_id
      );

      if (syncResult.success) {
        results.synced++;
        results.matches.push({
          auvo_nome: auvoClient.nome,
          erp_razao: matchedPessoa.razao_social,
          match_type: matchType,
          synced: true,
          field_id: syncResult.field_id,
          action: syncResult.action
        });
      } else {
        results.sync_errors++;
        results.errors.push({
          auvo_nome: auvoClient.nome,
          erp_razao: matchedPessoa.razao_social,
          error: syncResult.error
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const nextOffset = offset + batchSize;
    const hasMore = nextOffset < payload.auvo_clients.length;

    console.log(`[sync-auvo] Batch concluído: ${results.synced} sincronizados, ${results.matched_by_cnpj} por CNPJ, ${results.matched_by_name} por nome`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...results,
        has_more: hasMore,
        next_offset: hasMore ? nextOffset : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[sync-auvo] Erro fatal:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
