import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichRequest {
  company_id: string;
  limit?: number;
  only_missing_address?: boolean;
}

async function consultarCNPJ(cnpj: string, retryCount = 0): Promise<any> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) {
    return null;
  }

  try {
    // Usando BrasilAPI (mais generosa com limites) como primária
    // Fallback para ReceitaWS se necessário
    const apis = [
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      `https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`
    ];
    
    const apiUrl = apis[retryCount % apis.length];
    const response = await fetch(apiUrl);
    
    if (response.status === 429) {
      // Rate limited - retry com outra API
      if (retryCount < 2) {
        console.log(`[enrich] CNPJ ${cnpjLimpo}: Rate limited, tentando outra API...`);
        await sleep(2000);
        return consultarCNPJ(cnpj, retryCount + 1);
      }
      console.log(`[enrich] CNPJ ${cnpjLimpo}: Rate limited em todas as APIs`);
      return null;
    }
    
    if (!response.ok) {
      console.log(`[enrich] CNPJ ${cnpjLimpo}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Normalizar resposta (BrasilAPI tem formato diferente)
    if (apiUrl.includes('brasilapi')) {
      return {
        nome: data.razao_social,
        fantasia: data.nome_fantasia,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.municipio,
        uf: data.uf,
        cep: data.cep,
        email: data.email,
        telefone: data.ddd_telefone_1,
        situacao: data.descricao_situacao_cadastral,
        abertura: data.data_inicio_atividade?.split('-').reverse().join('/'),
        atividade_principal: data.cnae_fiscal_descricao ? [{ code: String(data.cnae_fiscal), text: data.cnae_fiscal_descricao }] : []
      };
    }
    
    if (data.status === 'ERROR') {
      console.log(`[enrich] CNPJ ${cnpjLimpo}: ${data.message}`);
      return null;
    }

    return data;
  } catch (e) {
    console.error(`[enrich] Erro ao consultar CNPJ ${cnpjLimpo}:`, e);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: EnrichRequest = await req.json();
    const { company_id, limit = 50, only_missing_address = true } = payload;

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich] Iniciando enriquecimento - company_id: ${company_id}, limit: ${limit}`);

    // Buscar pessoas com CNPJ (14 dígitos) que precisam de enriquecimento
    let query = supabase
      .from('pessoas')
      .select('id, cpf_cnpj, razao_social, nome_fantasia, cep, logradouro, bairro, cidade, estado, numero, complemento, email, telefone, inscricao_estadual')
      .eq('company_id', company_id)
      .eq('tipo_pessoa', 'PJ')
      .not('cpf_cnpj', 'is', null);

    if (only_missing_address) {
      // Apenas pessoas sem endereço completo
      query = query.or('cep.is.null,cep.eq.,logradouro.is.null,logradouro.eq.');
    }

    const { data: pessoas, error: fetchError } = await query.limit(limit);

    if (fetchError) {
      console.error('[enrich] Erro ao buscar pessoas:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pessoas || pessoas.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma pessoa para enriquecer', stats: { total: 0, atualizados: 0, erros: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich] Encontradas ${pessoas.length} pessoas para enriquecer`);

    const stats = {
      total: pessoas.length,
      atualizados: 0,
      erros: 0,
      ignorados: 0,
      detalhes: [] as string[]
    };

    for (let i = 0; i < pessoas.length; i++) {
      const pessoa = pessoas[i];
      const cnpj = pessoa.cpf_cnpj?.replace(/\D/g, '');

      if (!cnpj || cnpj.length !== 14) {
        stats.ignorados++;
        continue;
      }

      console.log(`[enrich] [${i + 1}/${pessoas.length}] Consultando CNPJ: ${cnpj} - ${pessoa.razao_social || pessoa.nome_fantasia}`);

      const dadosCNPJ = await consultarCNPJ(cnpj);

      if (!dadosCNPJ) {
        stats.erros++;
        stats.detalhes.push(`${cnpj}: Não encontrado ou erro na consulta`);
        // Aguardar antes da próxima consulta
        await sleep(1500);
        continue;
      }

      // Preparar dados para atualização (NÃO alterar nome_fantasia!)
      const updateData: Record<string, any> = {};

      // Endereço - só preencher se estiver vazio
      if (!pessoa.cep && dadosCNPJ.cep) {
        updateData.cep = dadosCNPJ.cep.replace(/\D/g, '');
      }
      if (!pessoa.logradouro && dadosCNPJ.logradouro) {
        updateData.logradouro = dadosCNPJ.logradouro;
      }
      if (!pessoa.numero && dadosCNPJ.numero) {
        updateData.numero = dadosCNPJ.numero;
      }
      if (!pessoa.complemento && dadosCNPJ.complemento) {
        updateData.complemento = dadosCNPJ.complemento;
      }
      if (!pessoa.bairro && dadosCNPJ.bairro) {
        updateData.bairro = dadosCNPJ.bairro;
      }
      if (!pessoa.cidade && dadosCNPJ.municipio) {
        updateData.cidade = dadosCNPJ.municipio;
      }
      if (!pessoa.estado && dadosCNPJ.uf) {
        updateData.estado = dadosCNPJ.uf;
      }

      // Dados adicionais - só preencher se estiver vazio
      if (!pessoa.email && dadosCNPJ.email) {
        updateData.email = dadosCNPJ.email.toLowerCase();
      }
      if (!pessoa.telefone && dadosCNPJ.telefone) {
        updateData.telefone = dadosCNPJ.telefone.replace(/\D/g, '');
      }

      // Razão social - atualizar se diferente (geralmente mais preciso da Receita)
      if (dadosCNPJ.nome && !pessoa.razao_social) {
        updateData.razao_social = dadosCNPJ.nome;
      }

      // Situação cadastral
      if (dadosCNPJ.situacao) {
        updateData.situacao_cadastral = dadosCNPJ.situacao;
      }

      // CNAE principal
      if (dadosCNPJ.atividade_principal && dadosCNPJ.atividade_principal[0]) {
        updateData.cnae_principal = dadosCNPJ.atividade_principal[0].code;
      }

      // Data de abertura
      if (dadosCNPJ.abertura) {
        // Formato: DD/MM/YYYY -> YYYY-MM-DD
        const partes = dadosCNPJ.abertura.split('/');
        if (partes.length === 3) {
          updateData.data_abertura = `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
      }

      // Verificar se há algo para atualizar
      if (Object.keys(updateData).length === 0) {
        console.log(`[enrich] ${cnpj}: Nenhum campo para atualizar`);
        stats.ignorados++;
        await sleep(1500);
        continue;
      }

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('pessoas')
        .update(updateData)
        .eq('id', pessoa.id);

      if (updateError) {
        console.error(`[enrich] Erro ao atualizar ${cnpj}:`, updateError.message);
        stats.erros++;
        stats.detalhes.push(`${cnpj}: Erro ao atualizar - ${updateError.message}`);
      } else {
        console.log(`[enrich] ${cnpj}: Atualizado com sucesso (${Object.keys(updateData).join(', ')})`);
        stats.atualizados++;
      }

      // Respeitar limite de taxa da API BrasilAPI (mais generosa)
      // 3 segundos entre requests para evitar rate limiting
      await sleep(3000);
    }

    const summary = {
      success: true,
      stats,
      message: `Enriquecimento concluído! ${stats.atualizados} atualizados, ${stats.erros} erros, ${stats.ignorados} ignorados de ${stats.total} total.`
    };

    console.log(`[enrich] ${summary.message}`);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[enrich] Erro fatal:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
