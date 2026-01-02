import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * WAI OBSERVER AI - Agente Econômico Onipresente
 * 
 * REGRA DE OURO: Logs sempre / IA só quando necessário
 * 
 * Três modos:
 * 1. proactive_event - Evento detectado, motor determinístico decide se chama IA
 * 2. reactive_question - Usuário pergunta, IA sempre responde
 * 3. economic_analysis - Varredura completa (CFO mode)
 */

const SYSTEM_PROMPT = `Você é a WAI Observer AI do ERP WAI.

Função:
- Você OBSERVA eventos e RESPONDE perguntas.
- Você NÃO executa ações.
- Você NÃO altera dados.
- Você NÃO inventa números. Use SOMENTE os números do contexto fornecido.

Prioridade máxima:
Proteger a MARGEM REAL e detectar anomalias com impacto econômico.

Você deve responder SEMPRE com JSON válido, seguindo exatamente um dos formatos:

(1) ALERTA:
{
  "event_type": "string",
  "severity": "info|warning|critical",
  "economic_reason": "explicação objetiva com números reais",
  "impacted_entities": [{"type":"os|sale|product|purchase|payable|receivable|user","id":"uuid","description":"string"}],
  "margin_before": 0.00,
  "margin_after": 0.00,
  "margin_change_percent": 0.00,
  "potential_loss": 0.00,
  "recommendation": "ação recomendada (humana) e objetiva",
  "requires_human_decision": true
}

(2) SEM ALERTA:
{"no_alert": true, "reason": "sem impacto econômico relevante"}

Regras:
- Seja conservador: prefira silêncio a falso positivo.
- Não repita o mesmo alerta se o contexto indicar que já existe um alerta equivalente.
- Se o usuário fizer uma pergunta: responda com base no contexto e, se houver risco real, retorne ALERTA.
- Nunca use Markdown. Nunca use texto fora do JSON.`;

// ============================================
// TIPOS
// ============================================

