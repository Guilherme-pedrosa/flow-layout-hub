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

    console.log('[cfo-cost-monitoring] Iniciando monitoramento de custos...');

    // Buscar empresas ativas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true);

    if (companiesError) throw companiesError;

    const COST_INCREASE_THRESHOLD = 20; // 20% aumento considerado significativo
    const alerts: any[] = [];
    
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    for (const company of companies || []) {
      // 1. Comparar gastos dos últimos 30 dias com os 30 dias anteriores
      const { data: currentPayables } = await supabase
        .from('payables')
        .select('amount, chart_account_id')
        .eq('company_id', company.id)
        .eq('is_paid', true)
        .gte('paid_at', last30Days.toISOString())
        .lte('paid_at', today.toISOString());

      const { data: previousPayables } = await supabase
        .from('payables')
        .select('amount, chart_account_id')
        .eq('company_id', company.id)
        .eq('is_paid', true)
        .gte('paid_at', previous30Days.toISOString())
        .lt('paid_at', last30Days.toISOString());

      const currentTotal = (currentPayables || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const previousTotal = (previousPayables || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      // Calcular variação percentual
      const variation = previousTotal > 0 
        ? ((currentTotal - previousTotal) / previousTotal) * 100 
        : 0;

      if (variation > COST_INCREASE_THRESHOLD) {
        alerts.push({
          company_id: company.id,
          alert_type: 'cost_increase',
          severity: variation > 50 ? 'critical' : 'warning',
          title: `Aumento significativo nos gastos`,
          message: `Os gastos dos últimos 30 dias (R$ ${currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) aumentaram ${variation.toFixed(1)}% em relação ao período anterior (R$ ${previousTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
          context_data: {
            current_period_total: currentTotal,
            previous_period_total: previousTotal,
            variation_percent: variation,
            period: '30 dias'
          },
        });
      }

      // 2. Analisar gastos por categoria (chart_account_id)
      const categoryCurrentMap = new Map<string, number>();
      const categoryPreviousMap = new Map<string, number>();

      for (const p of currentPayables || []) {
        const key = p.chart_account_id || 'sem_categoria';
        categoryCurrentMap.set(key, (categoryCurrentMap.get(key) || 0) + (p.amount || 0));
      }

      for (const p of previousPayables || []) {
        const key = p.chart_account_id || 'sem_categoria';
        categoryPreviousMap.set(key, (categoryPreviousMap.get(key) || 0) + (p.amount || 0));
      }

      // Verificar categorias com aumento significativo
      for (const [category, currentAmount] of categoryCurrentMap) {
        const previousAmount = categoryPreviousMap.get(category) || 0;
        
        if (previousAmount > 0) {
          const categoryVariation = ((currentAmount - previousAmount) / previousAmount) * 100;
          
          if (categoryVariation > COST_INCREASE_THRESHOLD && currentAmount > 1000) {
            // Buscar nome da categoria
            let categoryName = 'Sem Categoria';
            if (category !== 'sem_categoria') {
              const { data: chartAccount } = await supabase
                .from('chart_of_accounts')
                .select('name, code')
                .eq('id', category)
                .single();
              
              if (chartAccount) {
                categoryName = `${chartAccount.code} - ${chartAccount.name}`;
              }
            }

            alerts.push({
              company_id: company.id,
              alert_type: 'cost_increase',
              severity: categoryVariation > 50 ? 'warning' : 'info',
              title: `Aumento em "${categoryName}"`,
              message: `A categoria "${categoryName}" teve aumento de ${categoryVariation.toFixed(1)}% (de R$ ${previousAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
              context_data: {
                category_id: category,
                category_name: categoryName,
                current_amount: currentAmount,
                previous_amount: previousAmount,
                variation_percent: categoryVariation
              },
            });
          }
        }
      }

      // 3. Verificar fornecedores com maior volume de pagamentos
      const { data: topSuppliers } = await supabase
        .from('payables')
        .select('supplier_id, amount, pessoas!inner(razao_social)')
        .eq('company_id', company.id)
        .eq('is_paid', true)
        .gte('paid_at', last30Days.toISOString());

      const supplierTotals = new Map<string, { total: number; name: string }>();
      for (const p of topSuppliers || []) {
        const key = p.supplier_id;
        const current = supplierTotals.get(key) || { total: 0, name: (p.pessoas as any)?.razao_social || 'Desconhecido' };
        current.total += p.amount || 0;
        supplierTotals.set(key, current);
      }

      // Top 3 fornecedores por valor (informativos)
      const topByValue = Array.from(supplierTotals.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 3);

      if (topByValue.length > 0 && topByValue[0][1].total > 10000) {
        alerts.push({
          company_id: company.id,
          alert_type: 'cost_increase',
          severity: 'info',
          title: `Principais fornecedores do mês`,
          message: `Os 3 fornecedores com maior volume são: ${topByValue.map(([_, v]) => `${v.name} (R$ ${v.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`).join(', ')}.`,
          context_data: {
            top_suppliers: topByValue.map(([id, v]) => ({
              supplier_id: id,
              name: v.name,
              total: v.total
            }))
          },
        });
      }
    }

    // Inserir alertas
    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from('cfo_vigilant_alerts')
        .insert(alerts);

      if (insertError) {
        console.error(`[cfo-cost-monitoring] Erro ao inserir alertas:`, insertError);
      }
    }

    console.log(`[cfo-cost-monitoring] Análise concluída: ${alerts.length} alertas criados`);

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
    console.error('[cfo-cost-monitoring] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
