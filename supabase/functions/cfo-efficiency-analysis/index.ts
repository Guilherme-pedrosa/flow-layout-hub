import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

    console.log('[cfo-efficiency-analysis] Iniciando análise de eficiência operacional...');

    // Buscar empresas ativas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true);

    if (companiesError) throw companiesError;

    const alerts: any[] = [];
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    for (const company of companies || []) {
      // 1. Analisar tempo médio de conclusão das OS
      const { data: completedOS } = await supabase
        .from('service_orders')
        .select('id, order_number, created_at, updated_at, total_amount')
        .eq('company_id', company.id)
        .gte('updated_at', last30Days.toISOString());

      if (completedOS && completedOS.length > 0) {
        // Calcular tempo médio de conclusão (em horas)
        const completionTimes: number[] = [];
        
        for (const os of completedOS) {
          const createdAt = new Date(os.created_at);
          const updatedAt = new Date(os.updated_at);
          const hoursToComplete = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          completionTimes.push(hoursToComplete);
        }

        const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
        const maxCompletionTime = Math.max(...completionTimes);

        // Buscar média histórica dos últimos 90 dias
        const { data: historicalOS } = await supabase
          .from('service_orders')
          .select('id, created_at, updated_at')
          .eq('company_id', company.id)
          .gte('created_at', last90Days.toISOString())
          .lt('created_at', last30Days.toISOString());

        let historicalAvg = avgCompletionTime;
        if (historicalOS && historicalOS.length > 0) {
          const historicalTimes = historicalOS.map(os => {
            const created = new Date(os.created_at);
            const updated = new Date(os.updated_at);
            return (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
          });
          historicalAvg = historicalTimes.reduce((a, b) => a + b, 0) / historicalTimes.length;
        }

        // Se tempo médio aumentou mais de 20%, alertar
        const timeIncrease = historicalAvg > 0 
          ? ((avgCompletionTime - historicalAvg) / historicalAvg) * 100 
          : 0;

        if (timeIncrease > 20 && avgCompletionTime > 24) { // Mais de 24h e aumento > 20%
          alerts.push({
            company_id: company.id,
            alert_type: 'efficiency',
            severity: timeIncrease > 50 ? 'warning' : 'info',
            title: 'Aumento no tempo de conclusão de OS',
            message: `O tempo médio de conclusão de OS aumentou ${timeIncrease.toFixed(1)}% (de ${historicalAvg.toFixed(1)}h para ${avgCompletionTime.toFixed(1)}h).`,
            context_data: {
              current_avg_hours: avgCompletionTime,
              historical_avg_hours: historicalAvg,
              increase_percent: timeIncrease,
              max_completion_hours: maxCompletionTime,
              os_count: completedOS.length
            },
          });
        }

        // 2. Analisar custo médio por OS
        const totalRevenue = completedOS.reduce((sum, os) => sum + (os.total_amount || 0), 0);
        const avgRevenuePerOS = totalRevenue / completedOS.length;

        // Buscar média histórica
        let historicalAvgRevenue = avgRevenuePerOS;
        if (historicalOS && historicalOS.length > 0) {
          const { data: historicalOSWithAmount } = await supabase
            .from('service_orders')
            .select('total_amount')
            .eq('company_id', company.id)
            .gte('created_at', last90Days.toISOString())
            .lt('created_at', last30Days.toISOString());
          
          if (historicalOSWithAmount && historicalOSWithAmount.length > 0) {
            const historicalTotal = historicalOSWithAmount.reduce((sum, os) => sum + (os.total_amount || 0), 0);
            historicalAvgRevenue = historicalTotal / historicalOSWithAmount.length;
          }
        }

        // Se ticket médio caiu mais de 15%, alertar
        const ticketDecrease = historicalAvgRevenue > 0 
          ? ((historicalAvgRevenue - avgRevenuePerOS) / historicalAvgRevenue) * 100 
          : 0;

        if (ticketDecrease > 15) {
          alerts.push({
            company_id: company.id,
            alert_type: 'efficiency',
            severity: ticketDecrease > 30 ? 'warning' : 'info',
            title: 'Queda no ticket médio de OS',
            message: `O valor médio por OS caiu ${ticketDecrease.toFixed(1)}% (de R$ ${historicalAvgRevenue.toFixed(2)} para R$ ${avgRevenuePerOS.toFixed(2)}).`,
            context_data: {
              current_avg_revenue: avgRevenuePerOS,
              historical_avg_revenue: historicalAvgRevenue,
              decrease_percent: ticketDecrease,
              os_count: completedOS.length
            },
          });
        }
      }

      // 3. Analisar conversão de orçamentos em vendas
      const { data: quotations } = await supabase
        .from('sales')
        .select('id, status')
        .eq('company_id', company.id)
        .gte('created_at', last30Days.toISOString());

      if (quotations && quotations.length > 0) {
        const totalQuotations = quotations.filter(s => 
          ['orcamento', 'proposta', 'pendente'].includes(s.status || '')
        ).length;
        const convertedSales = quotations.filter(s => 
          ['concluida', 'faturada', 'entregue', 'aprovada'].includes(s.status || '')
        ).length;

        const conversionRate = totalQuotations > 0 
          ? (convertedSales / (totalQuotations + convertedSales)) * 100 
          : 0;

        // Se taxa de conversão < 30%, alertar
        if (conversionRate < 30 && (totalQuotations + convertedSales) > 10) {
          alerts.push({
            company_id: company.id,
            alert_type: 'efficiency',
            severity: conversionRate < 15 ? 'warning' : 'info',
            title: 'Taxa de conversão de orçamentos baixa',
            message: `A taxa de conversão de orçamentos em vendas está em ${conversionRate.toFixed(1)}%. Considere revisar o processo comercial.`,
            context_data: {
              conversion_rate: conversionRate,
              total_quotations: totalQuotations,
              converted_sales: convertedSales
            },
          });
        }
      }

      // 4. Analisar produtos parados no estoque
      const { data: slowProducts } = await supabase
        .from('products')
        .select('id, name, code, current_stock, sale_price, updated_at')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .eq('stock_control', true)
        .gt('current_stock', 0)
        .lt('updated_at', last90Days.toISOString())
        .limit(20);

      if (slowProducts && slowProducts.length > 5) {
        const totalValue = slowProducts.reduce((sum, p) => 
          sum + ((p.current_stock || 0) * (p.sale_price || 0)), 0
        );

        if (totalValue > 5000) {
          alerts.push({
            company_id: company.id,
            alert_type: 'efficiency',
            severity: totalValue > 20000 ? 'warning' : 'info',
            title: 'Produtos sem giro no estoque',
            message: `${slowProducts.length} produtos não tiveram movimentação nos últimos 90 dias, totalizando R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} parados em estoque.`,
            context_data: {
              products_count: slowProducts.length,
              total_value: totalValue,
              top_products: slowProducts.slice(0, 5).map(p => ({
                name: p.name,
                code: p.code,
                stock: p.current_stock,
                value: (p.current_stock || 0) * (p.sale_price || 0)
              }))
            },
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
        console.error(`[cfo-efficiency-analysis] Erro ao inserir alertas:`, insertError);
      }
    }

    console.log(`[cfo-efficiency-analysis] Análise concluída: ${alerts.length} alertas criados`);

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
    console.error('[cfo-efficiency-analysis] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