interface ProactiveEventPayload {
  company_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_user_id?: string;
  diff?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

interface ReactiveQuestionPayload {
  company_id: string;
  question: string;
  screen_context?: {
    route?: string;
    entity_type?: string;
    entity_id?: string;
    filters?: Record<string, unknown>;
  };
}

interface EconomicAnalysisPayload {
  company_id: string;
}

type WaiObserverRequest =
  | { mode: "proactive_event"; payload: ProactiveEventPayload }
  | { mode: "reactive_question"; payload: ReactiveQuestionPayload }
  | { mode: "economic_analysis"; payload: EconomicAnalysisPayload };

interface RiskAssessment {
  shouldCallAI: boolean;
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  reasons: string[];
  preCalculatedMetrics: {
    marginBefore?: number;
    marginAfter?: number;
    marginChange?: number;
    potentialLoss?: number;
    costIncrease?: number;
  };
}

interface AlertResponse {
  no_alert?: boolean;
  reason?: string;
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
}

// ============================================
// MOTOR DETERMINÍSTICO DE RISCO
// ============================================

async function assessRisk(
  supabase: any,
  companyId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  settings: { minMargin: number; maxCostIncrease: number }
): Promise<RiskAssessment> {
  const reasons: string[] = [];
  let riskLevel: RiskAssessment["riskLevel"] = "none";
  const metrics: RiskAssessment["preCalculatedMetrics"] = {};

  // EVENTOS QUE SEMPRE CHAMAM IA
  const criticalEvents = [
    "purchase_order.approved",
    "purchase_order.xml_uploaded",
    "sale.deleted",
    "service_order.deleted",
    "service_order.checkout_reopened",
    "payable.canceled",
    "receivable.canceled",
    "stock.adjustment.negative",
    "user.role.changed",
    "bank.reconciliation.rejected",
  ];

  if (criticalEvents.includes(eventType)) {
    reasons.push(`Evento crítico: ${eventType}`);
    riskLevel = "high";
  }

  // EVENTOS SUSPEITOS (edição após finalização)
  const suspiciousPatterns = [
    { pattern: /\.updated$/, afterStatus: ["completed", "paid", "approved", "finalized"] },
    { pattern: /\.deleted$/, entity: ["sale", "service_order", "payable"] },
  ];

  for (const suspicious of suspiciousPatterns) {
    if (suspicious.pattern.test(eventType)) {
      reasons.push(`Padrão suspeito detectado: ${eventType}`);
      riskLevel = riskLevel === "none" ? "medium" : riskLevel;
    }
  }

  // ANÁLISE DE MARGEM PARA COMPRAS
  if (entityType === "purchase_order" && eventType.includes("approved")) {
    try {
      const { data: purchaseItems } = await supabase
        .from("purchase_order_items")
        .select("product_id, quantity, unit_price")
        .eq("purchase_order_id", entityId);

      if (purchaseItems && purchaseItems.length > 0) {
        for (const item of purchaseItems as any[]) {
          const { data: product } = await supabase
            .from("products")
            .select("cost_price, sale_price, name")
            .eq("id", item.product_id)
            .single();

          if (product && (product as any).cost_price) {
            const prod = product as any;
            const costIncrease = ((item.unit_price - prod.cost_price) / prod.cost_price) * 100;
            
            if (costIncrease > settings.maxCostIncrease) {
              reasons.push(`Custo de ${prod.name} aumentou ${costIncrease.toFixed(1)}%`);
              metrics.costIncrease = costIncrease;
              riskLevel = "high";

              if (prod.sale_price && prod.sale_price > 0) {
                const marginBefore = ((prod.sale_price - prod.cost_price) / prod.sale_price) * 100;
                const marginAfter = ((prod.sale_price - item.unit_price) / prod.sale_price) * 100;
                
                metrics.marginBefore = marginBefore;
                metrics.marginAfter = marginAfter;
                metrics.marginChange = marginAfter - marginBefore;

                if (marginAfter < settings.minMargin) {
                  reasons.push(`Margem cairá para ${marginAfter.toFixed(1)}% (mínimo: ${settings.minMargin}%)`);
                  riskLevel = "critical";
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[Risk Assessment] Erro ao analisar compra:", error);
    }
  }

  // ANÁLISE DE OS COM PREJUÍZO
  if (entityType === "service_order" && (eventType.includes("checkout") || eventType.includes("finalized"))) {
    try {
      const { data: os } = await supabase
        .from("service_orders")
        .select("id, total_amount")
        .eq("id", entityId)
        .single();

      if (os) {
        const osData = os as any;
        
        // Buscar itens de produto separadamente
        const { data: productItems } = await supabase
          .from("service_order_product_items")
          .select("quantity, product_id")
          .eq("service_order_id", entityId);

        let totalCost = 0;
        
        for (const item of (productItems || []) as any[]) {
          const { data: product } = await supabase
            .from("products")
            .select("cost_price")
            .eq("id", item.product_id)
            .single();
          
          if (product && (product as any).cost_price) {
            totalCost += item.quantity * (product as any).cost_price;
          }
        }

        const revenue = osData.total_amount || 0;
        const margin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;

        if (margin < settings.minMargin) {
          reasons.push(`OS com margem de ${margin.toFixed(1)}% (mínimo: ${settings.minMargin}%)`);
          metrics.marginAfter = margin;
          metrics.potentialLoss = totalCost - revenue;
          riskLevel = margin < 0 ? "critical" : "high";
        }
      }
    } catch (error) {
      console.error("[Risk Assessment] Erro ao analisar OS:", error);
    }
  }

  return {
    shouldCallAI: riskLevel !== "none" || reasons.length > 0,
    riskLevel,
    reasons,
    preCalculatedMetrics: metrics,
  };
}

// ============================================
// GERAÇÃO DE HASH PARA DEDUPLICAÇÃO
// ============================================

async function generateAlertHash(
  companyId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  severity: string,
  keyNumbers: string
): Promise<string> {
  const content = `${companyId}|${eventType}|${entityType}|${entityId}|${severity}|${keyNumbers}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

async function isDuplicateAlert(
  supabase: any,
  companyId: string,
  alertHash: string
): Promise<boolean> {
  const { data } = await supabase
    .from("ai_observer_alerts")
    .select("id")
    .eq("company_id", companyId)
    .eq("alert_hash", alertHash)
    .eq("is_dismissed", false)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  return (data?.length || 0) > 0;
}

// ============================================
// CHAMADA À IA
// ============================================

async function callAI(
  apiKey: string,
  useOpenAI: boolean,
  context: string,
  task: string
): Promise<AlertResponse | null> {
  const endpoint = useOpenAI
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";

  const model = useOpenAI ? "gpt-4o-mini" : "google/gemini-2.5-flash";

  const userPrompt = `Contexto real do sistema (JSON):
${context}

Tarefa:
${task}

- Se houver risco econômico/anomalia relevante, gere ALERTA.
- Caso contrário, retorne SEM ALERTA.`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("[WAI Observer] AI API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch {
      console.error("[WAI Observer] JSON parse failed, raw content:", content);
      return null;
    }
  } catch (error) {
    console.error("[WAI Observer] AI call failed:", error);
    return null;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

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
      throw new Error("Nenhuma API key configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const request: WaiObserverRequest = await req.json();

    const companyId = request.payload.company_id;
    if (!companyId) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[WAI Observer] Mode: ${request.mode}, Company: ${companyId}`);

    // Buscar configurações da empresa
    const { data: settings } = await supabase
      .from("ai_settings")
      .select("min_margin_threshold, max_purchase_excess_percent")
      .eq("company_id", companyId)
      .single();

    const minMargin = (settings as any)?.min_margin_threshold || 15;
    const maxCostIncrease = (settings as any)?.max_purchase_excess_percent || 20;

    // ========================================
    // MODE: proactive_event
    // ========================================
    if (request.mode === "proactive_event") {
      const { event_type, entity_type, entity_id, actor_user_id, diff, payload: eventPayload } = request.payload as ProactiveEventPayload;

      // 1. Logar evento em audit_events
      await supabase.from("audit_events").insert({
        company_id: companyId,
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        diff,
        payload: eventPayload,
        source: "app",
      });

      // 2. Motor determinístico
      const risk = await assessRisk(supabase, companyId, event_type, entity_type, entity_id, { minMargin, maxCostIncrease });

      if (!risk.shouldCallAI) {
        console.log("[WAI Observer] Motor determinístico: sem risco, não chama IA");
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: "Sem risco detectado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[WAI Observer] Risco detectado:", risk.reasons);

      // 3. Buscar contexto econômico
      const { data: economicContext } = await supabase.rpc("ai_get_economic_context", {
        p_company_id: companyId,
        p_event_type: event_type,
        p_event_source_id: entity_id,
      });

      // 4. Chamar IA
      const contextWithMetrics = {
        ...economicContext,
        risk_assessment: risk,
        event: { event_type, entity_type, entity_id, diff, payload: eventPayload },
      };

      const aiResponse = await callAI(
        apiKey,
        !!openaiKey,
        JSON.stringify(contextWithMetrics, null, 2),
        `Analisar evento ${event_type} na entidade ${entity_type}. Razões de risco pré-detectadas: ${risk.reasons.join(", ")}`
      );

      if (!aiResponse || aiResponse.no_alert) {
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: aiResponse?.reason || "IA não gerou alerta" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 5. Deduplicação
      const keyNumbers = `${aiResponse.margin_before || 0}|${aiResponse.margin_after || 0}|${aiResponse.potential_loss || 0}`;
      const alertHash = await generateAlertHash(companyId, event_type, entity_type, entity_id, aiResponse.severity || "warning", keyNumbers);

      if (await isDuplicateAlert(supabase, companyId, alertHash)) {
        console.log("[WAI Observer] Alerta duplicado ignorado");
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: "Alerta similar existe nas últimas 24h" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 6. Persistir alerta
      const { data: insertedAlert, error: insertError } = await supabase
        .from("ai_observer_alerts")
        .insert({
          company_id: companyId,
          event_type: aiResponse.event_type || event_type,
          event_source_id: entity_id,
          event_source_type: entity_type,
          severity: aiResponse.severity || "warning",
          mode: "proactive_event",
          economic_reason: aiResponse.economic_reason || risk.reasons.join("; "),
          margin_before: aiResponse.margin_before ?? risk.preCalculatedMetrics.marginBefore,
          margin_after: aiResponse.margin_after ?? risk.preCalculatedMetrics.marginAfter,
          margin_change_percent: aiResponse.margin_change_percent ?? risk.preCalculatedMetrics.marginChange,
          potential_loss: aiResponse.potential_loss ?? risk.preCalculatedMetrics.potentialLoss,
          impacted_entities: aiResponse.impacted_entities || [],
          recommendation: aiResponse.recommendation,
          requires_human_decision: aiResponse.requires_human_decision ?? true,
          alert_hash: alertHash,
          raw_ai_response: aiResponse,
          context_data: contextWithMetrics,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[WAI Observer] Insert error:", insertError);
        throw new Error("Falha ao persistir alerta");
      }

      return new Response(
        JSON.stringify({ success: true, alert_generated: true, alert: insertedAlert }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // MODE: reactive_question
    // ========================================
    if (request.mode === "reactive_question") {
      const { question, screen_context } = request.payload as ReactiveQuestionPayload;

      const { data: economicContext } = await supabase.rpc("ai_get_economic_context", {
        p_company_id: companyId,
        p_event_type: null,
        p_event_source_id: screen_context?.entity_id || null,
      });

      const contextWithScreen = {
        ...economicContext,
        screen_context,
        user_question: question,
      };

      const aiResponse = await callAI(
        apiKey,
        !!openaiKey,
        JSON.stringify(contextWithScreen, null, 2),
        `Responder à pergunta do usuário: "${question}". Se detectar risco econômico real, gerar ALERTA.`
      );

      if (!aiResponse) {
        return new Response(
          JSON.stringify({ success: false, error: "Falha ao processar pergunta" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Se gerou alerta, persistir
      if (!aiResponse.no_alert && aiResponse.economic_reason) {
        const alertHash = await generateAlertHash(
          companyId,
          "reactive_question",
          screen_context?.entity_type || "general",
          screen_context?.entity_id || "none",
          aiResponse.severity || "info",
          `${aiResponse.potential_loss || 0}`
        );

        if (!(await isDuplicateAlert(supabase, companyId, alertHash))) {
          await supabase.from("ai_observer_alerts").insert({
            company_id: companyId,
            event_type: aiResponse.event_type || "user_question",
            event_source_id: screen_context?.entity_id || null,
            event_source_type: screen_context?.entity_type || null,
            severity: aiResponse.severity || "info",
            mode: "reactive_question",
            economic_reason: aiResponse.economic_reason,
            margin_before: aiResponse.margin_before,
            margin_after: aiResponse.margin_after,
            margin_change_percent: aiResponse.margin_change_percent,
            potential_loss: aiResponse.potential_loss,
            impacted_entities: aiResponse.impacted_entities || [],
            recommendation: aiResponse.recommendation,
            requires_human_decision: aiResponse.requires_human_decision ?? false,
            alert_hash: alertHash,
            raw_ai_response: aiResponse,
            context_data: contextWithScreen,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, response: aiResponse }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // MODE: economic_analysis
    // ========================================
    if (request.mode === "economic_analysis") {
      const { data: economicContext } = await supabase.rpc("ai_get_economic_context", {
        p_company_id: companyId,
        p_event_type: "economic_analysis",
        p_event_source_id: null,
      });

      const aiResponse = await callAI(
        apiKey,
        !!openaiKey,
        JSON.stringify(economicContext, null, 2),
        `Realizar varredura econômica completa. Identificar: 1) OS/vendas com margem comprometida, 2) Compras que afetaram custos, 3) Padrões de erosão de margem, 4) Riscos de fluxo de caixa.`
      );

      if (!aiResponse || aiResponse.no_alert) {
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: aiResponse?.reason || "Sem problemas detectados" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const alertHash = await generateAlertHash(
        companyId,
        "economic_analysis",
        "company",
        companyId,
        aiResponse.severity || "warning",
        `${aiResponse.potential_loss || 0}`
      );

      if (!(await isDuplicateAlert(supabase, companyId, alertHash))) {
        const { data: insertedAlert } = await supabase
          .from("ai_observer_alerts")
          .insert({
            company_id: companyId,
            event_type: "economic_analysis",
            event_source_type: "company",
            severity: aiResponse.severity || "warning",
            mode: "economic_analysis",
            economic_reason: aiResponse.economic_reason || "Análise econômica completa",
            margin_before: aiResponse.margin_before,
            margin_after: aiResponse.margin_after,
            margin_change_percent: aiResponse.margin_change_percent,
            potential_loss: aiResponse.potential_loss,
            impacted_entities: aiResponse.impacted_entities || [],
            recommendation: aiResponse.recommendation,
            requires_human_decision: aiResponse.requires_human_decision ?? true,
            alert_hash: alertHash,
            raw_ai_response: aiResponse,
            context_data: economicContext,
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({ success: true, alert_generated: true, alert: insertedAlert }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, alert_generated: false, reason: "Análise similar recente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Mode inválido: ${(request as any).mode}`);

  } catch (error) {
    console.error("[WAI Observer] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
