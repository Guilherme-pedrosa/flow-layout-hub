import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * WAI OBSERVER AI - Agente Econômico Onipresente v2.0
 * 
 * REGRA DE OURO: Logs sempre / IA só quando necessário / Silêncio é maturidade
 * 
 * 7 Camadas Implementadas:
 * 1. Prioridade Econômica Global (economic_priority_score)
 * 2. Memória Econômica (ai_economic_memory)
 * 3. Cadeia de Causalidade (root_cause, downstream_entities, projected_loss_30d)
 * 4. Alertas com Contexto de Decisão (decision_options)
 * 5. Diferenciação alert/insight/observation
 * 6. Silêncio Inteligente (ai_silence_rules)
 * 7. Explicação Econômica Padrão (formato didático)
 */

const SYSTEM_PROMPT = `VOCÊ É O WAI OBSERVER AI.

Sua função NÃO é conversar.
Sua função NÃO é explicar o óbvio.
Sua função NÃO é gerar insights genéricos.

Você é um radar econômico silencioso, frio e matemático, integrado ao ERP, responsável por detectar prejuízos reais ANTES que eles virem rotina.

────────────────────────────────────────
1. PRINCÍPIO ABSOLUTO
────────────────────────────────────────

Se não dói no caixa, NÃO FALE.
Se dói pouco, SEJA SILENCIOSO.
Se dói muito, SEJA CURTO, CLARO E MATEMÁTICO.

Nunca gere alerta sem impacto econômico mensurável.

────────────────────────────────────────
2. O QUE VOCÊ OBSERVA (SEMPRE)
────────────────────────────────────────

Analise continuamente:

Compras com custo maior que:
- histórico
- custo médio
- custo considerado na OS ou venda

Ordens de Serviço com:
- margem negativa
- margem abaixo do mínimo definido
- km + hora técnica + imposto > margem gerada

Vendas com preço desatualizado em relação ao custo atual

Estoque com:
- custo crescente
- giro baixo
- capital parado improdutivo

Recorrência de problemas por:
- produto
- cliente
- fornecedor
- tipo de serviço

────────────────────────────────────────
3. GOVERNANÇA ANTI-RUÍDO (OBRIGATÓRIA)
────────────────────────────────────────

Antes de alertar, verifique:

- Alertas duplicados recentes (hash + cooldown)
- Regras de silêncio da empresa
- Feedback humano anterior:
  - dismissed = reduzir sensibilidade
  - ignored = reduzir prioridade
  - actioned = reforçar padrão
  - escalated = aumentar peso e severidade

Feedback humano SEMPRE vence o modelo.

────────────────────────────────────────
4. PRIORIZAÇÃO EXECUTIVA
────────────────────────────────────────

Classifique TODO risco usando impacto econômico real:

- Score >= 80 OU decisão humana obrigatória = strategic_risk
- Score >= 60 OU severidade crítica = economic_risk
- Score >= 30 = tactical_attention
- Score < 30 = NÃO EXIBIR

Nunca exiba mais que 7 alertas ativos.

────────────────────────────────────────
5. FORMATO DE RESPOSTA (ANTI-CHATBOT)
────────────────────────────────────────

Responda SEMPRE e EXCLUSIVAMENTE em JSON.

SE houver risco econômico:

{
  "event_type": "string",
  "severity": "info|warning|critical",
  "priority_level": "strategic_risk|economic_risk|tactical_attention",
  "alert_category": "alert|insight|observation",
  "economic_reason": "Descrição objetiva do problema",
  "root_cause": "Causa raiz econômica",
  "calculation": {
    "cost": 0.00,
    "margin_before": 0.00,
    "margin_after": 0.00,
    "margin_change_percent": 0.00,
    "potential_loss": 0.00
  },
  "projected_loss_30d": 0.00,
  "impacted_entities": [{"type": "string", "id": "uuid", "description": "string"}],
  "downstream_entities": [{"type": "string", "id": "uuid", "description": "string", "projected_impact": "string"}],
  "recommendation": "Ação objetiva, executável e econômica",
  "consequence_if_ignored": "Consequência financeira direta",
  "decision_options": [{"label": "Opção", "risk_level": "low|medium|high", "economic_effect": "descrição"}],
  "requires_human_decision": true
}

SE NÃO houver impacto econômico relevante:

{"no_alert": true, "reason": "Nenhum impacto econômico relevante identificado"}

────────────────────────────────────────
6. TOM E COMPORTAMENTO
────────────────────────────────────────

- Profissional
- Executivo
- Frio
- Matemático
- Sem emojis em alertas
- Sem storytelling
- Sem sugestões vagas
- Sem motivacional
- Sem opinião pessoal

────────────────────────────────────────
7. FRASE GUIA (NÃO QUEBRAR)
────────────────────────────────────────

"O WAI Observer AI não existe para avisar erros. Ele existe para impedir prejuízos antes que virem rotina."

────────────────────────────────────────
8. MÉTRICA DE SUCESSO
────────────────────────────────────────

Seu sucesso é medido por:

- Menos ruído
- Menos surpresas financeiras
- Margem protegida
- Decisões melhores
- Prejuízo eliminado antes de escalar`;

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
    projectedLoss30d?: number;
  };
  rootCause?: string;
  downstreamEntities?: Array<{ type: string; id: string; description: string; projected_impact: string }>;
}

