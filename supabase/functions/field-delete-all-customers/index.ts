import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIELD_CONTROL_BASE_URL = 'https://carchost.fieldcontrol.com.br';
const DELETE_BATCH_SIZE = 50;

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

    // Buscar primeira página de clientes
    const response = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?page=1&limit=${DELETE_BATCH_SIZE}`,
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
    
    console.log(`[field-delete-all] Encontrados ${customers.length} clientes. Primeiro: ${JSON.stringify(customers[0] || {})}`);
    
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
    const errorDetails: string[] = [];

    for (const customer of customers) {
      try {
        // O ID pode estar em diferentes formatos - tentar decodificar se for base64
        let customerId = customer.id;
        
        // Tentar deletar diretamente primeiro
        let deleteResponse = await fetch(
          `${FIELD_CONTROL_BASE_URL}/customers/${customerId}`,
          { method: 'DELETE', headers }
        );
        
        // Se falhar, tentar outros endpoints comuns
        if (!deleteResponse.ok && deleteResponse.status === 404) {
          // Tentar com PATCH para desativar (algumas APIs usam soft delete)
          deleteResponse = await fetch(
            `${FIELD_CONTROL_BASE_URL}/customers/${customerId}`,
            { 
              method: 'PATCH', 
              headers,
              body: JSON.stringify({ isActive: false, deleted: true })
            }
          );
        }
        
        if (deleteResponse.ok || deleteResponse.status === 204 || deleteResponse.status === 200) {
          deleted++;
          console.log(`[field-delete-all] Deletado: ${customerId}`);
        } else {
          errors++;
          const errText = await deleteResponse.text();
          console.error(`[field-delete-all] Erro ao deletar ${customerId}: ${deleteResponse.status} - ${errText}`);
          if (errorDetails.length < 3) {
            errorDetails.push(`${customerId}: ${deleteResponse.status}`);
          }
        }
        
        // Delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        errors++;
        console.error(`[field-delete-all] Erro: ${error}`);
      }
    }

    console.log(`[field-delete-all] Batch concluído: ${deleted} deletados, ${errors} erros`);

    // Verificar se ainda há mais clientes
    const checkResponse = await fetch(
      `${FIELD_CONTROL_BASE_URL}/customers?page=1&limit=1`,
      { method: 'GET', headers: { 'X-Api-Key': apiKey } }
    );
    
    let hasMore = false;
    let remaining = 0;
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      const remainingList = Array.isArray(checkData) ? checkData : (checkData?.customers || checkData?.items || checkData?.data || []);
      hasMore = remainingList.length > 0;
      remaining = remainingList.length;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted,
        errors,
        error_samples: errorDetails,
        has_more: hasMore,
        remaining,
        message: hasMore ? `Execute novamente para continuar. Deletados: ${deleted}, Erros: ${errors}` : 'Todos os clientes foram deletados'
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
