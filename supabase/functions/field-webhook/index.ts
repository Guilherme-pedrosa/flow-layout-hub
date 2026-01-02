import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Status do Field que significa "finalizado"
const FINALIZED_STATUSES = ['Finalizada', 'Concluída', 'Finalizado', 'Concluído', 'Done', 'Completed'];

serve(async (req) => {
  // Permitir preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Retornar 200 imediatamente para o Field Control
  // Processar em background
  const processWebhook = async () => {
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const payload = await req.json();
      
      console.log('[field-webhook] Payload recebido:', JSON.stringify(payload));

      // Verificar tipo de evento
      const eventType = payload.event || payload.type || payload.eventType;
      
      if (!eventType) {
        console.log('[field-webhook] Evento sem tipo, ignorando');
        return;
      }

      // Processar apenas eventos de task
      if (!eventType.includes('task')) {
        console.log(`[field-webhook] Evento ${eventType} não é de task, ignorando`);
        return;
      }

      // Extrair dados da tarefa
      const taskData = payload.data || payload.task || payload;
      const taskId = taskData.id || taskData.taskId;
      const statusName = taskData.status?.name || taskData.statusName || taskData.status;

      if (!taskId) {
        console.log('[field-webhook] Sem taskId no payload');
        return;
      }

      console.log(`[field-webhook] Task ${taskId} - Status: ${statusName}`);

      // Buscar OS que tem esse field_task_id
      const { data: serviceOrder, error: findError } = await supabaseClient
        .from('service_orders')
        .select('id, company_id, status_id')
        .eq('field_task_id', String(taskId))
        .single();

      if (findError || !serviceOrder) {
        console.log(`[field-webhook] OS não encontrada para task ${taskId}`);
        return;
      }

      console.log(`[field-webhook] OS encontrada: ${serviceOrder.id}`);

      // Verificar se o status é "finalizado"
      const isFinalized = FINALIZED_STATUSES.some(
        s => statusName?.toLowerCase().includes(s.toLowerCase())
      );

      if (!isFinalized) {
        console.log(`[field-webhook] Status "${statusName}" não é finalizado, ignorando`);
        return;
      }

      console.log(`[field-webhook] Status "${statusName}" é finalizado, atualizando OS`);

      // Buscar o status "Aguardando Faturamento" ou similar
      const { data: newStatus } = await supabaseClient
        .from('service_order_statuses')
        .select('id, name')
        .eq('company_id', serviceOrder.company_id)
        .or('name.ilike.%faturamento%,name.ilike.%aguardando%fatura%,name.ilike.%finalizada%')
        .limit(1)
        .single();

      if (newStatus) {
        // Atualizar status da OS
        const { error: updateError } = await supabaseClient
          .from('service_orders')
          .update({ 
            status_id: newStatus.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', serviceOrder.id);

        if (updateError) {
          console.error('[field-webhook] Erro ao atualizar OS:', updateError);
        } else {
          console.log(`[field-webhook] OS ${serviceOrder.id} atualizada para "${newStatus.name}"`);
        }
      } else {
        console.log('[field-webhook] Status "Aguardando Faturamento" não encontrado');
        
        // Tentar criar um log/notificação
        await supabaseClient
          .from('audit_logs')
          .insert({
            company_id: serviceOrder.company_id,
            entity: 'service_orders',
            entity_id: serviceOrder.id,
            action: 'field_webhook_finalized',
            metadata_json: { 
              field_task_id: taskId, 
              field_status: statusName,
              message: 'OS finalizada no Field Control'
            }
          });
      }

    } catch (error) {
      console.error('[field-webhook] Erro:', error);
    }
  };

  // Processar em background sem bloquear a resposta
  processWebhook();

  // Retornar 200 OK imediatamente
  return new Response(
    JSON.stringify({ success: true, message: 'Webhook received' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
});
