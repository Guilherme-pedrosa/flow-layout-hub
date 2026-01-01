import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ncm, productDescription } = await req.json();

    if (!ncm) {
      return new Response(
        JSON.stringify({ valid: false, error: 'NCM não informado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const cleanNCM = ncm.replace(/\D/g, '');

    // Validar formato básico do NCM (8 dígitos)
    if (cleanNCM.length !== 8) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'NCM deve ter 8 dígitos',
          ncm: cleanNCM 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Você é um especialista em classificação fiscal NCM (Nomenclatura Comum do Mercosul) brasileira.

Analise o código NCM: ${cleanNCM}
${productDescription ? `Descrição do produto: ${productDescription}` : ''}

Retorne APENAS um JSON válido com a seguinte estrutura (sem markdown, sem código, apenas o JSON puro):
{
  "valid": true ou false,
  "ncmDescription": "descrição oficial do NCM se válido",
  "suggestion": "sugestão de NCM correto se o informado parecer errado para o produto",
  "confidence": "alta", "média" ou "baixa",
  "notes": "observações relevantes sobre a classificação"
}

Exemplos de NCMs válidos:
- 84713012: Máquinas automáticas para processamento de dados, portáteis
- 39269090: Outras obras de plástico
- 85234920: CDs para leitura por sistema a laser

Se o NCM não existir ou parecer inválido, retorne valid: false com uma sugestão apropriada.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Créditos insuficientes para validação de NCM.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Erro ao consultar IA para validação');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse do JSON da resposta
    let validationResult;
    try {
      // Remover possíveis marcadores de código markdown
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      validationResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', content);
      // Tentar extrair informação do texto
      const isValid = content.toLowerCase().includes('"valid": true') || content.toLowerCase().includes('"valid":true');
      validationResult = {
        valid: isValid,
        ncmDescription: isValid ? 'NCM validado' : 'Não foi possível validar',
        confidence: 'baixa',
        notes: 'Validação parcial - resposta da IA não estruturada'
      };
    }

    return new Response(
      JSON.stringify({
        ...validationResult,
        ncm: cleanNCM,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating NCM:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
