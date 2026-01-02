import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';
const DELETE_BATCH_SIZE = 100;

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

    const headers = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    };

    console.log(`[field-delete-all] Buscando clientes do Field Control...`);

    // Buscar clientes sem paginação (apenas limit)
    const response = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?limit=${DELETE_BATCH_SIZE}`,
      { method: 'GET', headers: { 'X-Api-Key': apiKey } }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[field-delete-all] Erro ao buscar: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao buscar clientes: ${response.status}`, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();
    const customers = Array.isArray(data) ? data : (data?.customers || data?.items || data?.data || []);
    
    console.log(`[field-delete-all] Encontrados ${customers.length} clientes para deletar neste batch`);
    
    if (customers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum cliente restante no Field Control',
          deleted: 0,
          remaining: 0,
          has_more: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deletar cada cliente do batch
    let deleted = 0;
    let errors = 0;

    for (const customer of customers) {
      try {
        const deleteResponse = await fetch(
          `${FIELD_CONTROL_BASE_URL}/customers/${customer.id}`,
          { method: 'DELETE', headers }
        );
        
        if (deleteResponse.ok || deleteResponse.status === 204) {
          deleted++;
          console.log(`[field-delete-all] Deletado: ${customer.id}`);
        } else {
          errors++;
          console.error(`[field-delete-all] Erro ao deletar ${customer.id}: ${deleteResponse.status}`);
        }
        
        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 30));
        
      } catch (error) {
        errors++;
        console.error(`[field-delete-all] Erro: ${error}`);
      }
    }

    console.log(`[field-delete-all] Batch concluído: ${deleted} deletados, ${errors} erros`);

    // Verificar se ainda há mais clientes
    const checkResponse = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?limit=1`,
      { method: 'GET', headers: { 'X-Api-Key': apiKey } }
    );
    
    let hasMore = false;
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      const remaining = Array.isArray(checkData) ? checkData : (checkData?.customers || checkData?.items || checkData?.data || []);
      hasMore = remaining.length > 0;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted,
        errors,
        has_more: hasMore,
        message: hasMore ? 'Execute novamente para continuar deletando' : 'Todos os clientes foram deletados'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[field-delete-all] Erro geral: ${msg}`);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
