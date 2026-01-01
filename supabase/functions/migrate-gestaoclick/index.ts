import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_ACCESS_TOKEN = "62f5d39c459bb15f8e818efa5ef4e7e5586a4cea";
const GC_SECRET = "429ca0f7ac2f65ea560c7039d964c814856eb9b8";
const GC_BASE_URL = "https://gestaoclick.com/api";

async function fetchGestaoClick(endpoint: string, page: number = 1): Promise<any> {
  const response = await fetch(`${GC_BASE_URL}/${endpoint}?pagina=${page}`, {
    headers: {
      'Access-Token': GC_ACCESS_TOKEN,
      'Secret-Access-Token': GC_SECRET,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

function normalizeCpfCnpj(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[^\d]/g, '');
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[^\d]/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Primeiro, limpar fornecedores sem CNPJ criados erroneamente
    if (action === 'clean' || action === 'full') {
      const { data: deleted, error: deleteError } = await supabase
        .from('pessoas')
        .delete()
        .eq('company_id', company_id)
        .eq('is_fornecedor', true)
        .eq('is_cliente', false)
        .eq('is_transportadora', false)
        .or('cpf_cnpj.is.null,cpf_cnpj.eq.')
        .select('id');

      console.log(`Fornecedores sem CNPJ deletados: ${deleted?.length || 0}`);
    }

    if (action === 'clean') {
      return new Response(
        JSON.stringify({ success: true, message: 'Limpeza concluída' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = {
      clientes: { total: 0, importados: 0, atualizados: 0, erros: 0 },
      fornecedores: { total: 0, importados: 0, atualizados: 0, erros: 0 },
      transportadoras: { total: 0, importados: 0, atualizados: 0, erros: 0 }
    };

    // Função para processar uma pessoa
    async function processarPessoa(
      pessoa: any, 
      tipo: 'cliente' | 'fornecedor' | 'transportadora'
    ): Promise<'importado' | 'atualizado' | 'erro'> {
      try {
        const cpfCnpj = normalizeCpfCnpj(pessoa.cnpj || pessoa.cpf);
        const nomeFantasia = pessoa.nome?.trim() || null;
        const razaoSocial = pessoa.razao_social?.trim() || nomeFantasia;

        if (!razaoSocial && !nomeFantasia) {
          return 'erro';
        }

        // Buscar endereço principal
        const endereco = pessoa.enderecos?.[0]?.endereco || {};

        // Verificar se já existe pelo CNPJ/CPF
        let existingPessoa = null;
        if (cpfCnpj) {
          const { data } = await supabase
            .from('pessoas')
            .select('id, is_cliente, is_fornecedor, is_transportadora')
            .eq('company_id', company_id)
            .eq('cpf_cnpj', cpfCnpj)
            .maybeSingle();
          existingPessoa = data;
        }

        const pessoaData = {
          company_id,
          tipo_pessoa: pessoa.tipo_pessoa === 'PF' ? 'PF' : 'PJ',
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia !== razaoSocial ? nomeFantasia : null,
          cpf_cnpj: cpfCnpj,
          inscricao_estadual: pessoa.inscricao_estadual || null,
          inscricao_municipal: pessoa.inscricao_municipal || null,
          telefone: normalizePhone(pessoa.telefone) || normalizePhone(pessoa.celular),
          email: pessoa.email || null,
          cep: endereco.cep?.replace(/[^\d]/g, '') || null,
          logradouro: endereco.logradouro || null,
          numero: endereco.numero || null,
          complemento: endereco.complemento || null,
          bairro: endereco.bairro || null,
          cidade: endereco.nome_cidade || null,
          estado: endereco.estado || null,
          is_active: pessoa.ativo === '1',
          is_cliente: tipo === 'cliente',
          is_fornecedor: tipo === 'fornecedor',
          is_transportadora: tipo === 'transportadora',
        };

        if (existingPessoa) {
          // Atualizar flags e dados
          const updateData: any = { ...pessoaData };
          
          // Manter flags existentes
          if (existingPessoa.is_cliente) updateData.is_cliente = true;
          if (existingPessoa.is_fornecedor) updateData.is_fornecedor = true;
          if (existingPessoa.is_transportadora) updateData.is_transportadora = true;
          
          // Adicionar nova flag
          if (tipo === 'cliente') updateData.is_cliente = true;
          if (tipo === 'fornecedor') updateData.is_fornecedor = true;
          if (tipo === 'transportadora') updateData.is_transportadora = true;

          const { error } = await supabase
            .from('pessoas')
            .update(updateData)
            .eq('id', existingPessoa.id);

          if (error) {
            console.error('Erro ao atualizar:', error);
            return 'erro';
          }
          return 'atualizado';
        } else {
          // Inserir novo
          const { error } = await supabase
            .from('pessoas')
            .insert(pessoaData);

          if (error) {
            console.error('Erro ao inserir:', error);
            return 'erro';
          }
          return 'importado';
        }
      } catch (e) {
        console.error('Exceção:', e);
        return 'erro';
      }
    }

    // Importar Clientes
    if (action === 'clientes' || action === 'full') {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetchGestaoClick('clientes', page);
        const clientes = response.data || [];
        stats.clientes.total += clientes.length;

        for (const cliente of clientes) {
          const result = await processarPessoa(cliente, 'cliente');
          if (result === 'importado') stats.clientes.importados++;
          else if (result === 'atualizado') stats.clientes.atualizados++;
          else stats.clientes.erros++;
        }

        hasMore = response.meta?.proxima_pagina !== null;
        page++;
        
        // Limite de segurança
        if (page > 20) break;
      }
    }

    // Importar Fornecedores
    if (action === 'fornecedores' || action === 'full') {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetchGestaoClick('fornecedores', page);
        const fornecedores = response.data || [];
        stats.fornecedores.total += fornecedores.length;

        for (const fornecedor of fornecedores) {
          const result = await processarPessoa(fornecedor, 'fornecedor');
          if (result === 'importado') stats.fornecedores.importados++;
          else if (result === 'atualizado') stats.fornecedores.atualizados++;
          else stats.fornecedores.erros++;
        }

        hasMore = response.meta?.proxima_pagina !== null;
        page++;
        
        if (page > 30) break;
      }
    }

    // Importar Transportadoras
    if (action === 'transportadoras' || action === 'full') {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetchGestaoClick('transportadoras', page);
        const transportadoras = response.data || [];
        stats.transportadoras.total += transportadoras.length;

        for (const transportadora of transportadoras) {
          const result = await processarPessoa(transportadora, 'transportadora');
          if (result === 'importado') stats.transportadoras.importados++;
          else if (result === 'atualizado') stats.transportadoras.atualizados++;
          else stats.transportadoras.erros++;
        }

        hasMore = response.meta?.proxima_pagina !== null;
        page++;
        
        if (page > 5) break;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats,
        message: `Migração concluída! Clientes: ${stats.clientes.importados} novos, ${stats.clientes.atualizados} atualizados. Fornecedores: ${stats.fornecedores.importados} novos, ${stats.fornecedores.atualizados} atualizados. Transportadoras: ${stats.transportadoras.importados} novos, ${stats.transportadoras.atualizados} atualizados.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na migração:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
