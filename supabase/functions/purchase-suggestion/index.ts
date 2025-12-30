import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Agente de Sugestão de Compra - WeDo ERP
 * Conforme Prompt 8.1 do Spec
 * 
 * Analisa:
 * - Estoque atual vs mínimo
 * - Histórico de vendas (últimos 90 dias)
 * - Sazonalidade
 * - Preços de fornecedores
 * 
 * Gera sugestões de compra para aprovação humana
 */

interface ProductAnalysis {
  product_id: string;
  code: string;
  description: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  avg_daily_sales: number;
  days_until_stockout: number;
  suggested_quantity: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  suppliers: { name: string; last_price: number; lead_time_days: number }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, forecast_days = 30, include_low_priority = true } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[purchase-suggestion] Analisando estoque para company: ${company_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar produtos com controle de estoque
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, code, description, quantity, min_stock, max_stock, purchase_price")
      .eq("is_active", true)
      .eq("controls_stock", true);

    if (prodError) throw prodError;

    console.log(`[purchase-suggestion] ${products?.length || 0} produtos com controle de estoque`);

    // 2. Buscar histórico de vendas dos últimos 90 dias
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: salesItems, error: salesError } = await supabase
      .from("sale_product_items")
      .select(`
        product_id,
        quantity,
        sales:sale_id(sale_date, company_id)
      `)
      .gte("created_at", ninetyDaysAgo.toISOString());

    if (salesError) throw salesError;

    // Agrupar vendas por produto
    const salesByProduct = new Map<string, number>();
    for (const item of salesItems || []) {
      const saleData = item.sales as unknown as { sale_date: string; company_id: string } | null;
      if (saleData?.company_id !== company_id) continue;
      
      const current = salesByProduct.get(item.product_id) || 0;
      salesByProduct.set(item.product_id, current + item.quantity);
    }
      
      const current = salesByProduct.get(item.product_id) || 0;
      salesByProduct.set(item.product_id, current + item.quantity);
    }

    // 3. Buscar fornecedores por produto
    const { data: suppliers } = await supabase
      .from("product_suppliers")
      .select("product_id, supplier_name, supplier_code");

    const suppliersByProduct = new Map<string, { name: string; last_price: number; lead_time_days: number }[]>();
    for (const s of suppliers || []) {
      const list = suppliersByProduct.get(s.product_id) || [];
      list.push({ 
        name: s.supplier_name, 
        last_price: 0, // TODO: buscar último preço da NF
        lead_time_days: 7 // Default lead time
      });
      suppliersByProduct.set(s.product_id, list);
    }

    // 4. Analisar cada produto
    const suggestions: ProductAnalysis[] = [];

    for (const product of products || []) {
      const currentStock = product.quantity || 0;
      const minStock = product.min_stock || 0;
      const maxStock = product.max_stock || (minStock * 3);
      
      // Calcular média diária de vendas
      const totalSold = salesByProduct.get(product.id) || 0;
      const avgDailySales = totalSold / 90;
      
      // Dias até ruptura
      const daysUntilStockout = avgDailySales > 0 
        ? Math.floor(currentStock / avgDailySales) 
        : Infinity;

      // Determinar prioridade
      let priority: 'critical' | 'high' | 'medium' | 'low';
      let reasoning: string;

      if (currentStock <= 0) {
        priority = 'critical';
        reasoning = 'Estoque zerado - ruptura imediata';
      } else if (currentStock < minStock) {
        priority = 'critical';
        reasoning = `Estoque abaixo do mínimo (${currentStock} < ${minStock})`;
      } else if (daysUntilStockout <= 7) {
        priority = 'high';
        reasoning = `Ruptura prevista em ${daysUntilStockout} dias`;
      } else if (daysUntilStockout <= 14) {
        priority = 'medium';
        reasoning = `Ruptura prevista em ${daysUntilStockout} dias`;
      } else if (currentStock < minStock * 1.5) {
        priority = 'low';
        reasoning = 'Estoque próximo ao ponto de reposição';
      } else {
        continue; // Não precisa comprar
      }

      if (!include_low_priority && priority === 'low') continue;

      // Calcular quantidade sugerida
      const demandForecast = avgDailySales * forecast_days;
      const suggestedQuantity = Math.max(
        Math.ceil(maxStock - currentStock),
        Math.ceil(demandForecast - currentStock),
        minStock
      );

      suggestions.push({
        product_id: product.id,
        code: product.code,
        description: product.description,
        current_stock: currentStock,
        min_stock: minStock,
        max_stock: maxStock,
        avg_daily_sales: Math.round(avgDailySales * 100) / 100,
        days_until_stockout: daysUntilStockout === Infinity ? 999 : daysUntilStockout,
        suggested_quantity: suggestedQuantity,
        priority,
        reasoning,
        suppliers: suppliersByProduct.get(product.id) || []
      });
    }

    // 5. Ordenar por prioridade
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // 6. Resumo
    const summary = {
      total_products_analyzed: products?.length || 0,
      critical_count: suggestions.filter(s => s.priority === 'critical').length,
      high_count: suggestions.filter(s => s.priority === 'high').length,
      medium_count: suggestions.filter(s => s.priority === 'medium').length,
      low_count: suggestions.filter(s => s.priority === 'low').length,
      total_suggestions: suggestions.length,
      estimated_value: suggestions.reduce((sum, s) => {
        const price = s.suppliers[0]?.last_price || 0;
        return sum + (s.suggested_quantity * price);
      }, 0)
    };

    console.log(`[purchase-suggestion] Sugestões geradas:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          suggestions,
          summary,
          // IMPORTANTE: Estas são apenas sugestões para revisão humana
          // O sistema NUNCA cria pedidos automaticamente
          requires_human_approval: true,
          auto_created_orders: 0
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[purchase-suggestion] Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});