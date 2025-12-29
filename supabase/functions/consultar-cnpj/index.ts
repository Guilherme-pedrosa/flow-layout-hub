import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    
    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove formatting from CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Consultando CNPJ:', cnpjLimpo);

    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
    
    if (!response.ok) {
      console.error('Erro na API ReceitaWS:', response.status);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar CNPJ' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (data.status === 'ERROR') {
      console.log('CNPJ não encontrado ou inválido');
      return new Response(
        JSON.stringify({ error: data.message || 'CNPJ não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CNPJ encontrado:', data.nome);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao consultar CNPJ' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
