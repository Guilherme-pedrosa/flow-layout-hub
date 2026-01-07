import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';

// Retry intervals: 1min, 5min, 15min, 1h, 4h
const RETRY_INTERVALS_MS = [
  60 * 1000,        // 1 min
  5 * 60 * 1000,    // 5 min
  15 * 60 * 1000,   // 15 min
  60 * 60 * 1000,   // 1 hour
  4 * 60 * 60 * 1000 // 4 hours
];

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
}

/**
 * FIELD-SYNC-WORKER
 * 
 * Worker que processa a fila sync_jobs com retry exponencial.
 * Executado via cron a cada minuto.
 * 
 * Fluxo:
 * 1. Busca jobs pendentes (status = 'pending' ou 'error' com next_retry_at <= now)
 * 2. Processa cada job (customer, equipment, service_order)
 * 3. Atualiza status para 'done' ou 'error'
 * 4. Se erro, calcula próximo retry exponencial
 * 5. Se max_attempts atingido, marca como 'dead'
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
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

    // Buscar jobs para processar (limit para não estourar timeout)
    const { data: jobs, error: fetchError } = await supabase
      .from('sync_jobs')
      .select('*')
      .in('status', ['pending', 'error'])
      .lte('next_retry_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error('[sync-worker] Erro buscando jobs:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhum job pendente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-worker] Processando ${jobs.length} jobs`);

    const results = {
      processed: 0,
      success: 0,
      errors: 0,
      dead: 0
    };

    for (const job of jobs as SyncJob[]) {
      // Marcar como processing
      await supabase
        .from('sync_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', job.id);

      try {
        await processJob(job, apiKey, supabase);
        
        // Sucesso - marcar como done
        await supabase
          .from('sync_jobs')
          .update({ 
            status: 'done', 
            last_error: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);

        results.success++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[sync-worker] Erro job ${job.id}: ${errorMsg}`);

        const newAttempts = job.attempts + 1;
        
        if (newAttempts >= job.max_attempts) {
          // Max attempts - dead letter
          await supabase
            .from('sync_jobs')
            .update({ 
              status: 'dead',
              attempts: newAttempts,
              last_error: errorMsg,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          results.dead++;
        } else {
          // Calcular próximo retry exponencial
          const retryIndex = Math.min(newAttempts - 1, RETRY_INTERVALS_MS.length - 1);
          const nextRetryMs = RETRY_INTERVALS_MS[retryIndex];
          const nextRetryAt = new Date(Date.now() + nextRetryMs);

          await supabase
            .from('sync_jobs')
            .update({ 
              status: 'error',
              attempts: newAttempts,
              next_retry_at: nextRetryAt.toISOString(),
              last_error: errorMsg,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          results.errors++;
        }
      }

      results.processed++;

      // Evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check timeout (max 25 segundos para edge function)
      if (Date.now() - startTime > 25000) {
        console.log('[sync-worker] Timeout approaching, stopping');
        break;
      }
    }

    console.log(`[sync-worker] Finalizado: ${JSON.stringify(results)}`);

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

async function processJob(job: SyncJob, apiKey: string, supabase: any) {
  const headers = {
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json'
  };

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
  
  // Buscar cliente para verificar se já tem field_customer_id
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
    externalId: job.entity_id, // WAI ID como externalId para idempotência
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

  let response: Response;
  let fieldCustomerId = cliente.field_customer_id;

  if (fieldCustomerId) {
    // PUT - atualizar
    console.log(`[sync-worker] PUT customer ${fieldCustomerId}`);
    response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${fieldCustomerId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fieldPayload)
    });
  } else {
    // POST - criar (ou buscar existente por externalId)
    console.log(`[sync-worker] POST customer externalId=${job.entity_id}`);
    
    // Primeiro tentar buscar por externalId
    const searchResp = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?externalId=${job.entity_id}`,
      { method: 'GET', headers }
    );
    
    if (searchResp.ok) {
      const existing = await searchResp.json();
      if (Array.isArray(existing) && existing.length > 0) {
        fieldCustomerId = existing[0].id;
        console.log(`[sync-worker] Cliente já existe no Field: ${fieldCustomerId}`);
        
        // Atualizar
        response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers/${fieldCustomerId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(fieldPayload)
        });
      } else {
        // Criar novo
        response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(fieldPayload)
        });
      }
    } else {
      // Criar novo
      response = await fetch(`${FIELD_CONTROL_BASE_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fieldPayload)
      });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Field API ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  fieldCustomerId = result.id || fieldCustomerId;

  if (!fieldCustomerId) {
    throw new Error('Field não retornou ID');
  }

  // Atualizar cliente no WAI
  await supabase
    .from('clientes')
    .update({
      field_customer_id: fieldCustomerId,
      sync_status: 'synced',
      sync_last_error: null,
      sync_updated_at: new Date().toISOString()
    })
    .eq('id', job.entity_id);

  console.log(`[sync-worker] Cliente sincronizado: ${job.entity_id} -> ${fieldCustomerId}`);

  // Processar equipamentos pendentes deste cliente
  await processEquipmentsPendingForCustomer(job.entity_id, fieldCustomerId, supabase);
}

async function processEquipmentsPendingForCustomer(clienteId: string, fieldCustomerId: string, supabase: any) {
  // Buscar jobs de equipment que estavam esperando este cliente
  const { data: pendingEquipJobs } = await supabase
    .from('sync_jobs')
    .select('id, entity_id, payload_json')
    .eq('entity_type', 'equipment')
    .in('status', ['pending', 'error']);

  if (!pendingEquipJobs) return;

  for (const eqJob of pendingEquipJobs) {
    if (eqJob.payload_json?.client_id === clienteId && !eqJob.payload_json?.field_customer_id) {
      // Atualizar payload com field_customer_id
      const newPayload = { ...eqJob.payload_json, field_customer_id: fieldCustomerId };
      
      await supabase
        .from('sync_jobs')
        .update({
          payload_json: newPayload,
          next_retry_at: new Date().toISOString(), // Processar agora
          updated_at: new Date().toISOString()
        })
        .eq('id', eqJob.id);
      
      console.log(`[sync-worker] Equipment job ${eqJob.id} atualizado com field_customer_id`);
    }
  }
}

async function processEquipmentJob(job: SyncJob, headers: any, supabase: any) {
  const payload = job.payload_json;
  
  // Verificar se tem field_customer_id
  let fieldCustomerId = payload.field_customer_id;
  
  if (!fieldCustomerId && payload.client_id) {
    // Buscar no cliente
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

  // Buscar equipamento para verificar se já tem field_equipment_id
  const { data: equipment } = await supabase
    .from('equipments')
    .select('id, field_equipment_id')
    .eq('id', job.entity_id)
    .single();

  if (!equipment) {
    throw new Error('Equipamento não encontrado no WAI');
  }

  // Montar payload do Field
  const fieldPayload = {
    externalId: job.entity_id, // WAI ID para idempotência
    number: payload.serial_number || `EQ-${job.entity_id.substring(0, 8)}`,
    name: payload.model || 'Equipamento',
    brand: payload.brand || '',
    customer: { id: fieldCustomerId }
  };

  let response: Response;
  let fieldEquipmentId = equipment.field_equipment_id;

  if (fieldEquipmentId) {
    // PUT
    console.log(`[sync-worker] PUT equipment ${fieldEquipmentId}`);
    response = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments/${fieldEquipmentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(fieldPayload)
    });
  } else {
    // POST
    console.log(`[sync-worker] POST equipment externalId=${job.entity_id}`);
    response = await fetch(`${FIELD_CONTROL_BASE_URL}/equipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(fieldPayload)
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Field API ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  fieldEquipmentId = result.id || fieldEquipmentId;

  if (!fieldEquipmentId) {
    throw new Error('Field não retornou ID');
  }

  // Atualizar equipamento no WAI
  await supabase
    .from('equipments')
    .update({
      field_equipment_id: fieldEquipmentId,
      sync_status: 'synced',
      sync_last_error: null,
      sync_updated_at: new Date().toISOString()
    })
    .eq('id', job.entity_id);

  console.log(`[sync-worker] Equipamento sincronizado: ${job.entity_id} -> ${fieldEquipmentId}`);
}

async function processServiceOrderJob(job: SyncJob, headers: any, supabase: any) {
  const payload = job.payload_json;
  
  // Verificar se cliente tem field_customer_id
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

  // Montar payload do Field (Task)
  const scheduledDate = os.scheduled_date || os.order_date;
  const scheduledTime = os.scheduled_time || '08:00';
  
  const fieldPayload = {
    identifier: String(os.order_number),
    externalId: job.entity_id,
    customer: { id: fieldCustomerId },
    scheduledTo: `${scheduledDate}T${scheduledTime}:00`,
    description: os.reported_issue || `Ordem de Serviço #${os.order_number}`
  };

  console.log(`[sync-worker] POST task identifier=${os.order_number}`);
  
  const response = await fetch(`${FIELD_CONTROL_BASE_URL}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(fieldPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Field API ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const fieldTaskId = result.id;

  if (!fieldTaskId) {
    throw new Error('Field não retornou task ID');
  }

  // Atualizar OS no WAI
  await supabase
    .from('service_orders')
    .update({
      field_task_id: fieldTaskId,
      field_order_id: result.workOrderId || null,
      field_sync_status: 'synced',
      field_synced_at: new Date().toISOString()
    })
    .eq('id', job.entity_id);

  console.log(`[sync-worker] OS sincronizada: ${os.order_number} -> task ${fieldTaskId}`);
}
