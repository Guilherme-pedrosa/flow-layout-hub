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
    
    // Produtos sem custo cadastrado
    const noCostProducts = activeProducts.filter(p => !p.cost_price || p.cost_price <= 0);
    
    // Produtos sem preço de venda
    const noSalePriceProducts = activeProducts.filter(p => !p.sale_price || p.sale_price <= 0);
    
    // Análise de margem
    const productsWithMargin = activeProducts.filter(p => p.cost_price && p.sale_price && p.cost_price > 0);
    const avgMarginPercent = productsWithMargin.length > 0
      ? productsWithMargin.reduce((sum, p) => {
          const margin = ((p.sale_price - p.cost_price) / p.cost_price) * 100;
          return sum + margin;
        }, 0) / productsWithMargin.length
      : 0;
    
    // Produtos com margem muito baixa (< 10%)
    const lowMarginProducts = productsWithMargin.filter(p => {
      const margin = ((p.sale_price - p.cost_price) / p.cost_price) * 100;
      return margin < 10 && margin >= 0;
    });
    
    // Produtos com margem muito alta (> 100%)
    const highMarginProducts = productsWithMargin.filter(p => {
      const margin = ((p.sale_price - p.cost_price) / p.cost_price) * 100;
      return margin > 100;
    });
    
    // Custo médio do estoque
    const totalStockValue = activeProducts.reduce((sum, p) => {
      return sum + ((p.current_stock || 0) * (p.cost_price || 0));
    }, 0);
    
    // Valor de venda potencial do estoque
    const totalStockSaleValue = activeProducts.reduce((sum, p) => {
      return sum + ((p.current_stock || 0) * (p.sale_price || 0));
    }, 0);
    
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
    
    // Valor empatado em produtos sem giro
    const stagnantValue = stagnantProducts.reduce((sum, p) => {
      return sum + ((p.current_stock || 0) * (p.cost_price || 0));
    }, 0);
    
    // Curva ABC por valor de estoque
    const productsByValue = activeProducts
      .map(p => ({
        ...p,
        stockValue: (p.current_stock || 0) * (p.cost_price || 0)
      }))
      .filter(p => p.stockValue > 0)
      .sort((a, b) => b.stockValue - a.stockValue);
    
    const totalValue = productsByValue.reduce((sum, p) => sum + p.stockValue, 0);
    let accumulatedValue = 0;
    const curveA: typeof productsByValue = [];
    const curveB: typeof productsByValue = [];
    const curveC: typeof productsByValue = [];
    
    for (const p of productsByValue) {
      accumulatedValue += p.stockValue;
      const percent = (accumulatedValue / totalValue) * 100;
      if (percent <= 80) curveA.push(p);
      else if (percent <= 95) curveB.push(p);
      else curveC.push(p);
    }
    
    // Análise de movimentação (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMovements = stockMovements?.filter(m => new Date(m.created_at) >= thirtyDaysAgo) || [];
    const entriesCount = recentMovements.filter(m => m.quantity > 0).length;
    const exitsCount = recentMovements.filter(m => m.quantity < 0).length;
    
    // Histórico de variação de custo (produtos com custo zerado mas com movimentação)
    const productsNeedingCostUpdate = activeProducts.filter(p => {
      const hasMovement = recentMovementProductIds.has(p.id);
      const noCost = !p.cost_price || p.cost_price <= 0;
      return hasMovement && noCost;
    });

    // Financeiro
    const overduePayables = payables?.filter(p => !p.is_paid && p.due_date < today) || [];
    const overdueReceivables = receivables?.filter(r => !r.is_paid && r.due_date < today) || [];
    const totalBankBalance = bankAccounts?.reduce((sum, ba) => sum + Number(ba.current_balance || 0), 0) || 0;

    // Vendas - análise de tendência
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentSales = sales?.filter(s => new Date(s.created_at) >= last30Days) || [];
    
    // Top produtos vendidos
    const productSalesCount: Record<string, { count: number; value: number; product: any }> = {};
    for (const item of saleItems || []) {
      if (!productSalesCount[item.product_id]) {
        productSalesCount[item.product_id] = { count: 0, value: 0, product: item.product };
      }
      productSalesCount[item.product_id].count += item.quantity || 0;
      productSalesCount[item.product_id].value += (item.quantity || 0) * (item.unit_price || 0);
    }
    const topSellingProducts = Object.values(productSalesCount)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    const contextSummary = `
## ANÁLISE DA EMPRESA (${today})

### ESTOQUE E PRODUTOS - VISÃO GERAL
- Total de produtos ativos: ${activeProducts.length}
- Valor total em estoque (custo): R$ ${totalStockValue.toFixed(2)}
- Valor potencial de venda: R$ ${totalStockSaleValue.toFixed(2)}
- Margem média dos produtos: ${avgMarginPercent.toFixed(1)}%

### PROBLEMAS DE ESTOQUE
- Produtos com estoque negativo: ${negativeStock.length}
- Produtos abaixo do mínimo: ${lowStock.length}
- Produtos acima do máximo (excesso): ${overStock.length}
- Produtos sem giro (90 dias): ${stagnantProducts.length} (R$ ${stagnantValue.toFixed(2)} empatado)

Detalhes estoque negativo:
${negativeStock.slice(0, 10).map(p => `- ${p.code || 'S/C'} ${p.description}: ${p.current_stock} unidades`).join('\n') || 'Nenhum'}

Detalhes estoque baixo:
${lowStock.slice(0, 10).map(p => `- ${p.code || 'S/C'} ${p.description}: ${p.current_stock}/${p.min_stock} (mín)`).join('\n') || 'Nenhum'}

### PROBLEMAS DE PRECIFICAÇÃO E CUSTO
- Produtos SEM custo cadastrado: ${noCostProducts.length}
- Produtos SEM preço de venda: ${noSalePriceProducts.length}
- Produtos com margem NEGATIVA: ${negativeMargin.length}
- Produtos com margem muito baixa (<10%): ${lowMarginProducts.length}
- Produtos com movimentação mas sem custo: ${productsNeedingCostUpdate.length}

Produtos com margem negativa:
${negativeMargin.slice(0, 10).map(p => `- ${p.code || 'S/C'} ${p.description}: custo R$${p.cost_price?.toFixed(2)} > venda R$${p.sale_price?.toFixed(2)}`).join('\n') || 'Nenhum'}

Produtos sem custo cadastrado (amostra):
${noCostProducts.slice(0, 5).map(p => `- ${p.code || 'S/C'} ${p.description}`).join('\n') || 'Nenhum'}

### CURVA ABC (por valor em estoque)
- Curva A (80% do valor): ${curveA.length} produtos
- Curva B (15% do valor): ${curveB.length} produtos
- Curva C (5% do valor): ${curveC.length} produtos

Top 5 produtos por valor em estoque:
${productsByValue.slice(0, 5).map(p => `- ${p.code || 'S/C'} ${p.description}: R$ ${p.stockValue.toFixed(2)} (${p.current_stock} un × R$ ${(p.cost_price || 0).toFixed(2)})`).join('\n')}

### MOVIMENTAÇÃO DE ESTOQUE (últimos 30 dias)
- Total de movimentações: ${recentMovements.length}
- Entradas: ${entriesCount}
- Saídas: ${exitsCount}

### TOP PRODUTOS VENDIDOS
${topSellingProducts.map((p, i) => `${i+1}. ${p.product?.code || 'S/C'} ${p.product?.description || 'Desconhecido'}: ${p.count} un (R$ ${p.value.toFixed(2)})`).join('\n') || 'Sem vendas recentes'}

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
        model: "openai/gpt-5-mini",
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
      const parsed = JSON.parse(cleanJson);
      
      // CORREÇÃO: Garantir que generatedInsights seja sempre um array
      if (Array.isArray(parsed)) {
        generatedInsights = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Se for um objeto, tentar extrair array de propriedades comuns
        if (Array.isArray(parsed.insights)) {
          generatedInsights = parsed.insights;
        } else if (Array.isArray(parsed.data)) {
          generatedInsights = parsed.data;
        } else {
          // Se for um objeto único, colocar em um array
          generatedInsights = [parsed];
        }
      } else {
        generatedInsights = [];
      }
      
      console.log("[analyze-insights] Parsed insights count:", generatedInsights.length);
    } catch (parseError) {
      console.error("[analyze-insights] Failed to parse AI response:", parseError);
      console.error("[analyze-insights] Raw content:", aiContent.substring(0, 200));
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
