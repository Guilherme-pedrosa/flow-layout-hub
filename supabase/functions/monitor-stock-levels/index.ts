import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting stock levels monitor...");

    // Buscar todas as empresas ativas
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name");

    if (companiesError) throw companiesError;

    const insights: any[] = [];

    for (const company of companies || []) {
      console.log(`Analyzing stock for company: ${company.name}`);

      // Buscar produtos com estoque baixo ou negativo
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, sku, current_stock, min_stock, max_stock, cost_price, sale_price")
        .eq("company_id", company.id)
        .eq("is_active", true);

      if (productsError) {
        console.error("Error fetching products:", productsError);
        continue;
      }

      // Produtos com estoque negativo
      const negativeStock = (products || []).filter(p => (p.current_stock || 0) < 0);
      if (negativeStock.length > 0) {
        insights.push({
          company_id: company.id,
          type: "critical",
          category: "stock",
          mode: "auditora",
          title: "Estoque Negativo Detectado",
          message: `${negativeStock.length} produto(s) com estoque negativo. Isso indica inconsistência no controle de estoque. Produtos: ${negativeStock.slice(0, 3).map(p => p.name).join(", ")}${negativeStock.length > 3 ? '...' : ''}`,
          action_label: "Ajustar Estoque",
          action_url: "/ajustes",
          priority: 10,
          metadata: { 
            products: negativeStock.map(p => ({ id: p.id, name: p.name, stock: p.current_stock }))
          },
        });
      }

      // Produtos abaixo do estoque mínimo
      const lowStock = (products || []).filter(p => 
        p.min_stock && (p.current_stock || 0) <= p.min_stock && (p.current_stock || 0) >= 0
      );
      if (lowStock.length > 0) {
        const totalValue = lowStock.reduce((sum, p) => 
          sum + ((p.min_stock - (p.current_stock || 0)) * (p.cost_price || 0)), 0
        );
        insights.push({
          company_id: company.id,
          type: "warning",
          category: "stock",
          mode: "especialista",
          title: "Estoque Abaixo do Mínimo",
          message: `${lowStock.length} produto(s) abaixo do estoque mínimo. Valor estimado para reposição: R$ ${totalValue.toFixed(2)}. Considere gerar um pedido de compra.`,
          action_label: "Sugestão de Compra",
          action_url: "/solicitacoes",
          priority: 7,
          metadata: { 
            products: lowStock.slice(0, 10).map(p => ({ 
              id: p.id, 
              name: p.name, 
              current: p.current_stock, 
              min: p.min_stock 
            })),
            estimatedValue: totalValue
          },
        });
      }

      // Produtos acima do estoque máximo (capital parado)
      const overStock = (products || []).filter(p => 
        p.max_stock && (p.current_stock || 0) > p.max_stock
      );
      if (overStock.length > 0) {
        const excessValue = overStock.reduce((sum, p) => 
          sum + (((p.current_stock || 0) - p.max_stock) * (p.cost_price || 0)), 0
        );
        insights.push({
          company_id: company.id,
          type: "info",
          category: "stock",
          mode: "cfo_bot",
          title: "Capital Parado em Estoque",
          message: `${overStock.length} produto(s) acima do estoque máximo. Capital parado estimado: R$ ${excessValue.toFixed(2)}. Considere criar uma promoção.`,
          action_label: "Ver Produtos",
          action_url: "/saldo-estoque",
          priority: 4,
          metadata: { 
            products: overStock.slice(0, 10).map(p => ({ 
              id: p.id, 
              name: p.name, 
              current: p.current_stock, 
              max: p.max_stock 
            })),
            excessValue
          },
        });
      }

      // Produtos sem movimentação nos últimos 90 dias
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: recentMovements } = await supabase
        .from("stock_movements")
        .select("product_id")
        .eq("company_id", company.id)
        .gte("created_at", ninetyDaysAgo.toISOString());

      const productsWithMovement = new Set((recentMovements || []).map(m => m.product_id));
      const stagnantProducts = (products || []).filter(p => 
        !productsWithMovement.has(p.id) && (p.current_stock || 0) > 0
      );

      if (stagnantProducts.length > 0) {
        const stagnantValue = stagnantProducts.reduce((sum, p) => 
          sum + ((p.current_stock || 0) * (p.cost_price || 0)), 0
        );
        insights.push({
          company_id: company.id,
          type: "warning",
          category: "stock",
          mode: "especialista",
          title: "Produtos Sem Giro",
          message: `${stagnantProducts.length} produto(s) sem movimentação nos últimos 90 dias. Valor em estoque: R$ ${stagnantValue.toFixed(2)}. Considere criar uma promoção.`,
          action_label: "Analisar",
          action_url: "/saldo-estoque",
          priority: 5,
          metadata: { 
            products: stagnantProducts.slice(0, 10).map(p => ({ 
              id: p.id, 
              name: p.name, 
              stock: p.current_stock,
              value: (p.current_stock || 0) * (p.cost_price || 0)
            })),
            totalValue: stagnantValue
          },
        });
      }
    }

    // Inserir insights no banco
    let insertedCount = 0;
    for (const insight of insights) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: existing } = await supabase
        .from("ai_insights")
        .select("id")
        .eq("company_id", insight.company_id)
        .eq("title", insight.title)
        .eq("is_dismissed", false)
        .gte("created_at", yesterday.toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        const { error: insertError } = await supabase
          .from("ai_insights")
          .insert(insight);

        if (!insertError) insertedCount++;
      }
    }

    console.log(`Stock monitor completed. Inserted ${insertedCount} new insights.`);

    return new Response(
      JSON.stringify({
        success: true,
        companiesAnalyzed: companies?.length || 0,
        insightsGenerated: insights.length,
        insightsInserted: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in monitor-stock-levels:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
