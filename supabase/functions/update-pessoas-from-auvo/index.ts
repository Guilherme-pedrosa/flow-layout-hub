import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuvoClient {
  nome: string;
  cnpj: string;
}

// Limpa CNPJ removendo caracteres especiais
function cleanCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  return cnpj.replace(/\D/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { clients, company_id } = await req.json() as { 
      clients: AuvoClient[], 
      company_id: string 
    };

    if (!clients || !Array.isArray(clients)) {
      return new Response(
        JSON.stringify({ error: 'clients array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[auvo-update] Processando ${clients.length} clientes do AUVO para company ${company_id}`);

    // Buscar todas as pessoas da empresa
    const { data: pessoas, error: pessoasError } = await supabase
      .from('pessoas')
      .select('id, cpf_cnpj, nome_fantasia, razao_social')
      .eq('company_id', company_id);

    if (pessoasError) {
      console.error('[auvo-update] Erro ao buscar pessoas:', pessoasError);
      throw pessoasError;
    }

    console.log(`[auvo-update] Encontradas ${pessoas?.length || 0} pessoas na base`);

    // Criar mapa de CNPJ -> pessoa
    const pessoasByCnpj = new Map<string, any>();
    for (const pessoa of pessoas || []) {
      const cnpjClean = cleanCnpj(pessoa.cpf_cnpj);
      if (cnpjClean.length >= 11) { // CPF ou CNPJ válido
        pessoasByCnpj.set(cnpjClean, pessoa);
      }
    }

    const results = {
      updated: 0,
      notFound: 0,
      skipped: 0,
      errors: 0,
      details: [] as { cnpj: string; nome: string; status: string; oldName?: string }[]
    };

    // Processar cada cliente do AUVO
    for (const client of clients) {
      const cnpjClean = cleanCnpj(client.cnpj);
      
      if (!cnpjClean || cnpjClean.length < 11) {
        results.skipped++;
        continue;
      }

      const pessoa = pessoasByCnpj.get(cnpjClean);
      
      if (!pessoa) {
        results.notFound++;
        results.details.push({
          cnpj: client.cnpj,
          nome: client.nome,
          status: 'not_found'
        });
        continue;
      }

      // Verificar se o nome é diferente
      const nomeAtual = pessoa.nome_fantasia || pessoa.razao_social || '';
      if (nomeAtual === client.nome) {
        results.skipped++;
        continue;
      }

      // Atualizar o nome_fantasia com o nome do AUVO
      const { error: updateError } = await supabase
        .from('pessoas')
        .update({ nome_fantasia: client.nome })
        .eq('id', pessoa.id);

      if (updateError) {
        console.error(`[auvo-update] Erro ao atualizar ${pessoa.id}:`, updateError);
        results.errors++;
        results.details.push({
          cnpj: client.cnpj,
          nome: client.nome,
          status: 'error',
          oldName: nomeAtual
        });
      } else {
        console.log(`[auvo-update] Atualizado: ${nomeAtual} -> ${client.nome}`);
        results.updated++;
        results.details.push({
          cnpj: client.cnpj,
          nome: client.nome,
          status: 'updated',
          oldName: nomeAtual
        });
      }
    }

    console.log(`[auvo-update] Resultado: ${results.updated} atualizados, ${results.notFound} não encontrados, ${results.skipped} ignorados, ${results.errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${clients.length} clientes`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[auvo-update] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
