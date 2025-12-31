import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, category } = await req.json();

    if (!companyId) {
      throw new Error("companyId is required");
    }

    console.log("[analyze-insights] Starting analysis for company:", companyId, "category:", category);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL relevant data
    const today = new Date().toISOString().split('T')[0];
    let contextData: Record<string, any> = {};

    // ========== PRODUTOS E ESTOQUE ==========
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId);

    const { data: stockMovements } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500);

    // ========== FINANCEIRO ==========
    const { data: payables } = await supabase
      .from("payables")
      .select("*, supplier:pessoas(razao_social, nome_fantasia)")
      .eq("company_id", companyId);

    const { data: receivables } = await supabase
      .from("accounts_receivable")
      .select("*, client:clientes(razao_social, nome_fantasia)")
      .eq("company_id", companyId);

    const { data: bankAccounts } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true);

    // ========== VENDAS ==========
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("*, product:products(code, description)")
      .eq("company_id", companyId)
      .limit(500);

    // ========== COMPRAS ==========
    const { data: purchaseOrders } = await supabase
      .from("purchase_orders")
      .select("*, supplier:pessoas(razao_social)")
      .eq("company_id", companyId);

    // ========== BUILD ANALYSIS CONTEXT ==========
    const activeProducts = products?.filter(p => p.is_active) || [];
    const negativeStock = activeProducts.filter(p => (p.current_stock || 0) < 0);
    const lowStock = activeProducts.filter(p => p.min_stock && (p.current_stock || 0) <= p.min_stock && (p.current_stock || 0) >= 0);
    const overStock = activeProducts.filter(p => p.max_stock && (p.current_stock || 0) > p.max_stock);
    const negativeMargin = activeProducts.filter(p => p.cost_price && p.sale_price && p.sale_price < p.cost_price);
    
    // Produtos sem giro (90 dias)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentMovementProductIds = new Set(
      (stockMovements || [])
        .filter(m => new Date(m.created_at) >= ninetyDaysAgo)
        .map(m => m.product_id)
    );
    const stagnantProducts = activeProducts.filter(p => 
      !recentMovementProductIds.has(p.id) && (p.current_stock || 0) > 0
    );

    // Financeiro
    const overduePayables = payables?.filter(p => !p.is_paid && p.due_date < today) || [];
    const overdueReceivables = receivables?.filter(r => !r.is_paid && r.due_date < today) || [];
    const totalBankBalance = bankAccounts?.reduce((sum, ba) => sum + Number(ba.current_balance || 0), 0) || 0;

    // Vendas - análise de tendência
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentSales = sales?.filter(s => new Date(s.created_at) >= last30Days) || [];
    
    const contextSummary = `
## ANÁLISE DA EMPRESA (${today})

### ESTOQUE E PRODUTOS
- Total de produtos ativos: ${activeProducts.length}
- Produtos com estoque negativo: ${negativeStock.length}
- Produtos abaixo do mínimo: ${lowStock.length}
- Produtos acima do máximo (excesso): ${overStock.length}
- Produtos com margem negativa: ${negativeMargin.length}
- Produtos sem giro (90 dias): ${stagnantProducts.length}

Detalhes estoque negativo:
${negativeStock.slice(0, 10).map(p => `- ${p.code || 'S/C'} ${p.description}: ${p.current_stock} unidades`).join('\n')}

Detalhes estoque baixo:
${lowStock.slice(0, 10).map(p => `- ${p.code || 'S/C'} ${p.description}: ${p.current_stock}/${p.min_stock} (mín)`).join('\n')}

Produtos com margem negativa:
${negativeMargin.slice(0, 10).map(p => `- ${p.code || 'S/C'} ${p.description}: custo R$${p.cost_price?.toFixed(2)} > venda R$${p.sale_price?.toFixed(2)}`).join('\n')}

### FINANCEIRO
- Saldo bancário total: R$ ${totalBankBalance.toFixed(2)}
- Contas a pagar vencidas: ${overduePayables.length} (R$ ${overduePayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)})
- Contas a receber vencidas: ${overdueReceivables.length} (R$ ${overdueReceivables.reduce((s, r) => s + Number(r.amount), 0).toFixed(2)})
- Total a pagar pendente: ${payables?.filter(p => !p.is_paid).length || 0} títulos
- Total a receber pendente: ${receivables?.filter(r => !r.is_paid).length || 0} títulos

### VENDAS (últimos 30 dias)
- Total de vendas: ${recentSales.length}
- Valor total: R$ ${recentSales.reduce((s, v) => s + Number(v.total_value || 0), 0).toFixed(2)}

### COMPRAS
- Pedidos de compra em aberto: ${purchaseOrders?.filter(po => po.status !== 'recebido' && po.status !== 'cancelado').length || 0}
`;

    // Use Lovable AI to generate insights
    if (!LOVABLE_API_KEY) {
      console.log("[analyze-insights] No LOVABLE_API_KEY, generating basic insights");
      // Fallback: generate basic insights without AI
      const insights: any[] = [];

      if (negativeStock.length > 0) {
        insights.push({
          type: "critical",
          category: "stock",
          mode: "auditora",
          title: "🚨 Estoque Negativo Detectado",
          message: `${negativeStock.length} produto(s) com estoque negativo precisam de ajuste imediato.`,
          action_label: "Ajustar Estoque",
          action_url: "/ajustes",
          priority: 10,
        });
      }

      if (lowStock.length > 0) {
        insights.push({
          type: "warning",
          category: "stock",
          mode: "especialista",
          title: "⚠️ Reposição Necessária",
          message: `${lowStock.length} produto(s) abaixo do estoque mínimo. Gere um pedido de compra.`,
          action_label: "Gerar Pedido",
          action_url: "/solicitacoes",
          priority: 7,
        });
      }

      if (overduePayables.length > 0) {
        insights.push({
          type: "critical",
          category: "financial",
          mode: "cfo_bot",
          title: "🚨 Contas Vencidas",
          message: `${overduePayables.length} conta(s) a pagar vencida(s) totalizando R$ ${overduePayables.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}.`,
          action_label: "Ver Contas",
          action_url: "/contas-pagar",
          priority: 9,
        });
      }

      // Insert insights
      for (const insight of insights) {
        await supabase.from("ai_insights").insert({
          ...insight,
          company_id: companyId,
        });
      }

      return new Response(
        JSON.stringify({ success: true, insightsGenerated: insights.length, method: "basic" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar foco baseado na categoria solicitada
    const categoryFocus = category ? `FOCO PRINCIPAL: Gere insights apenas sobre "${category}". ` : '';
    const categoryRule = category 
      ? `- OBRIGATÓRIO: Todos os insights devem ter category: "${category}"`
      : '- Distribua entre as categorias relevantes';

    // Use Lovable AI for smarter analysis
    const aiPrompt = `Com base nos dados abaixo, gere de 3 a 5 insights ACIONÁVEIS para a empresa. 
${categoryFocus}
Cada insight deve ter:
- type: "critical" | "warning" | "info" | "success"
- category: "${category || 'stock" | "financial" | "sales" | "purchases'}"
- mode: "auditora" | "cfo_bot" | "especialista" | "executora"
- title: título curto e direto (máx 50 caracteres)
- message: mensagem explicativa com dados concretos (máx 200 caracteres)
- action_label: texto do botão de ação (máx 20 caracteres)
- action_url: uma das URLs: /ajustes, /solicitacoes, /contas-pagar, /contas-receber, /saldo-estoque, /vendas, /produtos
- priority: 1-10 (10 = mais urgente)

REGRAS:
${categoryRule}
- Priorize problemas CRÍTICOS primeiro
- Seja ESPECÍFICO com números reais dos dados
- Sugira AÇÕES concretas
- Se não houver problemas, gere insights de sucesso ou oportunidades

${contextSummary}

Responda APENAS com um JSON array de insights, sem markdown:`;

    console.log("[analyze-insights] Calling Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista de negócios especializado em ERP. Responda APENAS com JSON válido, sem markdown." },
          { role: "user", content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[analyze-insights] AI error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "[]";
    
    console.log("[analyze-insights] AI response:", aiContent.substring(0, 500));

    // Parse AI response
    let generatedInsights: any[] = [];
    try {
      // Clean the response (remove markdown if present)
      let cleanJson = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedInsights = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("[analyze-insights] Failed to parse AI response:", parseError);
      generatedInsights = [];
    }

    // Validate and insert insights
    let insertedCount = 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (const insight of generatedInsights) {
      // Validate required fields
      if (!insight.type || !insight.category || !insight.mode || !insight.title || !insight.message) {
        continue;
      }

      // Check for recent duplicates
      const { data: existing } = await supabase
        .from("ai_insights")
        .select("id")
        .eq("company_id", companyId)
        .eq("title", insight.title)
        .eq("is_dismissed", false)
        .gte("created_at", yesterday.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        continue;
      }

      const { error: insertError } = await supabase
        .from("ai_insights")
        .insert({
          company_id: companyId,
          type: insight.type,
          category: insight.category,
          mode: insight.mode,
          title: insight.title,
          message: insight.message,
          action_label: insight.action_label,
          action_url: insight.action_url,
          priority: insight.priority || 5,
        });

      if (!insertError) {
        insertedCount++;
      }
    }

    console.log("[analyze-insights] Completed. Generated:", generatedInsights.length, "Inserted:", insertedCount);

    return new Response(
      JSON.stringify({
        success: true,
        insightsGenerated: generatedInsights.length,
        insightsInserted: insertedCount,
        method: "ai",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[analyze-insights] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
