import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

interface SyncJob {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_json: any;
  status: string;
  attempts: number;
  max_attempts: number;
  processing_started_at: string | null;
}

/**
 * FIELD-SYNC-WORKER (v2 - Race-condition-safe)
 * 
 * Correções implementadas:
 * 1. Claim atômico via RPC (FOR UPDATE SKIP LOCKED) - sem race condition
 * 2. Reaper de jobs travados em processing
 * 3. Idempotência real via externalId
 * 4. Filtro SQL otimizado para equipment jobs
 * 5. Timeout-safe com liberação de jobs não processados
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 25000; // 25 segundos (edge function limit)
  const BATCH_SIZE = 10;
  
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

    const results = {
      reaped: 0,
      claimed: 0,
      processed: 0,
      success: 0,
      errors: 0,
      dead: 0,
      released: 0
    };

    // 1. REAPER: Liberar jobs travados em processing há mais de 5 minutos
    try {
      const { data: reapResult, error: reapError } = await supabase.rpc('reap_stuck_sync_jobs', { stuck_minutes: 5 });
      if (!reapError && reapResult > 0) {
        results.reaped = reapResult;
        console.log(`[sync-worker] Reaped ${reapResult} stuck jobs`);
      }
    } catch (e) {
      console.log('[sync-worker] Reaper RPC not available, skipping');
    }

    // 2. CLAIM ATÔMICO: Pegar jobs para processar (sem race condition)
    let jobs: SyncJob[] = [];
    
    try {
      const { data: claimedJobs, error: claimError } = await supabase.rpc('claim_sync_jobs', { batch_size: BATCH_SIZE });
      
      if (claimError) {
        console.error('[sync-worker] Claim RPC error:', claimError);
        // Fallback para método antigo se RPC não existir
        const { data: fallbackJobs, error: fallbackError } = await supabase
          .from('sync_jobs')
          .select('*')
          .in('status', ['pending', 'error'])
          .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
          .order('created_at', { ascending: true })
          .limit(BATCH_SIZE);
        
        if (fallbackError) throw fallbackError;
        
        if (fallbackJobs && fallbackJobs.length > 0) {
          // Marcar como processing (não atômico, mas melhor que nada)
          const ids = fallbackJobs.map(j => j.id);
          await supabase
            .from('sync_jobs')
            .update({ 
              status: 'processing', 
              processing_started_at: new Date().toISOString(),
              updated_at: new Date().toISOString() 
            })
            .in('id', ids);
          
          jobs = fallbackJobs;
        }
      } else {
        jobs = claimedJobs || [];
      }
    } catch (e) {
      console.error('[sync-worker] Error claiming jobs:', e);
      return new Response(
        JSON.stringify({ success: false, error: String(e) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    results.claimed = jobs.length;

    if (jobs.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, message: 'Nenhum job pendente', ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    }

    console.log(`[sync-worker] Claimed ${jobs.length} jobs for processing`);

    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    };

    // 3. PROCESSAR JOBS
    const processedJobIds: string[] = [];
    
    for (const job of jobs) {
      // Check timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log('[sync-worker] Approaching timeout, stopping');
        break;
      }

      try {
        await processJob(job, headers, supabase);
        
        // Sucesso - marcar como done
        await supabase
          .from('sync_jobs')
          .update({ 
            status: 'done', 
            last_error: null,
            processing_started_at: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);

        processedJobIds.push(job.id);
        results.success++;
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[sync-worker] Erro job ${job.id}: ${errorMsg}`);

        await markJobError(job, errorMsg, supabase);
        processedJobIds.push(job.id);
        
        if (job.attempts + 1 >= job.max_attempts) {
          results.dead++;
        } else {
          results.errors++;
        }
      }

      results.processed++;

      // Evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. LIBERAR JOBS NÃO PROCESSADOS (timeout-safe)
    const unprocessedJobs = jobs.filter(j => !processedJobIds.includes(j.id));
    if (unprocessedJobs.length > 0) {
      const unprocessedIds = unprocessedJobs.map(j => j.id);
      await supabase
        .from('sync_jobs')
        .update({ 
          status: 'pending', 
          processing_started_at: null,
          updated_at: new Date().toISOString() 
        })
        .in('id', unprocessedIds);
      
      results.released = unprocessedIds.length;
      console.log(`[sync-worker] Released ${unprocessedIds.length} unprocessed jobs back to pending`);
    }

    console.log(`[sync-worker] Finalizado:`, results);

    return new Response(
      JSON.stringify({ ok: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[sync-worker] Erro fatal: ${msg}`);
    
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processJob(job: SyncJob, headers: any, supabase: any) {
  switch (job.entity_type) {
    case 'customer':
      await processCustomerJob(job, headers, supabase);
      break;
    case 'equipment':
      await processEquipmentJob(job, headers, supabase);
      break;
    case 'service_order':
      await processServiceOrderJob(job, headers, supabase);
      break;
    default:
      throw new Error(`Entity type não suportado: ${job.entity_type}`);
  }
}

async function processCustomerJob(job: SyncJob, headers: any, supabase: any) {
  const payload = job.payload_json;
  const externalId = job.entity_id; // WAI ID para idempotência
  
  // Buscar cliente
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, field_customer_id')
    .eq('id', job.entity_id)
    .single();

  if (!cliente) {
    throw new Error('Cliente não encontrado no WAI');
  }

  // Validações
  const name = payload.name;
  if (!name || name.length < 6) {
    throw new Error('Nome deve ter pelo menos 6 caracteres');
  }

  const cleanZip = (payload.cep || '').replace(/\D/g, '');
  if (cleanZip.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }

  // Montar payload do Field
  const fieldPayload = {
    name: name,
    externalId: externalId,
    contact: {
      email: payload.email || '',
      phone: (payload.phone || '').replace(/\D/g, '')
    },
    address: {
      zipCode: cleanZip,
      street: payload.street || '',
      number: payload.number || '',
      neighborhood: payload.district || '',
      complement: payload.complement || '',
      city: payload.city || '',
      state: payload.state || ''
    }
  };

  let fieldCustomerId = cliente.field_customer_id;

  if (fieldCustomerId) {
    // PUT - atualizar existente
    console.log(`[sync-worker] PUT customer ${fieldCustomerId}`);
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${fieldCustomerId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fieldPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Field PUT ${response.status}: ${errorText}`);
    }
  } else {
    // Idempotência: buscar por externalId primeiro
    console.log(`[sync-worker] Buscando customer por externalId=${externalId}`);
    const searchResp = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?externalId=${externalId}`,
      { method: 'GET', headers }
    );
    
    if (searchResp.ok) {
      const searchResult = await searchResp.json();
      const existing = Array.isArray(searchResult) ? searchResult : searchResult?.items;
      
      if (existing && existing.length > 0) {
        // Já existe - fazer PUT
        fieldCustomerId = existing[0].id;
        console.log(`[sync-worker] Cliente encontrado por externalId: ${fieldCustomerId}`);
        
        const response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${fieldCustomerId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(fieldPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Field PUT existente ${response.status}: ${errorText}`);
        }
      }
    }

    // Se não encontrou, criar novo
    if (!fieldCustomerId) {
      console.log(`[sync-worker] POST customer externalId=${externalId}`);
      const response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Field POST ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      fieldCustomerId = result.id;

      if (!fieldCustomerId) {
        throw new Error('Field não retornou customer ID');
      }
    }

    // Salvar field_customer_id IMEDIATAMENTE
    await supabase
      .from('clientes')
      .update({
        field_customer_id: fieldCustomerId,
        sync_status: 'synced',
        sync_last_error: null,
        sync_updated_at: new Date().toISOString()
      })
      .eq('id', job.entity_id);
  }

  // Atualizar sync_status
  await supabase
    .from('clientes')
    .update({
      sync_status: 'synced',
      sync_last_error: null,
      sync_updated_at: new Date().toISOString()
    })
    .eq('id', job.entity_id);

  console.log(`[sync-worker] Cliente sincronizado: ${job.entity_id} -> ${fieldCustomerId}`);

  // Processar equipamentos pendentes (usando RPC otimizada)
  await processEquipmentsPendingForCustomer(job.entity_id, fieldCustomerId, job.company_id, supabase);
}

async function processEquipmentsPendingForCustomer(clienteId: string, fieldCustomerId: string, companyId: string, supabase: any) {
  // Tentar usar RPC otimizada
  try {
    const { data: pendingJobs, error } = await supabase.rpc('get_pending_equipment_jobs_for_customer', {
      p_company_id: companyId,
      p_client_id: clienteId
    });

    if (!error && pendingJobs && pendingJobs.length > 0) {
      for (const eqJob of pendingJobs) {
        const newPayload = { ...eqJob.payload_json, field_customer_id: fieldCustomerId };
        
        await supabase
          .from('sync_jobs')
          .update({
            payload_json: newPayload,
            next_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', eqJob.id);
        
        console.log(`[sync-worker] Equipment job ${eqJob.id} atualizado com field_customer_id`);
      }
      return;
    }
  } catch (e) {
    console.log('[sync-worker] RPC not available, using fallback query');
  }

  // Fallback: busca normal com filtro
  const { data: pendingEquipJobs } = await supabase
    .from('sync_jobs')
    .select('id, entity_id, payload_json')
    .eq('entity_type', 'equipment')
    .eq('company_id', companyId)
    .in('status', ['pending', 'error']);

  if (!pendingEquipJobs) return;

  for (const eqJob of pendingEquipJobs) {
    if (eqJob.payload_json?.client_id === clienteId && !eqJob.payload_json?.field_customer_id) {
      const newPayload = { ...eqJob.payload_json, field_customer_id: fieldCustomerId };
      
      await supabase
        .from('sync_jobs')
        .update({
          payload_json: newPayload,
          next_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', eqJob.id);
      
      console.log(`[sync-worker] Equipment job ${eqJob.id} atualizado com field_customer_id`);
    }
  }
}

async function processEquipmentJob(job: SyncJob, headers: any, supabase: any) {
  const payload = job.payload_json;
  const externalId = job.entity_id;
  
  // Verificar field_customer_id
  let fieldCustomerId = payload.field_customer_id;
  
  if (!fieldCustomerId && payload.client_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('field_customer_id')
      .eq('id', payload.client_id)
      .single();
    
    fieldCustomerId = cliente?.field_customer_id;
  }

  if (!fieldCustomerId) {
    throw new Error('Cliente não sincronizado - aguardando');
  }

  // Buscar equipamento
  const { data: equipment } = await supabase
    .from('equipments')
    .select('id, field_equipment_id')
    .eq('id', job.entity_id)
    .single();

  if (!equipment) {
    throw new Error('Equipamento não encontrado no WAI');
  }

  // Montar payload
  const fieldPayload = {
    externalId: externalId,
    number: payload.serial_number || `EQ-${job.entity_id.substring(0, 8)}`,
    name: payload.model || 'Equipamento',
    brand: payload.brand || '',
    customer: { id: fieldCustomerId }
  };

  let fieldEquipmentId = equipment.field_equipment_id;

  if (fieldEquipmentId) {
    // PUT
    console.log(`[sync-worker] PUT equipment ${fieldEquipmentId}`);
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments/${fieldEquipmentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fieldPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Field PUT equipment ${response.status}: ${errorText}`);
    }
  } else {
    // Idempotência: buscar por externalId
    console.log(`[sync-worker] Buscando equipment por externalId=${externalId}`);
    const searchResp = await fetch(
      `${FIELD_CONTROL_BASE_URL}/equipments?externalId=${externalId}`,
      { method: 'GET', headers }
    );
    
    if (searchResp.ok) {
      const searchResult = await searchResp.json();
      const existing = Array.isArray(searchResult) ? searchResult : searchResult?.items;
      
      if (existing && existing.length > 0) {
        fieldEquipmentId = existing[0].id;
        console.log(`[sync-worker] Equipment encontrado por externalId: ${fieldEquipmentId}`);
        
        const response = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments/${fieldEquipmentId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(fieldPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Field PUT equipment existente ${response.status}: ${errorText}`);
        }
      }
    }

    // Criar se não encontrou
    if (!fieldEquipmentId) {
      console.log(`[sync-worker] POST equipment externalId=${externalId}`);
      const response = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Field POST equipment ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      fieldEquipmentId = result.id;

      if (!fieldEquipmentId) {
        throw new Error('Field não retornou equipment ID');
      }
    }

    // Salvar IMEDIATAMENTE
    await supabase
      .from('equipments')
      .update({
        field_equipment_id: fieldEquipmentId,
        sync_status: 'synced',
        sync_last_error: null,
        sync_updated_at: new Date().toISOString()
      })
      .eq('id', job.entity_id);
  }

  // Atualizar sync_status
  await supabase
    .from('equipments')
    .update({
      sync_status: 'synced',
      sync_last_error: null,
      sync_updated_at: new Date().toISOString()
    })
    .eq('id', job.entity_id);

  console.log(`[sync-worker] Equipamento sincronizado: ${job.entity_id} -> ${fieldEquipmentId}`);
}

async function processServiceOrderJob(job: SyncJob, headers: any, supabase: any) {
  const externalId = job.entity_id;
  
  // Buscar OS com cliente
  const { data: os } = await supabase
    .from('service_orders')
    .select('*, client:clientes(field_customer_id)')
    .eq('id', job.entity_id)
    .single();

  if (!os) {
    throw new Error('OS não encontrada no WAI');
  }

  const fieldCustomerId = os.client?.field_customer_id;
  if (!fieldCustomerId) {
    throw new Error('Cliente da OS não sincronizado - aguardando');
  }

  let fieldTaskId = os.field_task_id;

  // Montar payload
  const scheduledDate = os.scheduled_date || os.order_date;
  const scheduledTime = os.scheduled_time || '08:00';
  
  const fieldPayload = {
    identifier: String(os.order_number),
    externalId: externalId,
    customer: { id: fieldCustomerId },
    scheduledTo: `${scheduledDate}T${scheduledTime}:00`,
    description: os.reported_issue || `Ordem de Serviço #${os.order_number}`
  };

  if (fieldTaskId) {
    // PUT
    console.log(`[sync-worker] PUT task ${fieldTaskId}`);
    const response = await fetch(`${FIELD_CONTROL_BASE_URL}/tasks/${fieldTaskId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fieldPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Field PUT task ${response.status}: ${errorText}`);
    }
  } else {
    // Idempotência: buscar por externalId ou identifier
    console.log(`[sync-worker] Buscando task por externalId=${externalId}`);
    const searchResp = await fetch(
      `${FIELD_CONTROL_BASE_URL}/tasks?externalId=${externalId}`,
      { method: 'GET', headers }
    );
    
    if (searchResp.ok) {
      const searchResult = await searchResp.json();
      const existing = Array.isArray(searchResult) ? searchResult : searchResult?.items;
      
      if (existing && existing.length > 0) {
        fieldTaskId = existing[0].id;
        console.log(`[sync-worker] Task encontrada por externalId: ${fieldTaskId}`);
        
        const response = await fetch(`${FIELD_CONTROL_BASE_URL}/tasks/${fieldTaskId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(fieldPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Field PUT task existente ${response.status}: ${errorText}`);
        }
      }
    }

    // Criar se não encontrou
    if (!fieldTaskId) {
      console.log(`[sync-worker] POST task identifier=${os.order_number}`);
      const response = await fetch(`${FIELD_CONTROL_BASE_URL}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Field POST task ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      fieldTaskId = result.id;

      if (!fieldTaskId) {
        throw new Error('Field não retornou task ID');
      }
    }

    // Salvar IMEDIATAMENTE
    await supabase
      .from('service_orders')
      .update({
        field_task_id: fieldTaskId,
        field_sync_status: 'synced',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.entity_id);
  }

  // Atualizar sync_status
  await supabase
    .from('service_orders')
    .update({
      field_sync_status: 'synced',
      updated_at: new Date().toISOString()
    })
    .eq('id', job.entity_id);

  console.log(`[sync-worker] OS sincronizada: ${job.entity_id} -> ${fieldTaskId}`);
}

async function markJobError(job: SyncJob, errorMsg: string, supabase: any) {
  const newAttempts = job.attempts + 1;
  const isDeadLetter = newAttempts >= job.max_attempts;

  // Retry exponencial: 1m, 2m, 4m, 8m, 16m... max 4h
  const backoffMinutes = Math.min(Math.pow(2, newAttempts - 1), 240);
  const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

  await supabase
    .from('sync_jobs')
    .update({
      status: isDeadLetter ? 'dead' : 'error',
      attempts: newAttempts,
      last_error: errorMsg.substring(0, 1000),
      next_retry_at: isDeadLetter ? null : nextRetryAt.toISOString(),
      processing_started_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id);

  // Atualizar status da entidade
  const entityTable = job.entity_type === 'customer' ? 'clientes' : 
                      job.entity_type === 'equipment' ? 'equipments' : 
                      'service_orders';

  const statusField = job.entity_type === 'service_order' ? 'field_sync_status' : 'sync_status';

  await supabase
    .from(entityTable)
    .update({
      [statusField]: 'error',
      sync_last_error: errorMsg.substring(0, 500),
      sync_updated_at: new Date().toISOString()
    })
    .eq('id', job.entity_id);

  console.log(`[sync-worker] Job ${job.id} marcado como ${isDeadLetter ? 'dead' : 'error'}, attempt ${newAttempts}/${job.max_attempts}`);
}
