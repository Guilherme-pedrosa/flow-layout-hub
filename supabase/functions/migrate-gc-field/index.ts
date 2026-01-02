import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';
const BATCH_SIZE = 50;

interface MigrateRequest {
  company_id: string;
  action: 'migrate' | 'status' | 'reset';
  offset?: number;
  limit?: number;
}

interface MigrationMapping {
  codigo_unico: string;
  id_field_control: string;
  nome_cliente: string;
  cnpj_enviado: string | null;
  wai_id: string;
}

/**
 * Limpa o CNPJ/CPF removendo caracteres não numéricos
 */
function cleanDocument(doc: string | undefined | null): string | null {
  if (!doc) return null;
  const cleaned = doc.replace(/\D/g, '');
  // Validar se tem 11 (CPF) ou 14 (CNPJ) dígitos
  if (cleaned.length === 11 || cleaned.length === 14) {
    return cleaned;
  }
  return null;
}

/**
 * Formata CNPJ para exibição
 */
function formatCnpj(cnpj: string): string {
  if (cnpj.length === 14) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
  } else if (cnpj.length === 11) {
    return `${cnpj.slice(0, 3)}.${cnpj.slice(3, 6)}.${cnpj.slice(6, 9)}-${cnpj.slice(9)}`;
  }
  return cnpj;
}

/**
 * Gera código único no formato GC-XXXX
 */
function gerarCodigoCliente(numero: number): string {
  return `GC-${numero.toString().padStart(4, '0')}`;
}

/**
 * Cria um cliente no Field Control
 */
async function criarClienteFieldControl(
  apiKey: string,
  payload: {
    name: string;
    number: string;
    status: string;
    document?: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, id: result.id };
    }

    // Se retornou erro
    const errorText = await response.text();
    
    // Se for 409 ou 422 com "already exists" - cliente já existe
    if (response.status === 409 || (response.status === 422 && errorText.includes('already'))) {
      return { success: false, error: `Cliente já existe: ${errorText}` };
    }

    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return { success: false, error: msg };
  }
}

/**
 * Busca cliente existente no Field Control pelo number (código único)
 */