interface AlertResponse {
  no_alert?: boolean;
  reason?: string;
  event_type?: string;
  severity?: "info" | "warning" | "critical";
  alert_category?: "alert" | "insight" | "observation";
  economic_reason?: string;
  root_cause?: string;
  downstream_entities?: Array<{ type: string; id: string; description: string; projected_impact: string }>;
  projected_loss_30d?: number;
  impacted_entities?: Array<{ type: string; id: string; description: string }>;
  margin_before?: number;
  margin_after?: number;
  margin_change_percent?: number;
  potential_loss?: number;
  recommendation?: string;
  consequence_if_ignored?: string;
  decision_options?: Array<{ label: string; risk_level: string; economic_effect: string }>;
  requires_human_decision?: boolean;
}

interface EntityMemory {
  total_alerts: number;
  critical_alerts: number;
  total_potential_loss: number;
  last_alert_types: string[];
}

// ============================================
// SILÊNCIO INTELIGENTE
// ============================================

async function shouldSilenceAlert(
  supabase: any,
  companyId: string,
  eventType: string,
  alertHash: string,
  marginChange: number
): Promise<{ silence: boolean; reason?: string; shouldEscalate?: boolean; escalationReason?: string }> {
  // 1. Usar função SQL anti-duplicata com escalonamento
  const { data: duplicateCheck } = await supabase.rpc("ai_check_duplicate_alert", {
    p_company_id: companyId,
    p_alert_hash: alertHash,
    p_event_type: eventType,
    p_hours_cooldown: 24,
  });

  if (duplicateCheck && duplicateCheck.length > 0) {
    const check = duplicateCheck[0];
    if (check.is_duplicate) {
      // Se deve escalar, não silenciar - apenas sinalizar
      if (check.should_escalate) {
        return { 
          silence: false, 
          shouldEscalate: true, 
          escalationReason: check.escalation_reason 
        };
      }
      return { silence: true, reason: "Alerta similar existe nas últimas 24h" };
    }
  }

  // 2. Verificar regras de silêncio personalizadas
  const { data: silenceRules } = await supabase
    .from("ai_silence_rules")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (silenceRules) {
    for (const rule of silenceRules as any[]) {
      // Cooldown por tipo de evento
      if (rule.rule_type === "cooldown" && (rule.event_type === null || rule.event_type === eventType)) {
        const { data: recentSimilar } = await supabase
          .from("ai_observer_alerts")
          .select("id")
          .eq("company_id", companyId)
          .eq("event_type", eventType)
          .gte("created_at", new Date(Date.now() - (rule.cooldown_hours || 24) * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentSimilar && recentSimilar.length > 0) {
          return { silence: true, reason: `Cooldown: alerta ${eventType} recente (${rule.cooldown_hours}h)` };
        }
      }

      // Threshold de margem mínima
      if (rule.rule_type === "threshold" && rule.min_margin_change) {
        if (Math.abs(marginChange) < rule.min_margin_change) {
          return { silence: true, reason: `Variação de margem (${marginChange.toFixed(1)}%) abaixo do threshold (${rule.min_margin_change}%)` };
        }
      }

      // Decisão já tomada recentemente
      if (rule.rule_type === "decision_based") {
        const { data: recentDecision } = await supabase
          .from("ai_decision_log")
          .select("id")
          .eq("company_id", companyId)
          .eq("decision_type", eventType)
          .gte("decided_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentDecision && recentDecision.length > 0) {
          return { silence: true, reason: "Decisão já tomada para evento similar nos últimos 7 dias" };
        }
      }
    }
  }

  return { silence: false };
}

// ============================================
// MEMÓRIA ECONÔMICA
// ============================================

async function getEntityMemory(
  supabase: any,
  companyId: string,
  entityType: string,
  entityId: string
): Promise<EntityMemory | null> {
  const { data } = await supabase
    .from("ai_economic_memory")
    .select("total_alerts, critical_alerts, total_potential_loss, last_alert_types")
    .eq("company_id", companyId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  return data as EntityMemory | null;
}

async function getRecurrenceWarning(
  supabase: any,
  companyId: string,
  entityType: string,
  entityId: string
): Promise<string | null> {
  const memory = await getEntityMemory(supabase, companyId, entityType, entityId);
  
  if (!memory) return null;

  if (memory.critical_alerts >= 3) {
    return `⚠️ ATENÇÃO: Esta entidade já causou ${memory.critical_alerts} alertas críticos (perda acumulada: R$ ${memory.total_potential_loss.toFixed(2)})`;
  }

  if (memory.total_alerts >= 5) {
    return `Esta entidade tem histórico de ${memory.total_alerts} alertas nos últimos 60 dias`;
  }

  return null;
}

// ============================================
// MOTOR DETERMINÍSTICO DE RISCO (Aprimorado)
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
  let rootCause: string | undefined;
  const downstreamEntities: Array<{ type: string; id: string; description: string; projected_impact: string }> = [];

  // Verificar memória histórica
  const recurrenceWarning = await getRecurrenceWarning(supabase, companyId, entityType, entityId);
  if (recurrenceWarning) {
    reasons.push(recurrenceWarning);
    riskLevel = "medium";
  }

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
    rootCause = `Evento de alto impacto detectado: ${eventType}`;
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
            .select("id, code, cost_price, sale_price, name")
            .eq("id", item.product_id)
            .single();

          if (product && (product as any).cost_price) {
            const prod = product as any;
            const costIncrease = ((item.unit_price - prod.cost_price) / prod.cost_price) * 100;
            
            if (costIncrease > settings.maxCostIncrease) {
              reasons.push(`Custo de ${prod.name} aumentou ${costIncrease.toFixed(1)}%`);
              metrics.costIncrease = costIncrease;
              riskLevel = "high";
              rootCause = `Compra com custo ${costIncrease.toFixed(1)}% acima do custo atual`;

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

                // Buscar OS abertas que usam este produto
                const { data: osItems } = await supabase
                  .from("service_order_product_items")
                  .select("service_order_id, quantity, service_orders!inner(id, order_number, status_id)")
                  .eq("product_id", prod.id);

                if (osItems) {
                  for (const osItem of osItems as any[]) {
                    const impactValue = osItem.quantity * (item.unit_price - prod.cost_price);
                    downstreamEntities.push({
                      type: "service_order",
                      id: osItem.service_order_id,
                      description: `OS #${osItem.service_orders?.order_number || 'N/A'}`,
                      projected_impact: `Custo adicional: R$ ${impactValue.toFixed(2)}`
                    });
                  }
                  
                  metrics.projectedLoss30d = downstreamEntities.reduce((acc, e) => {
                    const match = e.projected_impact.match(/R\$ ([\d.,]+)/);
                    return acc + (match ? parseFloat(match[1].replace(',', '.')) : 0);
                  }, 0);
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
        .select("id, order_number, total_amount, client_id")
        .eq("id", entityId)
        .single();

      if (os) {
        const osData = os as any;
        
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
          metrics.potentialLoss = Math.max(0, totalCost - revenue);
          riskLevel = margin < 0 ? "critical" : "high";
          rootCause = margin < 0 
            ? `OS #${osData.order_number} com prejuízo de R$ ${metrics.potentialLoss.toFixed(2)}`
            : `OS #${osData.order_number} com margem abaixo do mínimo`;
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
    rootCause,
    downstreamEntities: downstreamEntities.length > 0 ? downstreamEntities : undefined,
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

// ============================================
// DETERMINAR CATEGORIA DO ALERTA
// ============================================

function determineAlertCategory(
  severity: string,
  potentialLoss: number | undefined,
  marginChange: number | undefined
): "alert" | "insight" | "observation" {
  // Alert: risco real de perda
  if (severity === "critical" || (potentialLoss && potentialLoss > 100)) {
    return "alert";
  }
  
  // Insight: oportunidade de otimização
  if (marginChange && marginChange < -5 && marginChange > -15) {
    return "insight";
  }
  
  // Observation: informação contextual
  if (severity === "info" || !potentialLoss) {
    return "observation";
  }
  
  return "alert";
}

// ============================================
// GERAR OPÇÕES DE DECISÃO
// ============================================

function generateDecisionOptions(
  eventType: string,
  severity: string,
  rootCause?: string
): Array<{ label: string; risk_level: string; economic_effect: string }> {
  const options: Array<{ label: string; risk_level: string; economic_effect: string }> = [];

  if (eventType.includes("purchase") && rootCause?.includes("custo")) {
    options.push(
      { label: "Renegociar com fornecedor", risk_level: "low", economic_effect: "Potencial redução de 10-20% no custo" },
      { label: "Buscar fornecedor alternativo", risk_level: "medium", economic_effect: "Pode encontrar preço melhor, risco de qualidade" },
      { label: "Reprecificar produtos afetados", risk_level: "low", economic_effect: "Mantém margem, pode afetar competitividade" },
      { label: "Aceitar aumento pontual", risk_level: "high", economic_effect: "Margem reduzida, impacto no resultado" }
    );
  } else if (eventType.includes("service_order") || eventType.includes("os")) {
    options.push(
      { label: "Renegociar valor com cliente", risk_level: "medium", economic_effect: "Recupera margem, risco de perder cliente" },
      { label: "Ajustar escopo do serviço", risk_level: "low", economic_effect: "Reduz custo mantendo entrega" },
      { label: "Registrar como exceção", risk_level: "high", economic_effect: "Prejuízo absorvido, afeta resultado" }
    );
  } else if (severity === "critical") {
    options.push(
      { label: "Ação corretiva imediata", risk_level: "low", economic_effect: "Minimiza impacto financeiro" },
      { label: "Escalar para gestão", risk_level: "medium", economic_effect: "Decisão será tomada por nível superior" },
      { label: "Monitorar por 24h", risk_level: "high", economic_effect: "Risco de agravamento do problema" }
    );
  }

  return options;
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

  const model = useOpenAI ? "gpt-4.1-mini-2025-04-14" : "google/gemini-2.5-flash";

  const userPrompt = `Contexto real do sistema (JSON):
${context}

Tarefa:
${task}

LEMBRE-SE:
1. O que aconteceu
2. Por que isso é um problema
3. Quanto custa (R$)
4. O que fazer agora
5. O que acontece se ignorar

Se houver risco econômico/anomalia relevante → ALERTA com decision_options
Caso contrário → SEM ALERTA`;

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
        max_tokens: 1200,
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

    console.log(`[WAI Observer v2] Mode: ${request.mode}, Company: ${companyId}`);

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

      // 2. Motor determinístico com memória
      const risk = await assessRisk(supabase, companyId, event_type, entity_type, entity_id, { minMargin, maxCostIncrease });

      if (!risk.shouldCallAI) {
        console.log("[WAI Observer] Motor determinístico: sem risco, não chama IA");
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: "Sem risco detectado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[WAI Observer] Risco detectado:", risk.reasons);

      // 3. Gerar hash para verificação de silêncio
      const keyNumbers = `${risk.preCalculatedMetrics.marginBefore || 0}|${risk.preCalculatedMetrics.marginAfter || 0}|${risk.preCalculatedMetrics.potentialLoss || 0}`;
      const alertHash = await generateAlertHash(companyId, event_type, entity_type, entity_id, risk.riskLevel, keyNumbers);

      // 4. Verificar silêncio inteligente
      const silenceCheck = await shouldSilenceAlert(
        supabase,
        companyId,
        event_type,
        alertHash,
        risk.preCalculatedMetrics.marginChange || 0
      );

      if (silenceCheck.silence) {
        console.log("[WAI Observer] Silêncio inteligente:", silenceCheck.reason);
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: silenceCheck.reason }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 5. Buscar contexto econômico
      const { data: economicContext } = await supabase.rpc("ai_get_economic_context", {
        p_company_id: companyId,
        p_event_type: event_type,
        p_event_source_id: entity_id,
      });

      // 6. Enriquecer contexto com memória histórica
      const entityMemory = await getEntityMemory(supabase, companyId, entity_type, entity_id);

      const contextWithMetrics = {
        ...economicContext,
        risk_assessment: risk,
        entity_memory: entityMemory,
        event: { event_type, entity_type, entity_id, diff, payload: eventPayload },
      };

      // 7. Chamar IA
      const aiResponse = await callAI(
        apiKey,
        !!openaiKey,
        JSON.stringify(contextWithMetrics, null, 2),
        `Analisar evento ${event_type} na entidade ${entity_type}. 
Razões de risco pré-detectadas: ${risk.reasons.join(", ")}
${entityMemory ? `Histórico da entidade: ${entityMemory.total_alerts} alertas anteriores, R$ ${entityMemory.total_potential_loss} em perdas potenciais.` : ""}`
      );

      if (!aiResponse || aiResponse.no_alert) {
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: aiResponse?.reason || "IA não gerou alerta" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 8. Determinar categoria e gerar opções de decisão
      const alertCategory = aiResponse.alert_category || determineAlertCategory(
        aiResponse.severity || "warning",
        aiResponse.potential_loss,
        aiResponse.margin_change_percent
      );

      const decisionOptions = aiResponse.decision_options?.length 
        ? aiResponse.decision_options 
        : generateDecisionOptions(event_type, aiResponse.severity || "warning", risk.rootCause);

      // 9. Persistir alerta com novos campos
      const { data: insertedAlert, error: insertError } = await supabase
        .from("ai_observer_alerts")
        .insert({
          company_id: companyId,
          event_type: aiResponse.event_type || event_type,
          event_source_id: entity_id,
          event_source_type: entity_type,
          severity: aiResponse.severity || "warning",
          alert_category: alertCategory,
          mode: "proactive_event",
          economic_reason: aiResponse.economic_reason || risk.reasons.join("; "),
          root_cause: aiResponse.root_cause || risk.rootCause,
          downstream_entities: aiResponse.downstream_entities || risk.downstreamEntities || [],
          projected_loss_30d: aiResponse.projected_loss_30d ?? risk.preCalculatedMetrics.projectedLoss30d ?? 0,
          margin_before: aiResponse.margin_before ?? risk.preCalculatedMetrics.marginBefore,
          margin_after: aiResponse.margin_after ?? risk.preCalculatedMetrics.marginAfter,
          margin_change_percent: aiResponse.margin_change_percent ?? risk.preCalculatedMetrics.marginChange,
          potential_loss: aiResponse.potential_loss ?? risk.preCalculatedMetrics.potentialLoss,
          impacted_entities: aiResponse.impacted_entities || [],
          recommendation: aiResponse.recommendation,
          decision_options: decisionOptions,
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

      // Buscar memória se houver entidade no contexto
      let entityMemory = null;
      if (screen_context?.entity_type && screen_context?.entity_id) {
        entityMemory = await getEntityMemory(supabase, companyId, screen_context.entity_type, screen_context.entity_id);
      }

      const contextWithScreen = {
        ...economicContext,
        screen_context,
        entity_memory: entityMemory,
        user_question: question,
      };

      const aiResponse = await callAI(
        apiKey,
        !!openaiKey,
        JSON.stringify(contextWithScreen, null, 2),
        `Responder à pergunta do usuário: "${question}". 
Se detectar risco econômico real, gerar ALERTA com decision_options.
${entityMemory ? `Histórico da entidade: ${entityMemory.total_alerts} alertas anteriores.` : ""}`
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

        const silenceCheck = await shouldSilenceAlert(supabase, companyId, "reactive_question", alertHash, 0);

        if (!silenceCheck.silence) {
          const alertCategory = aiResponse.alert_category || determineAlertCategory(
            aiResponse.severity || "info",
            aiResponse.potential_loss,
            aiResponse.margin_change_percent
          );

          await supabase.from("ai_observer_alerts").insert({
            company_id: companyId,
            event_type: aiResponse.event_type || "user_question",
            event_source_id: screen_context?.entity_id || null,
            event_source_type: screen_context?.entity_type || null,
            severity: aiResponse.severity || "info",
            alert_category: alertCategory,
            mode: "reactive_question",
            economic_reason: aiResponse.economic_reason,
            root_cause: aiResponse.root_cause,
            downstream_entities: aiResponse.downstream_entities || [],
            projected_loss_30d: aiResponse.projected_loss_30d ?? 0,
            margin_before: aiResponse.margin_before,
            margin_after: aiResponse.margin_after,
            margin_change_percent: aiResponse.margin_change_percent,
            potential_loss: aiResponse.potential_loss,
            impacted_entities: aiResponse.impacted_entities || [],
            recommendation: aiResponse.recommendation,
            decision_options: aiResponse.decision_options || [],
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

      // Buscar entidades com mais alertas (top problemáticas)
      const { data: topProblemEntities } = await supabase
        .from("ai_economic_memory")
        .select("entity_type, entity_name, total_alerts, critical_alerts, total_potential_loss")
        .eq("company_id", companyId)
        .order("total_potential_loss", { ascending: false })
        .limit(10);

      const enrichedContext = {
        ...economicContext,
        top_problem_entities: topProblemEntities || [],
      };

      const aiResponse = await callAI(
        apiKey,
        !!openaiKey,
        JSON.stringify(enrichedContext, null, 2),
        `Realizar varredura econômica completa. 
Identificar:
1) OS/vendas com margem comprometida
2) Compras que afetaram custos
3) Padrões de erosão de margem
4) Riscos de fluxo de caixa
5) Entidades problemáticas recorrentes

INCLUIR decision_options para cada problema crítico encontrado.`
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

      const silenceCheck = await shouldSilenceAlert(supabase, companyId, "economic_analysis", alertHash, 0);

      if (silenceCheck.silence) {
        return new Response(
          JSON.stringify({ success: true, alert_generated: false, reason: silenceCheck.reason }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const alertCategory = aiResponse.alert_category || determineAlertCategory(
        aiResponse.severity || "warning",
        aiResponse.potential_loss,
        aiResponse.margin_change_percent
      );

      const { data: insertedAlert } = await supabase
        .from("ai_observer_alerts")
        .insert({
          company_id: companyId,
          event_type: "economic_analysis",
          event_source_type: "company",
          severity: aiResponse.severity || "warning",
          alert_category: alertCategory,
          mode: "economic_analysis",
          economic_reason: aiResponse.economic_reason || "Análise econômica completa",
          root_cause: aiResponse.root_cause,
          downstream_entities: aiResponse.downstream_entities || [],
          projected_loss_30d: aiResponse.projected_loss_30d ?? 0,
          margin_before: aiResponse.margin_before,
          margin_after: aiResponse.margin_after,
          margin_change_percent: aiResponse.margin_change_percent,
          potential_loss: aiResponse.potential_loss,
          impacted_entities: aiResponse.impacted_entities || [],
          recommendation: aiResponse.recommendation,
          decision_options: aiResponse.decision_options || [],
          requires_human_decision: aiResponse.requires_human_decision ?? true,
          alert_hash: alertHash,
          raw_ai_response: aiResponse,
          context_data: enrichedContext,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ success: true, alert_generated: true, alert: insertedAlert }),
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
