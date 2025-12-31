import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarginImpactRequest {
  companyId: string;
  purchaseOrderId: string;
  items: Array<{
    productId: string;
    newCost: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId, purchaseOrderId, items }: MarginImpactRequest = await req.json();

    if (!companyId || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'companyId e items são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[analyze-margin-impact] Analisando ${items.length} itens para empresa ${companyId}`);

    const alerts: any[] = [];
    const MIN_MARGIN_THRESHOLD = 20; // 20% margem mínima

    for (const item of items) {
      if (!item.productId || !item.newCost) continue;

      // 1. Buscar vendas "Aguardando Peças" ou similares que contenham o produto
      const { data: salesWithProduct, error: salesError } = await supabase
        .from('sale_product_items')
        .select(`
          id,
          quantity,
          unit_price,
          total,
          sale:sales!inner (
            id,
            sale_number,
            status,
            company_id,
            total_amount
          )
        `)
        .eq('product_id', item.productId)
        .eq('sale.company_id', companyId)
        .in('sale.status', ['aguardando_pecas', 'em_separacao', 'pendente', 'aguardando']);

      if (salesError) {
        console.error(`[analyze-margin-impact] Erro ao buscar vendas:`, salesError);
        continue;
      }

      // 2. Buscar ordens de serviço "Aguardando Peças" que contenham o produto
      const { data: osWithProduct, error: osError } = await supabase
        .from('service_order_products')
        .select(`
          id,
          quantity,
          unit_price,
          total,
          service_order:service_orders!inner (
            id,
            order_number,
            company_id,
            total_amount,
            status_id
          )
        `)
        .eq('product_id', item.productId)
        .eq('service_order.company_id', companyId);

      // 3. Buscar o custo anterior do produto
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('average_cost, sale_price, cost_price')
        .eq('id', item.productId)
        .single();

      if (productError || !product) {
        console.error(`[analyze-margin-impact] Produto ${item.productId} não encontrado`);
        continue;
      }

      const oldCost = product.average_cost || product.cost_price || 0;
      const salePrice = product.sale_price || 0;

      // Calcular margens
      const oldMargin = salePrice > 0 ? ((salePrice - oldCost) / salePrice) * 100 : 0;
      const newMargin = salePrice > 0 ? ((salePrice - item.newCost) / salePrice) * 100 : 0;

      // 4. Verificar impacto nas vendas
      if (salesWithProduct && salesWithProduct.length > 0) {
        for (const saleItem of salesWithProduct) {
          const sale = (saleItem as any).sale;
          if (!sale) continue;

          // Se a nova margem for menor que o threshold, criar alerta
          if (newMargin < MIN_MARGIN_THRESHOLD && oldMargin >= MIN_MARGIN_THRESHOLD) {
            const potentialLoss = (item.newCost - oldCost) * (saleItem.quantity || 1);

            alerts.push({
              company_id: companyId,
              product_id: item.productId,
              purchase_order_id: purchaseOrderId,
              reference_type: 'sale',
              reference_id: sale.id,
              reference_number: sale.sale_number || sale.id,
              old_margin_percent: oldMargin,
              new_margin_percent: newMargin,
              old_cost: oldCost,
              new_cost: item.newCost,
              sale_price: salePrice,
              quantity: saleItem.quantity,
              potential_loss: potentialLoss,
              status: 'pending',
            });
          }
        }
      }

      // 5. Verificar impacto nas OS
      if (osWithProduct && osWithProduct.length > 0) {
        for (const osItem of osWithProduct) {
          const os = (osItem as any).service_order;
          if (!os) continue;

          // Se a nova margem for menor que o threshold, criar alerta
          if (newMargin < MIN_MARGIN_THRESHOLD && oldMargin >= MIN_MARGIN_THRESHOLD) {
            const potentialLoss = (item.newCost - oldCost) * (osItem.quantity || 1);

            alerts.push({
              company_id: companyId,
              product_id: item.productId,
              purchase_order_id: purchaseOrderId,
              reference_type: 'service_order',
              reference_id: os.id,
              reference_number: os.order_number || os.id,
              old_margin_percent: oldMargin,
              new_margin_percent: newMargin,
              old_cost: oldCost,
              new_cost: item.newCost,
              sale_price: salePrice,
              quantity: osItem.quantity,
              potential_loss: potentialLoss,
              status: 'pending',
            });
          }
        }
      }
    }

    // 6. Inserir alertas no banco
    if (alerts.length > 0) {
      const { error: insertError } = await supabase
        .from('margin_impact_alerts')
        .insert(alerts);

      if (insertError) {
        console.error(`[analyze-margin-impact] Erro ao inserir alertas:`, insertError);
      } else {
        console.log(`[analyze-margin-impact] ${alerts.length} alertas criados`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsCreated: alerts.length,
        message: alerts.length > 0 
          ? `${alerts.length} alertas de impacto na margem criados` 
          : 'Nenhum impacto significativo detectado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyze-margin-impact] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
