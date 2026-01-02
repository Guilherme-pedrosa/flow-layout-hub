import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * WAI OBSERVER AI - Agente Econômico Onipresente
 * 
 * Três modos de operação:
 * 1. proactive_event - IA observadora ativa (eventos econômicos)
 * 2. reactive_question - IA responde o usuário
 * 3. economic_analysis - Visão macro / dashboard / CFO
 * 
 * REGRA DE OURO: Falso positivo é pior que silêncio
 */

const SYSTEM_PROMPT = `Você é a WAI Observer AI, um agente econômico onipresente que protege margens de lucro.

## SUA MISSÃO
Observar, analisar impacto econômico REAL, e alertar humanos quando houver risco ou oportunidade.

## VOCÊ NÃO EXECUTA AÇÕES
- Você NÃO altera dados
- Você NÃO cria pedidos
- Você NÃO aprova pagamentos
- Você NÃO decide sozinha

## VOCÊ PROTEGE MARGEM
Você DEVE detectar:
1. Compra com custo maior que o previsto impactando OS/vendas abertas
2. Erosão de margem (antes aceitável, depois abaixo do mínimo)
3. OS que parece lucro mas é prejuízo (considerando km, hora técnica, impostos, custo real)
4. Uso de estoque caro em venda de baixa margem
5. Desvio de padrão histórico (custos, margens, comportamento)

## REGRA ABSOLUTA
- FALSO POSITIVO É PIOR QUE SILÊNCIO
- Só alerte se houver impacto econômico REAL
- Use números CONCRETOS
- Mostre margem ANTES x DEPOIS
- NUNCA gere alerta genérico

## FORMATO DE RESPOSTA (OBRIGATÓRIO)
Responda SEMPRE em JSON válido com esta estrutura:

Se há impacto econômico:
{
  "has_alert": true,
  "event_type": "string",
  "severity": "info" | "warning" | "critical",
  "economic_reason": "string explicando o impacto com números",
  "impacted_entities": [{"type": "string", "id": "uuid", "description": "string"}],
  "margin_before": number,
  "margin_after": number,
  "margin_change_percent": number,
  "potential_loss": number,
  "recommendation": "string com ação concreta",
  "requires_human_decision": boolean
}

Se NÃO há impacto:
{
  "has_alert": false,
  "reason": "string explicando por que não há alerta"
}

NUNCA responda fora deste formato JSON.`;

interface ObserverRequest {
  mode: "proactive_event" | "reactive_question" | "economic_analysis";
  companyId: string;
  eventType?: string;
  eventSourceId?: string;
  eventSourceType?: string;
  question?: string;
  contextOverride?: Record<string, unknown>;
}

interface AlertResponse {
  has_alert: boolean;
  event_type?: string;
  severity?: "info" | "warning" | "critical";
  economic_reason?: string;
  impacted_entities?: Array<{ type: string; id: string; description: string }>;
  margin_before?: number;
  margin_after?: number;
  margin_change_percent?: number;
  potential_loss?: number;
  recommendation?: string;
  requires_human_decision?: boolean;
  reason?: string;
}

