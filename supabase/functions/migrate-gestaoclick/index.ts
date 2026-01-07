import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GC_BASE_URL = "https://gestaoclick.com/api";
const BATCH_SIZE = 20; // Processar em lotes de 20 (mais eficiente)
const MAX_PAGES = 100; // Limite de páginas por tipo
const TIMEOUT_BUFFER_MS = 50000; // 50 segundos (edge functions têm 60s)

async function fetchGestaoClick(
  endpoint: string, 
  page: number = 1,
  accessToken: string,
  secretToken: string
): Promise<any> {
  const url = `${GC_BASE_URL}/${endpoint}?pagina=${page}`;
  console.log(`[GC] Fetch: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Access-Token': accessToken,
      'Secret-Access-Token': secretToken,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error(`[GC] Error ${response.status}: ${text}`);
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

function normalizeCpfCnpj(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d]/g, '');
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

  const startTime = Date.now();

  try {
    const gcAccessToken = Deno.env.get('GC_ACCESS_TOKEN');
    const gcSecret = Deno.env.get('GC_SECRET');
    
    if (!gcAccessToken || !gcSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais do Gestão Click não configuradas. Configure GC_ACCESS_TOKEN e GC_SECRET.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, company_id, continue_from } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['full', 'clientes', 'fornecedores', 'transportadoras', 'clean'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'action inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GC] Start: ${action}, company: ${company_id}`);

    // Limpar registros inválidos
    if (action === 'clean') {
      const { data: deleted } = await supabase
        .from('pessoas')
        .delete()
        .eq('company_id', company_id)
        .or('cpf_cnpj.is.null,cpf_cnpj.eq.')
        .select('id');

      return new Response(
        JSON.stringify({ success: true, message: `Limpeza concluída: ${deleted?.length || 0} removidos` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = {
      clientes: { total: 0, importados: 0, atualizados: 0, erros: 0 },
      fornecedores: { total: 0, importados: 0, atualizados: 0, erros: 0 },
      transportadoras: { total: 0, importados: 0, atualizados: 0, erros: 0 }
    };

    // Processar uma pessoa (mais simples, sem logs verbosos)
    async function processarPessoa(
      pessoa: any, 
      tipo: 'cliente' | 'fornecedor' | 'transportadora'
    ): Promise<'importado' | 'atualizado' | 'erro'> {
      try {
        const cpfCnpj = normalizeCpfCnpj(pessoa.cnpj || pessoa.cpf);
        // API GC: nome_fantasia é o campo correto, "nome" é fallback
        const nomeFantasia = pessoa.nome_fantasia?.trim() || pessoa.nome?.trim() || null;
        const razaoSocial = pessoa.razao_social?.trim() || nomeFantasia;
        const gcId = pessoa.id?.toString() || null;

        if (!cpfCnpj || (!razaoSocial && !nomeFantasia)) {
          return 'erro';
        }

        const endereco = pessoa.enderecos?.[0]?.endereco || {};
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
          external_id: gcId,
        };

        // Verificar duplicidade:
        // 1. Primeiro por external_id (GC ID) - atualiza se já existe
        // 2. Depois por cpf_cnpj + nome_fantasia - atualiza se igual, insere se diferente
        let existingPessoa = null;
        
        // Buscar por external_id primeiro
        if (gcId) {
          const { data } = await supabase
            .from('pessoas')
            .select('id, is_cliente, is_fornecedor, is_transportadora, external_id')
            .eq('company_id', company_id)
            .eq('external_id', gcId)
            .maybeSingle();
          existingPessoa = data;
        }

        // Se não encontrou por external_id, verificar por cpf_cnpj + nome_fantasia
        if (!existingPessoa && cpfCnpj) {
          const { data } = await supabase
            .from('pessoas')
            .select('id, is_cliente, is_fornecedor, is_transportadora, external_id, nome_fantasia, razao_social')
            .eq('company_id', company_id)
            .eq('cpf_cnpj', cpfCnpj);
          
          // Se nome_fantasia for igual a algum existente, considera duplicado
          // Comparar com nome_fantasia OU razao_social (porque às vezes salva como razao_social)
          if (data && data.length > 0) {
            const nomeParaComparar = (nomeFantasia || '').toLowerCase().trim();
            const matchingByName = data.find(p => {
              const nfDb = (p.nome_fantasia || '').toLowerCase().trim();
              const rsDb = (p.razao_social || '').toLowerCase().trim();
              // Considera igual se nome_fantasia OU razao_social bater
              return nfDb === nomeParaComparar || rsDb === nomeParaComparar;
            });
            if (matchingByName) {
              existingPessoa = matchingByName;
            }
            // Se nome_fantasia for diferente de todos, permite inserir (não seta existingPessoa)
          }
        }

        if (existingPessoa) {
          // Atualizar registro existente (mesmo external_id ou mesmo cpf_cnpj + nome_fantasia)
          const updateData: any = { ...pessoaData };
          if (existingPessoa.is_cliente) updateData.is_cliente = true;
          if (existingPessoa.is_fornecedor) updateData.is_fornecedor = true;
          if (existingPessoa.is_transportadora) updateData.is_transportadora = true;

          const { error } = await supabase
            .from('pessoas')
            .update(updateData)
            .eq('id', existingPessoa.id);

          return error ? 'erro' : 'atualizado';
        } else {
          // Inserir novo registro - nome_fantasia diferente permite duplicar
          const { error } = await supabase.from('pessoas').insert(pessoaData);
          return error ? 'erro' : 'importado';
        }
      } catch {
        return 'erro';
      }
    }

    // Processar em lotes paralelos
    async function processarLote(items: any[], tipo: 'cliente' | 'fornecedor' | 'transportadora') {
      const results = await Promise.all(
        items.map(item => processarPessoa(item, tipo))
      );
      
      for (const result of results) {
        const key = tipo === 'cliente' ? 'clientes' : tipo === 'fornecedor' ? 'fornecedores' : 'transportadoras';
        if (result === 'importado') stats[key].importados++;
        else if (result === 'atualizado') stats[key].atualizados++;
        else stats[key].erros++;
      }
    }

    // Verificar timeout
    function shouldStop(): boolean {
      return (Date.now() - startTime) > TIMEOUT_BUFFER_MS;
    }

    // Importar tipo
    async function importarTipo(endpoint: string, tipo: 'cliente' | 'fornecedor' | 'transportadora', startPage: number = 1): Promise<{ hasMore: boolean; lastPage: number }> {
      const key = tipo === 'cliente' ? 'clientes' : tipo === 'fornecedor' ? 'fornecedores' : 'transportadoras';
      let page = startPage;
      let hasMore = true;
      
      while (hasMore && page <= MAX_PAGES && !shouldStop()) {
        try {
          const response = await fetchGestaoClick(endpoint, page, gcAccessToken!, gcSecret!);
          const items = response.data || [];
          
          if (items.length === 0) break;
          
          stats[key].total += items.length;
          console.log(`[GC] ${tipo} p${page}: ${items.length} itens`);

          // Processar em lotes
          for (let i = 0; i < items.length; i += BATCH_SIZE) {
            if (shouldStop()) {
              console.log(`[GC] Timeout approaching, stopping at page ${page}`);
              return { hasMore: true, lastPage: page };
            }
            const batch = items.slice(i, i + BATCH_SIZE);
            await processarLote(batch, tipo);
          }

          hasMore = response.meta?.proxima_pagina != null;
          page++;
        } catch (e) {
          console.error(`[GC] Error on ${tipo} page ${page}:`, e);
          break;
        }
      }
      
      return { hasMore: false, lastPage: page };
    }

    let continueInfo: any = null;

    // Executar importação
    if (action === 'clientes' || action === 'full') {
      const result = await importarTipo('clientes', 'cliente', continue_from?.clientes || 1);
      if (result.hasMore) {
        continueInfo = { clientes: result.lastPage };
      }
    }

    if (!shouldStop() && (action === 'fornecedores' || action === 'full')) {
      const result = await importarTipo('fornecedores', 'fornecedor', continue_from?.fornecedores || 1);
      if (result.hasMore) {
        continueInfo = { ...continueInfo, fornecedores: result.lastPage };
      }
    }

    if (!shouldStop() && (action === 'transportadoras' || action === 'full')) {
      const result = await importarTipo('transportadoras', 'transportadora', continue_from?.transportadoras || 1);
      if (result.hasMore) {
        continueInfo = { ...continueInfo, transportadoras: result.lastPage };
      }
    }

    const totalImportados = stats.clientes.importados + stats.fornecedores.importados + stats.transportadoras.importados;
    const totalAtualizados = stats.clientes.atualizados + stats.fornecedores.atualizados + stats.transportadoras.atualizados;
    const totalErros = stats.clientes.erros + stats.fornecedores.erros + stats.transportadoras.erros;

    const summary = {
      success: true,
      stats,
      continue_from: continueInfo,
      message: `${totalImportados} novos, ${totalAtualizados} atualizados, ${totalErros} erros${continueInfo ? ' (parcial - execute novamente para continuar)' : ''}`
    };

    console.log(`[GC] Done: ${summary.message}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[GC] Fatal:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
