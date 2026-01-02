import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = "https://gestaoclick.com/api";

async function fetchGestaoClick(
  endpoint: string, 
  page: number = 1,
  accessToken: string,
  secretToken: string
): Promise<any> {
  const url = `${GC_BASE_URL}/${endpoint}?pagina=${page}`;
  console.log(`[GestaoClick] Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Access-Token': accessToken,
      'Secret-Access-Token': secretToken,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error(`[GestaoClick] Error ${response.status}: ${text}`);
    throw new Error(`API Error: ${response.status} - ${text}`);
  }
  
  return response.json();
}

function normalizeCpfCnpj(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d]/g, '');
  // Validar tamanho mínimo (CPF = 11, CNPJ = 14)
  if (cleaned.length < 11) return null;
  return cleaned;
}

function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d]/g, '');
  if (cleaned.length < 8) return null;
  return cleaned;
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.includes('@') || !trimmed.includes('.')) return null;
  return trimmed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter secrets do ambiente
    const gcAccessToken = Deno.env.get('GC_ACCESS_TOKEN');
    const gcSecret = Deno.env.get('GC_SECRET');
    
    if (!gcAccessToken || !gcSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais do Gestão Click não configuradas. Configure os secrets GC_ACCESS_TOKEN e GC_SECRET.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['full', 'clientes', 'fornecedores', 'transportadoras', 'clean'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'action deve ser: full, clientes, fornecedores, transportadoras ou clean' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[migrate-gestaoclick] Iniciando migração - action: ${action}, company_id: ${company_id}`);

    // Limpar registros inválidos
    if (action === 'clean' || action === 'full') {
      const { data: deleted } = await supabase
        .from('pessoas')
        .delete()
        .eq('company_id', company_id)
        .or('cpf_cnpj.is.null,cpf_cnpj.eq.')
        .select('id');

      console.log(`[migrate-gestaoclick] Registros sem CPF/CNPJ removidos: ${deleted?.length || 0}`);
    }

    if (action === 'clean') {
      return new Response(
        JSON.stringify({ success: true, message: 'Limpeza concluída' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = {
      clientes: { total: 0, importados: 0, atualizados: 0, erros: 0, detalhes: [] as string[] },
      fornecedores: { total: 0, importados: 0, atualizados: 0, erros: 0, detalhes: [] as string[] },
      transportadoras: { total: 0, importados: 0, atualizados: 0, erros: 0, detalhes: [] as string[] }
    };

    // Função para processar uma pessoa
    // IMPORTANTE: Cada registro do Gestão Click é importado individualmente,
    // mesmo que tenha o mesmo CNPJ (filiais, unidades diferentes, etc.)
    async function processarPessoa(
      pessoa: any, 
      tipo: 'cliente' | 'fornecedor' | 'transportadora'
    ): Promise<'importado' | 'atualizado' | 'erro'> {
      try {
        const cpfCnpj = normalizeCpfCnpj(pessoa.cnpj || pessoa.cpf);
        const nomeFantasia = pessoa.nome?.trim() || null;
        const razaoSocial = pessoa.razao_social?.trim() || nomeFantasia;
        const gcId = pessoa.id?.toString() || null; // ID do Gestão Click para identificar registro único

        // Validar dados mínimos
        if (!cpfCnpj) {
          console.log(`[migrate-gestaoclick] Ignorado - sem CPF/CNPJ válido: ${razaoSocial || 'N/A'}`);
          return 'erro';
        }

        if (!razaoSocial && !nomeFantasia) {
          console.log(`[migrate-gestaoclick] Ignorado - sem nome: ${cpfCnpj}`);
          return 'erro';
        }

        // Buscar endereço principal
        const endereco = pessoa.enderecos?.[0]?.endereco || {};

        // Determinar tipo_pessoa baseado no tamanho do documento
        const tipoPessoa = cpfCnpj.length === 11 ? 'PF' : 'PJ';

        const pessoaData = {
          company_id,
          tipo_pessoa: tipoPessoa,
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia !== razaoSocial ? nomeFantasia : null,
          cpf_cnpj: cpfCnpj,
          inscricao_estadual: pessoa.inscricao_estadual || null,
          inscricao_municipal: pessoa.inscricao_municipal || null,
          telefone: normalizePhone(pessoa.telefone) || normalizePhone(pessoa.celular),
          email: normalizeEmail(pessoa.email),
          cep: endereco.cep?.replace(/[^\d]/g, '') || null,
          logradouro: endereco.logradouro || null,
          numero: endereco.numero || null,
          complemento: endereco.complemento || null,
          bairro: endereco.bairro || null,
          cidade: endereco.nome_cidade || endereco.cidade || null,
          estado: endereco.estado || null,
          is_active: pessoa.ativo !== '0',
          is_cliente: tipo === 'cliente',
          is_fornecedor: tipo === 'fornecedor',
          is_transportadora: tipo === 'transportadora',
          external_id: gcId, // Guardar o ID do Gestão Click para referência
        };

        // Verificar se já existe pelo ID externo do Gestão Click (identificador único real)
        let existingPessoa = null;
        if (gcId) {
          const { data } = await supabase
            .from('pessoas')
            .select('id, is_cliente, is_fornecedor, is_transportadora')
            .eq('company_id', company_id)
            .eq('external_id', gcId)
            .maybeSingle();
          existingPessoa = data;
        }

        if (existingPessoa) {
          // Atualizar registro existente (mesmo ID do GC)
          const updateData: any = { ...pessoaData };
          
          if (existingPessoa.is_cliente) updateData.is_cliente = true;
          if (existingPessoa.is_fornecedor) updateData.is_fornecedor = true;
          if (existingPessoa.is_transportadora) updateData.is_transportadora = true;
          
          if (tipo === 'cliente') updateData.is_cliente = true;
          if (tipo === 'fornecedor') updateData.is_fornecedor = true;
          if (tipo === 'transportadora') updateData.is_transportadora = true;

          const { error } = await supabase
            .from('pessoas')
            .update(updateData)
            .eq('id', existingPessoa.id);

          if (error) {
            console.error(`[migrate-gestaoclick] Erro ao atualizar ${cpfCnpj} (GC ID: ${gcId}):`, error.message);
            return 'erro';
          }
          
          console.log(`[migrate-gestaoclick] Atualizado: ${razaoSocial} (${cpfCnpj}, GC ID: ${gcId})`);
          return 'atualizado';
        } else {
          // Inserir novo - cada registro do GC vira um registro separado
          const { error } = await supabase
            .from('pessoas')
            .insert(pessoaData);

          if (error) {
            console.error(`[migrate-gestaoclick] Erro ao inserir ${cpfCnpj} (GC ID: ${gcId}):`, error.message);
            return 'erro';
          }
          
          console.log(`[migrate-gestaoclick] Importado: ${razaoSocial} (${cpfCnpj}, GC ID: ${gcId})`);
          return 'importado';
        }
      } catch (e) {
        console.error('[migrate-gestaoclick] Exceção:', e);
        return 'erro';
      }
    }

    // Importar Clientes
    if (action === 'clientes' || action === 'full') {
      console.log('[migrate-gestaoclick] Iniciando importação de clientes...');
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        try {
          const response = await fetchGestaoClick('clientes', page, gcAccessToken, gcSecret);
          const clientes = response.data || [];
          
          if (clientes.length === 0) {
            hasMore = false;
            break;
          }
          
          stats.clientes.total += clientes.length;
          console.log(`[migrate-gestaoclick] Página ${page}: ${clientes.length} clientes`);

          for (const cliente of clientes) {
            const result = await processarPessoa(cliente, 'cliente');
            if (result === 'importado') stats.clientes.importados++;
            else if (result === 'atualizado') stats.clientes.atualizados++;
            else stats.clientes.erros++;
          }

          hasMore = response.meta?.proxima_pagina !== null && response.meta?.proxima_pagina !== undefined;
          page++;
          
          if (page > 50) {
            console.log('[migrate-gestaoclick] Limite de páginas de clientes atingido');
            break;
          }
        } catch (e) {
          console.error(`[migrate-gestaoclick] Erro na página ${page} de clientes:`, e);
          hasMore = false;
        }
      }
    }

    // Importar Fornecedores
    if (action === 'fornecedores' || action === 'full') {
      console.log('[migrate-gestaoclick] Iniciando importação de fornecedores...');
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        try {
          const response = await fetchGestaoClick('fornecedores', page, gcAccessToken, gcSecret);
          const fornecedores = response.data || [];
          
          if (fornecedores.length === 0) {
            hasMore = false;
            break;
          }
          
          stats.fornecedores.total += fornecedores.length;
          console.log(`[migrate-gestaoclick] Página ${page}: ${fornecedores.length} fornecedores`);

          for (const fornecedor of fornecedores) {
            const result = await processarPessoa(fornecedor, 'fornecedor');
            if (result === 'importado') stats.fornecedores.importados++;
            else if (result === 'atualizado') stats.fornecedores.atualizados++;
            else stats.fornecedores.erros++;
          }

          hasMore = response.meta?.proxima_pagina !== null && response.meta?.proxima_pagina !== undefined;
          page++;
          
          if (page > 50) {
            console.log('[migrate-gestaoclick] Limite de páginas de fornecedores atingido');
            break;
          }
        } catch (e) {
          console.error(`[migrate-gestaoclick] Erro na página ${page} de fornecedores:`, e);
          hasMore = false;
        }
      }
    }

    // Importar Transportadoras
    if (action === 'transportadoras' || action === 'full') {
      console.log('[migrate-gestaoclick] Iniciando importação de transportadoras...');
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        try {
          const response = await fetchGestaoClick('transportadoras', page, gcAccessToken, gcSecret);
          const transportadoras = response.data || [];
          
          if (transportadoras.length === 0) {
            hasMore = false;
            break;
          }
          
          stats.transportadoras.total += transportadoras.length;
          console.log(`[migrate-gestaoclick] Página ${page}: ${transportadoras.length} transportadoras`);

          for (const transportadora of transportadoras) {
            const result = await processarPessoa(transportadora, 'transportadora');
            if (result === 'importado') stats.transportadoras.importados++;
            else if (result === 'atualizado') stats.transportadoras.atualizados++;
            else stats.transportadoras.erros++;
          }

          hasMore = response.meta?.proxima_pagina !== null && response.meta?.proxima_pagina !== undefined;
          page++;
          
          if (page > 20) {
            console.log('[migrate-gestaoclick] Limite de páginas de transportadoras atingido');
            break;
          }
        } catch (e) {
          console.error(`[migrate-gestaoclick] Erro na página ${page} de transportadoras:`, e);
          hasMore = false;
        }
      }
    }

    const summary = {
      success: true,
      stats,
      message: `Migração concluída! ` +
        `Clientes: ${stats.clientes.importados} novos, ${stats.clientes.atualizados} atualizados, ${stats.clientes.erros} erros (total: ${stats.clientes.total}). ` +
        `Fornecedores: ${stats.fornecedores.importados} novos, ${stats.fornecedores.atualizados} atualizados, ${stats.fornecedores.erros} erros (total: ${stats.fornecedores.total}). ` +
        `Transportadoras: ${stats.transportadoras.importados} novos, ${stats.transportadoras.atualizados} atualizados, ${stats.transportadoras.erros} erros (total: ${stats.transportadoras.total}).`
    };

    console.log(`[migrate-gestaoclick] ${summary.message}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[migrate-gestaoclick] Erro fatal:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
