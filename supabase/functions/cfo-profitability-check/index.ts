import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[cfo-profitability-check] Iniciando análise de rentabilidade...');

    // Buscar empresas ativas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true);

    if (companiesError) throw companiesError;

    const MIN_MARGIN_THRESHOLD = 15; // 15% margem mínima aceitável
    const alerts: any[] = [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    for (const company of companies || []) {
      // 1. Analisar vendas concluídas na última hora
      const { data: recentSales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          total_amount,
          discount_amount,
          updated_at,
          sale_product_items (
            product_id,
            quantity,
            unit_price,
            total,
            discount
          )
        `)
        .eq('company_id', company.id)
        .in('status', ['concluida', 'faturada', 'entregue'])
        .gte('updated_at', oneHourAgo);

      if (salesError) {
        console.error(`[cfo-profitability-check] Erro ao buscar vendas:`, salesError);
        continue;
      }

      for (const sale of recentSales || []) {
        const items = sale.sale_product_items || [];
        if (items.length === 0) continue;

        // Buscar custos dos produtos
        const productIds = items.map((i: any) => i.product_id).filter(Boolean);
        if (productIds.length === 0) continue;

        const { data: products } = await supabase
          .from('products')
          .select('id, average_cost, cost_price, sale_price')
          .in('id', productIds);

        const productCosts = new Map(
          (products || []).map(p => [p.id, p.average_cost || p.cost_price || 0])
        );

        // Calcular margem total da venda
        let totalRevenue = 0;
        let totalCost = 0;

        for (const item of items) {
          const cost = productCosts.get(item.product_id) || 0;
          totalRevenue += item.total || 0;
          totalCost += cost * (item.quantity || 1);
        }

        const margin = totalRevenue > 0 
          ? ((totalRevenue - totalCost) / totalRevenue) * 100 
          : 0;

        // Se margem abaixo do threshold, criar alerta
        if (margin < MIN_MARGIN_THRESHOLD) {
          alerts.push({
            company_id: company.id,
            alert_type: 'profitability',
            severity: margin < 5 ? 'critical' : 'warning',
            title: `Margem baixa na venda #${sale.sale_number}`,
            message: `A venda #${sale.sale_number} foi concluída com margem de ${margin.toFixed(1)}%, abaixo do mínimo de ${MIN_MARGIN_THRESHOLD}%.`,
            context_data: {
              sale_number: sale.sale_number,
              total_amount: sale.total_amount,
              margin_percent: margin,
              total_cost: totalCost,
              total_revenue: totalRevenue,
              items_count: items.length
            },
            reference_type: 'sale',
            reference_id: sale.id,
          });
        }
      }

      // 2. Analisar OS concluídas na última hora
      const { data: recentOS, error: osError } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          total_amount,
          updated_at,
          service_order_products (
            product_id,
            quantity,
            unit_price,
            total
          ),
          service_order_services (
            service_id,
            quantity,
            unit_price,
            total
          )
        `)
        .eq('company_id', company.id)
        .gte('updated_at', oneHourAgo);

      if (osError) {
        console.error(`[cfo-profitability-check] Erro ao buscar OS:`, osError);
        continue;
      }

      for (const os of recentOS || []) {
        const productItems = os.service_order_products || [];
        const serviceItems = os.service_order_services || [];

        if (productItems.length === 0 && serviceItems.length === 0) continue;

        // Buscar custos dos produtos
        const productIds = productItems.map((i: any) => i.product_id).filter(Boolean);
        let totalCost = 0;
        let totalRevenue = os.total_amount || 0;

        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, average_cost, cost_price')
            .in('id', productIds);

          const productCosts = new Map(
            (products || []).map(p => [p.id, p.average_cost || p.cost_price || 0])
          );

          for (const item of productItems) {
            const cost = productCosts.get(item.product_id) || 0;
            totalCost += cost * (item.quantity || 1);
          }
        }

        // Serviços: assumir 80% de margem (custo = 20% do valor)
        for (const service of serviceItems) {
          totalCost += (service.total || 0) * 0.2;
        }

        const margin = totalRevenue > 0 
          ? ((totalRevenue - totalCost) / totalRevenue) * 100 
          : 0;

        // Se margem abaixo do threshold, criar alerta
        if (margin < MIN_MARGIN_THRESHOLD) {
          alerts.push({
            company_id: company.id,
            alert_type: 'profitability',
            severity: margin < 5 ? 'critical' : 'warning',
            title: `Margem baixa na OS #${os.order_number}`,
            message: `A OS #${os.order_number} foi concluída com margem de ${margin.toFixed(1)}%, abaixo do mínimo de ${MIN_MARGIN_THRESHOLD}%.`,
            context_data: {
              order_number: os.order_number,
              total_amount: os.total_amount,
              margin_percent: margin,
              total_cost: totalCost,
              products_count: productItems.length,
              services_count: serviceItems.length
            },
            reference_type: 'service_order',
            reference_id: os.id,
          });
        }
      }
    }

    // Inserir alertas
    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from('cfo_vigilant_alerts')
        .insert(alerts);

      if (insertError) {
        console.error(`[cfo-profitability-check] Erro ao inserir alertas:`, insertError);
      }
    }

    console.log(`[cfo-profitability-check] Análise concluída: ${alerts.length} alertas criados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsCreated: alerts.length,
        companiesAnalyzed: companies?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cfo-profitability-check] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