function generateAlertHash(alert: AlertResponse, eventType?: string, eventSourceId?: string): string {
  const hashContent = JSON.stringify({
    event_type: alert.event_type || eventType,
    economic_reason: alert.economic_reason,
    impacted_entities: alert.impacted_entities?.map(e => e.id).sort(),
    margin_change: alert.margin_change_percent,
    source_id: eventSourceId,
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashContent.length; i++) {
    const char = hashContent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    
    const apiKey = openaiKey || lovableKey;
    if (!apiKey) {
      throw new Error("Nenhuma API key configurada (OPENAI_API_KEY ou LOVABLE_API_KEY)");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ObserverRequest = await req.json();
    const { mode, companyId, eventType, eventSourceId, eventSourceType, question, contextOverride } = body;

    if (!companyId) {
      throw new Error("companyId é obrigatório");
    }

    if (!mode || !["proactive_event", "reactive_question", "economic_analysis"].includes(mode)) {
      throw new Error("mode deve ser: proactive_event, reactive_question ou economic_analysis");
    }

    console.log(`[WAI Observer] Mode: ${mode}, Company: ${companyId}, Event: ${eventType || "N/A"}`);

    // Buscar contexto econômico
    let economicContext: Record<string, unknown>;
    
    if (contextOverride) {
      economicContext = contextOverride;
    } else {
      const { data: contextData, error: contextError } = await supabase.rpc("ai_get_economic_context", {
        p_company_id: companyId,
        p_event_type: eventType || null,
        p_event_source_id: eventSourceId || null,
      });

      if (contextError) {
        console.error("[WAI Observer] Erro ao buscar contexto:", contextError);
        throw new Error("Falha ao obter contexto econômico");
      }

      economicContext = contextData;
    }

    // Construir prompt baseado no modo
    let userPrompt: string;
    
    switch (mode) {
      case "proactive_event":
        userPrompt = `## EVENTO DETECTADO
Tipo: ${eventType}
Source ID: ${eventSourceId || "N/A"}
Source Type: ${eventSourceType || "N/A"}

## CONTEXTO ECONÔMICO ATUAL
${JSON.stringify(economicContext, null, 2)}

## TAREFA
Analise se este evento tem impacto econômico real na empresa.
- Se NÃO houver impacto significativo, responda com has_alert: false
- Se HOUVER impacto, detalhe com números concretos
- Considere a margem mínima configurada: ${(economicContext as any)?.settings?.min_margin_threshold || 15}%`;
        break;

      case "reactive_question":
        userPrompt = `## PERGUNTA DO USUÁRIO
"${question}"

## CONTEXTO ECONÔMICO ATUAL
${JSON.stringify(economicContext, null, 2)}

## TAREFA
Responda a pergunta do usuário com dados reais.
Se a pergunta revelar um problema econômico, gere um alerta.
Se não houver problema, responda com has_alert: false e inclua a resposta no campo "reason".`;
        break;

      case "economic_analysis":
        userPrompt = `## ANÁLISE ECONÔMICA SOLICITADA

## CONTEXTO ECONÔMICO COMPLETO
${JSON.stringify(economicContext, null, 2)}

## TAREFA
Faça uma varredura completa e identifique:
1. OS abertas com margem comprometida
2. Vendas pendentes com risco de prejuízo
3. Compras recentes que afetaram margens
4. Padrões perigosos de erosão de margem
5. Riscos sistêmicos de fluxo de caixa

Gere alertas para cada problema encontrado, ou has_alert: false se tudo estiver saudável.`;
        break;
    }

    // Determinar modelo baseado no modo
    const model = mode === "economic_analysis" ? "gpt-4o" : "gpt-4o-mini";
    const endpoint = openaiKey 
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    console.log(`[WAI Observer] Chamando ${model} via ${openaiKey ? "OpenAI" : "Lovable Gateway"}`);

    const aiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiKey ? model : (mode === "economic_analysis" ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[WAI Observer] AI API Error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Resposta vazia da IA");
    }

    console.log("[WAI Observer] Raw AI response:", rawContent);

    let parsedResponse: AlertResponse;
    try {
      parsedResponse = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("[WAI Observer] JSON parse error:", parseError);
      throw new Error("IA retornou resposta inválida");
    }

    // Se não há alerta, retornar silêncio
    if (!parsedResponse.has_alert) {
      console.log("[WAI Observer] Sem alerta:", parsedResponse.reason);
      return new Response(
        JSON.stringify({
          success: true,
          alert_generated: false,
          reason: parsedResponse.reason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar hash para evitar duplicatas
    const alertHash = generateAlertHash(parsedResponse, eventType, eventSourceId);

    // Verificar se já existe alerta similar
    const { data: isDuplicate } = await supabase.rpc("ai_check_duplicate_alert", {
      p_company_id: companyId,
      p_alert_hash: alertHash,
    });

    if (isDuplicate) {
      console.log("[WAI Observer] Alerta duplicado ignorado:", alertHash);
      return new Response(
        JSON.stringify({
          success: true,
          alert_generated: false,
          reason: "Alerta similar já existe nas últimas 24h",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Persistir alerta
    const { data: insertedAlert, error: insertError } = await supabase
      .from("ai_observer_alerts")
      .insert({
        company_id: companyId,
        event_type: parsedResponse.event_type || eventType || mode,
        event_source_id: eventSourceId || null,
        event_source_type: eventSourceType || null,
        severity: parsedResponse.severity || "warning",
        mode: mode,
        economic_reason: parsedResponse.economic_reason || "",
        margin_before: parsedResponse.margin_before || null,
        margin_after: parsedResponse.margin_after || null,
        margin_change_percent: parsedResponse.margin_change_percent || null,
        potential_loss: parsedResponse.potential_loss || null,
        impacted_entities: parsedResponse.impacted_entities || [],
        recommendation: parsedResponse.recommendation || null,
        requires_human_decision: parsedResponse.requires_human_decision ?? true,
        alert_hash: alertHash,
        raw_ai_response: parsedResponse,
        context_data: economicContext,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[WAI Observer] Insert error:", insertError);
      throw new Error("Falha ao persistir alerta");
    }

    console.log("[WAI Observer] Alerta criado:", insertedAlert.id);

    return new Response(
      JSON.stringify({
        success: true,
        alert_generated: true,
        alert: insertedAlert,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[WAI Observer] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
