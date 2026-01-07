import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

/**
 * FIELD-WEBHOOK
 * 
 * Recebe eventos do Field Control e atualiza WAI em tempo real
 * 
 * Eventos suportados:
 * - task-started → "EM EXECUÇÃO"
 * - task-completed → "EXECUTADO - LIBERADO P/ FATURAMENTO"
 * - task-reported → "RELATÓRIO / FINALIZADO"
 * - task-canceled → "CANCELADO"
 * - equipment-created/updated (sync equipamentos)
 */

// Mapeamento de status Field → WAI
const STATUS_MAP: Record<string, string[]> = {
  'task-started': ['em execução', 'em andamento', 'iniciada', 'executando'],
  'task-completed': ['executado', 'liberado', 'faturamento', 'concluída', 'finalizada'],
  'task-reported': ['relatório', 'finalizado', 'encerrada'],
  'task-canceled': ['cancelado', 'cancelada'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validar webhook secret (se configurado)
  const webhookSecret = Deno.env.get('FIELD_WEBHOOK_SECRET');
  const receivedSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization');
  
  if (webhookSecret && receivedSecret !== webhookSecret && receivedSecret !== `Bearer ${webhookSecret}`) {
    console.log('[field-webhook] Secret inválido');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Processar webhook em background
  const processWebhook = async () => {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      let payload: any;
      try {
        payload = await req.json();
      } catch {
        console.log('[field-webhook] Payload inválido');
        return;
      }

      console.log('[field-webhook] Evento recebido:', JSON.stringify(payload).substring(0, 500));

      // Identificar tipo de evento
      const eventType = (
        payload.event || 
        payload.type || 
        payload.eventType || 
        ''
      ).toLowerCase();

      // Extrair dados da tarefa
      const taskData = payload.data || payload.task || payload;
      const taskId = taskData.id || taskData.taskId;
      const identifier = taskData.identifier || taskData.number;
      const statusName = taskData.status?.name || taskData.statusName || taskData.status || '';

      console.log(`[field-webhook] Event=${eventType}, taskId=${taskId}, identifier=${identifier}, status=${statusName}`);

      // === EVENTOS DE TASK ===
      if (eventType.includes('task') || taskId) {
        // Buscar OS no WAI
        let serviceOrder = null;

        // Tentar por field_task_id
        if (taskId) {
          const { data } = await supabase
            .from('service_orders')
            .select('id, company_id, status_id, order_number')
            .eq('field_task_id', String(taskId))
            .single();
          serviceOrder = data;
        }

        // Tentar por identifier (= order_number)
        if (!serviceOrder && identifier) {
          const { data } = await supabase
            .from('service_orders')
            .select('id, company_id, status_id, order_number')
            .eq('order_number', parseInt(identifier, 10))
            .single();
          serviceOrder = data;
        }

        if (!serviceOrder) {
          console.log(`[field-webhook] OS não encontrada para task ${taskId} / identifier ${identifier}`);
          return;
        }

        console.log(`[field-webhook] OS encontrada: ${serviceOrder.id} (order_number=${serviceOrder.order_number})`);

        // Determinar novo status baseado no evento
        let statusSearchTerms: string[] = [];

        if (eventType.includes('start')) {
          statusSearchTerms = STATUS_MAP['task-started'];
        } else if (eventType.includes('complete') || eventType.includes('finish')) {
          statusSearchTerms = STATUS_MAP['task-completed'];
        } else if (eventType.includes('report')) {
          statusSearchTerms = STATUS_MAP['task-reported'];
        } else if (eventType.includes('cancel')) {
          statusSearchTerms = STATUS_MAP['task-canceled'];
        } else {
          // Tentar inferir pelo status name
          const lowerStatus = statusName.toLowerCase();
          for (const [key, terms] of Object.entries(STATUS_MAP)) {
            if (terms.some(t => lowerStatus.includes(t))) {
              statusSearchTerms = terms;
              break;
            }
          }
        }

        if (statusSearchTerms.length === 0) {
          console.log(`[field-webhook] Evento ${eventType} não mapeado, ignorando`);
          return;
        }

        // Buscar status correspondente no WAI
        const orConditions = statusSearchTerms.map(t => `name.ilike.%${t}%`).join(',');
        
        const { data: newStatus } = await supabase
          .from('service_order_statuses')
          .select('id, name')
          .eq('company_id', serviceOrder.company_id)
          .or(orConditions)
          .limit(1)
          .single();

        if (!newStatus) {
          console.log(`[field-webhook] Status WAI não encontrado para termos: ${statusSearchTerms.join(', ')}`);
          
          // Registrar log de evento não processado
          await supabase.from('audit_logs').insert({
            company_id: serviceOrder.company_id,
            entity: 'service_orders',
            entity_id: serviceOrder.id,
            action: 'field_webhook_unmapped',
            metadata_json: {
              field_task_id: taskId,
              field_event: eventType,
              field_status: statusName,
              search_terms: statusSearchTerms
            }
          });
          return;
        }

        // Atualizar OS no WAI
        const updateData: any = {
          status_id: newStatus.id,
          updated_at: new Date().toISOString()
        };

        // Se for início, registrar started_at
        if (eventType.includes('start')) {
          updateData.started_at = new Date().toISOString();
        }

        // Se for conclusão, registrar finished_at
        if (eventType.includes('complete') || eventType.includes('finish') || eventType.includes('report')) {
          updateData.finished_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from('service_orders')
          .update(updateData)
          .eq('id', serviceOrder.id);

        if (updateError) {
          console.error('[field-webhook] Erro atualizando OS:', updateError);
        } else {
          console.log(`[field-webhook] OS ${serviceOrder.id} atualizada: ${newStatus.name}`);
        }

        // Registrar log de sucesso
        await supabase.from('audit_logs').insert({
          company_id: serviceOrder.company_id,
          entity: 'service_orders',
          entity_id: serviceOrder.id,
          action: 'field_webhook_processed',
          metadata_json: {
            field_task_id: taskId,
            field_event: eventType,
            field_status: statusName,
            new_wai_status: newStatus.name
          }
        });
      }

      // === EVENTOS DE EQUIPAMENTO ===
      if (eventType.includes('equipment')) {
        const equipmentData = payload.data || payload.equipment || payload;
        const equipmentId = equipmentData.id;
        const customerId = equipmentData.customer?.id || equipmentData.customerId;

        if (equipmentId && customerId) {
          console.log(`[field-webhook] Equipamento ${equipmentId} do customer ${customerId}`);

          // Buscar cliente WAI pelo field_customer_id
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id, company_id')
            .eq('field_customer_id', customerId)
            .single();

          if (cliente) {
            // Upsert equipamento
            const { error } = await supabase
              .from('equipments')
              .upsert({
                company_id: cliente.company_id,
                client_id: cliente.id,
                field_equipment_id: equipmentId,
                serial_number: equipmentData.number || equipmentData.serialNumber || `FIELD-${equipmentId}`,
                model: equipmentData.name || equipmentData.model || '',
                brand: equipmentData.brand || '',
                equipment_type: equipmentData.type?.name || '',
                is_active: true,
                updated_at: new Date().toISOString()
              }, { onConflict: 'company_id,field_equipment_id' });

            if (!error) {
              console.log(`[field-webhook] Equipamento ${equipmentId} sincronizado`);
            }
          }
        }
      }

    } catch (error) {
      console.error('[field-webhook] Erro:', error);
    }
  };

  // Processar em background sem bloquear resposta
  processWebhook();

  // Retornar 200 OK imediatamente (exigência Field Control: < 2 segundos)
  return new Response(
    JSON.stringify({ success: true, message: 'Webhook received' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
