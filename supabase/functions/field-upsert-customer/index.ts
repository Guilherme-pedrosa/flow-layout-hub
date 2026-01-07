import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * FIELD-UPSERT-CUSTOMER (v2 - Padrão Oficial Outbox)
 * 
 * WAI = System of Record | Field = Execution Layer
 * 
 * Este endpoint NÃO chama a API do Field diretamente.
 * Ele cria um JOB na tabela sync_jobs e retorna imediatamente.
 * O worker (field-sync-worker) processa o job com retry e idempotência.
 * 
 * Fluxo:
 * 1. Valida dados obrigatórios
 * 2. Atualiza cliente com sync_status='pending'
 * 3. Cria job na sync_jobs
 * 4. Retorna { queued: true }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const input = await req.json();

    // Validações
    if (!input.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!input.wai_customer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'wai_customer_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!input.name || input.name.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome deve ter pelo menos 6 caracteres (exigência Field Control)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanZip = input.address?.zipCode?.replace(/\D/g, '') || '';
    if (cleanZip.length !== 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'CEP deve ter 8 dígitos válidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[field-upsert-customer] Enfileirando sync para: ${input.name}`);

    // 1. Marcar cliente como pendente de sync
    await supabase
      .from('clientes')
      .update({
        sync_status: 'pending',
        sync_updated_at: new Date().toISOString()
      })
      .eq('id', input.wai_customer_id)
      .eq('company_id', input.company_id);

    // 2. Verificar se já existe job pendente para este cliente
    const { data: existingJob } = await supabase
      .from('sync_jobs')
      .select('id')
      .eq('entity_type', 'customer')
      .eq('entity_id', input.wai_customer_id)
      .in('status', ['pending', 'processing'])
      .single();

    if (existingJob) {
      // Atualizar payload do job existente
      await supabase
        .from('sync_jobs')
        .update({
          payload_json: {
            name: input.name,
            email: input.email || '',
            phone: input.phone || '',
            document: input.document || '',
            cep: cleanZip,
            street: input.address?.street || '',
            number: input.address?.number || '',
            district: input.address?.district || '',
            complement: input.address?.complement || '',
            city: input.address?.city || '',
            state: input.address?.state || ''
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingJob.id);

      console.log(`[field-upsert-customer] Job existente atualizado: ${existingJob.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          queued: true,
          job_id: existingJob.id,
          message: 'Job já existente foi atualizado'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Criar novo job na outbox
    const { data: newJob, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        company_id: input.company_id,
        entity_type: 'customer',
        entity_id: input.wai_customer_id,
        action: 'upsert',
        payload_json: {
          name: input.name,
          email: input.email || '',
          phone: input.phone || '',
          document: input.document || '',
          cep: cleanZip,
          street: input.address?.street || '',
          number: input.address?.number || '',
          district: input.address?.district || '',
          complement: input.address?.complement || '',
          city: input.address?.city || '',
          state: input.address?.state || ''
        },
        status: 'pending',
        attempts: 0,
        max_attempts: 5,
        next_retry_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (jobError) {
      console.error(`[field-upsert-customer] Erro criando job: ${jobError.message}`);
      
      return new Response(
        JSON.stringify({ success: false, error: jobError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[field-upsert-customer] Job criado: ${newJob.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        queued: true,
        job_id: newJob.id,
        message: 'Sincronização agendada. O worker processará em breve.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[field-upsert-customer] Erro: ${msg}`);
    
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