async function buscarClientePorNumber(apiKey: string, number: string): Promise<string | null> {
  try {
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers?number=${number}`, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey }
    });

    if (response.ok) {
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (items.length > 0) {
        return items[0].id;
      }
    }
  } catch (error) {
    console.log(`[migrate-gc-field] Erro buscando por number ${number}: ${error}`);
  }
  return null;
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

    const payload: MigrateRequest = await req.json();
    const { company_id, action, offset = 0, limit = BATCH_SIZE } = payload;

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== STATUS: Ver progresso da migração ==========
    if (action === 'status') {
      const { count: totalClientes } = await supabase
        .from('pessoas')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('is_cliente', true);

      const { count: jaMigrados } = await supabase
        .from('field_control_sync')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company_id)
        .eq('entity_type', 'customer_gc');

      return new Response(JSON.stringify({
        success: true,
        total_clientes: totalClientes || 0,
        ja_migrados: jaMigrados || 0,
        pendentes: (totalClientes || 0) - (jaMigrados || 0)
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== RESET: Limpar migração (para recomeçar) ==========
    if (action === 'reset') {
      const { error } = await supabase
        .from('field_control_sync')
        .delete()
        .eq('company_id', company_id)
        .eq('entity_type', 'customer_gc');

      return new Response(JSON.stringify({
        success: !error,
        message: error ? error.message : 'Migração resetada com sucesso'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== MIGRATE: Executar migração ==========
    if (action === 'migrate') {
      console.log(`[migrate-gc-field] Iniciando migração offset=${offset}, limit=${limit}`);

      // 1. Buscar todos os clientes ordenados (para gerar código sequencial consistente)
      const { data: todosClientes, error: fetchError } = await supabase
        .from('pessoas')
        .select('id, razao_social, nome_fantasia, cpf_cnpj')
        .eq('company_id', company_id)
        .eq('is_cliente', true)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (fetchError) {
        return new Response(JSON.stringify({ success: false, error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const totalClientes = todosClientes?.length || 0;
      console.log(`[migrate-gc-field] Total de clientes: ${totalClientes}`);

      // 2. Buscar IDs já migrados
      const { data: jaMigrados } = await supabase
        .from('field_control_sync')
        .select('wai_id')
        .eq('company_id', company_id)
        .eq('entity_type', 'customer_gc');

      const migradosSet = new Set((jaMigrados || []).map(m => m.wai_id));

      // 3. Buscar todos os CNPJs já usados no Field Control (a partir dos registros de sync)
      const { data: syncedWithCnpj } = await supabase
        .from('field_control_sync')
        .select('wai_id')
        .eq('company_id', company_id)
        .eq('entity_type', 'customer_gc')
        .not('wai_id', 'is', null);

      // Pegar CNPJs dos clientes já migrados
      const cnpjsJaUtilizados = new Set<string>();
      
      if (syncedWithCnpj && syncedWithCnpj.length > 0) {
        const syncedIds = syncedWithCnpj.map(s => s.wai_id);
        const { data: pessoasComCnpj } = await supabase
          .from('pessoas')
          .select('id, cpf_cnpj')
          .in('id', syncedIds);
        
        for (const p of pessoasComCnpj || []) {
          const cnpjLimpo = cleanDocument(p.cpf_cnpj);
          if (cnpjLimpo) {
            cnpjsJaUtilizados.add(cnpjLimpo);
          }
        }
      }

      console.log(`[migrate-gc-field] CNPJs já utilizados: ${cnpjsJaUtilizados.size}`);

      // 4. Filtrar apenas os pendentes e aplicar paginação
      const clientesPendentes = (todosClientes || []).filter(c => !migradosSet.has(c.id));
      const batch = clientesPendentes.slice(0, limit);

      console.log(`[migrate-gc-field] Pendentes: ${clientesPendentes.length}, Batch: ${batch.length}`);

      // 5. Determinar o próximo número sequencial
      const ultimoNumero = migradosSet.size;

      // 6. Processar batch
      const resultados: MigrationMapping[] = [];
      const erros: { codigo: string; nome: string; erro: string }[] = [];
      let created = 0;
      let skipped = 0;

      for (let i = 0; i < batch.length; i++) {
        const cliente = batch[i];
        const numeroSequencial = ultimoNumero + i + 1;
        const codigoUnico = gerarCodigoCliente(numeroSequencial);
        
        const nomeCliente = cliente.nome_fantasia?.trim() || cliente.razao_social?.trim() || 'Cliente sem nome';
        const cnpjLimpo = cleanDocument(cliente.cpf_cnpj);

        // Verificar se já existe no Field com este código
        const existingId = await buscarClientePorNumber(apiKey, codigoUnico);
        if (existingId) {
          console.log(`[migrate-gc-field] ${codigoUnico} já existe no Field: ${existingId}`);
          
          // Salvar mapeamento
          await supabase.from('field_control_sync').upsert({
            company_id,
            entity_type: 'customer_gc',
            wai_id: cliente.id,
            field_id: existingId,
            last_sync: new Date().toISOString()
          }, { onConflict: 'wai_id,entity_type' });
          
          skipped++;
          continue;
        }

        // Montar payload base
        const fieldPayload: {
          name: string;
          number: string;
          status: string;
          document?: string;
        } = {
          name: nomeCliente.length >= 6 ? nomeCliente : nomeCliente.padEnd(6, ' '),
          number: codigoUnico,
          status: 'active'
        };

        // Lógica anti-duplicação de CNPJ
        let cnpjEnviado: string | null = null;
        if (cnpjLimpo && !cnpjsJaUtilizados.has(cnpjLimpo)) {
          fieldPayload.document = cnpjLimpo;
          cnpjsJaUtilizados.add(cnpjLimpo);
          cnpjEnviado = formatCnpj(cnpjLimpo);
          console.log(`[migrate-gc-field] ${codigoUnico}: Enviando com CNPJ ${cnpjEnviado}`);
        } else if (cnpjLimpo) {
          console.log(`[migrate-gc-field] ${codigoUnico}: CNPJ ${formatCnpj(cnpjLimpo)} já usado, enviando SEM CNPJ`);
        }

        // Criar no Field Control
        const result = await criarClienteFieldControl(apiKey, fieldPayload);

        if (result.success && result.id) {
          // Salvar mapeamento no banco
          await supabase.from('field_control_sync').upsert({
            company_id,
            entity_type: 'customer_gc',
            wai_id: cliente.id,
            field_id: result.id,
            last_sync: new Date().toISOString()
          }, { onConflict: 'wai_id,entity_type' });

          resultados.push({
            codigo_unico: codigoUnico,
            id_field_control: result.id,
            nome_cliente: nomeCliente,
            cnpj_enviado: cnpjEnviado,
            wai_id: cliente.id
          });

          created++;
          console.log(`[migrate-gc-field] ✅ ${codigoUnico}: ${nomeCliente} -> ${result.id}`);
        } else {
          erros.push({
            codigo: codigoUnico,
            nome: nomeCliente,
            erro: result.error || 'Erro desconhecido'
          });
          console.log(`[migrate-gc-field] ❌ ${codigoUnico}: ${result.error}`);
        }

        // Delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const hasMore = clientesPendentes.length > limit;

      return new Response(JSON.stringify({
        success: true,
        summary: {
          total_clientes: totalClientes,
          ja_migrados_antes: migradosSet.size,
          processados_agora: batch.length,
          criados: created,
          pulados: skipped,
          erros: erros.length,
          pendentes_restantes: clientesPendentes.length - batch.length
        },
        mapeamento: resultados,
        erros: erros.length > 0 ? erros : undefined,
        has_more: hasMore,
        message: hasMore 
          ? `Processado ${created} clientes. Execute novamente para continuar.`
          : `Migração concluída! ${created} clientes criados.`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(
      JSON.stringify({ success: false, error: 'action inválida. Use: migrate, status ou reset' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[migrate-gc-field] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
