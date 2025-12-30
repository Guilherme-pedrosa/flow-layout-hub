import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Agente de Análise de Demanda - WeDo ERP
 * 
 * Analisa vendas e ordens de serviço aprovadas que não têm saldo em estoque.
 * Retorna lista completa com:
 * - Número da OS/Venda
 * - Cliente
 * - Produto
 * - Quantidade necessária
 * - Último fornecedor
 * - Último preço de compra
 */

interface DemandItem {
  id: string;
  source_type: 'service_order' | 'sale';
  source_number: number;
  source_id: string;
  client_name: string;
  client_id: string;
  product_id: string;
  product_code: string;
  product_description: string;
  quantity_needed: number;
  current_stock: number;
  stock_shortage: number; // quanto falta
  last_supplier_id: string | null;
  last_supplier_name: string | null;
  last_purchase_price: number | null;
  last_purchase_date: string | null;
  status_name: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();

    if (!company_id) {
      throw new Error("company_id é obrigatório");
    }

    console.log(`[demand-analysis] Analisando demandas para company: ${company_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todos os produtos com estoque atual
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, code, description, quantity")
      .eq("is_active", true);

    if (prodError) throw prodError;

    const productMap = new Map<string, { code: string; description: string; quantity: number }>();
    for (const p of products || []) {
      productMap.set(p.id, { 
        code: p.code || '', 
        description: p.description || '', 
        quantity: p.quantity || 0 
      });
    }

    console.log(`[demand-analysis] ${products?.length || 0} produtos carregados`);

    // 2. Buscar status de OS que representam aprovação (stock_behavior = 'reserve')
    const { data: osStatuses } = await supabase
      .from("service_order_statuses")
      .select("id, name")
      .eq("company_id", company_id)
      .eq("stock_behavior", "reserve")
      .eq("is_active", true);

    const approvedOsStatusIds = new Set((osStatuses || []).map(s => s.id));
    const osStatusNameMap = new Map((osStatuses || []).map(s => [s.id, s.name]));

    console.log(`[demand-analysis] ${osStatuses?.length || 0} status de OS com reserva de estoque`);

    // 3. Buscar status de vendas que representam aprovação
    const { data: saleStatuses } = await supabase
      .from("sale_statuses")
      .select("id, name")
      .eq("company_id", company_id)
      .eq("stock_behavior", "reserve")
      .eq("is_active", true);

    const approvedSaleStatusIds = new Set((saleStatuses || []).map(s => s.id));
    const saleStatusNameMap = new Map((saleStatuses || []).map(s => [s.id, s.name]));

    console.log(`[demand-analysis] ${saleStatuses?.length || 0} status de venda com reserva de estoque`);

    // 4. Buscar ordens de serviço aprovadas com seus itens
    const { data: serviceOrders, error: osError } = await supabase
      .from("service_orders")
      .select(`
        id,
        order_number,
        status_id,
        created_at,
        client:client_id(id, razao_social, nome_fantasia),
        items:service_order_product_items(
          id,
          product_id,
          quantity
        )
      `)
      .eq("company_id", company_id)
      .in("status_id", Array.from(approvedOsStatusIds));

    if (osError) throw osError;

    console.log(`[demand-analysis] ${serviceOrders?.length || 0} ordens de serviço aprovadas`);

    // 5. Buscar vendas aprovadas com seus itens
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        sale_number,
        status_id,
        created_at,
        client:client_id(id, razao_social, nome_fantasia),
        items:sale_product_items(
          id,
          product_id,
          quantity
        )
      `)
      .eq("company_id", company_id)
      .in("status_id", Array.from(approvedSaleStatusIds));

    if (salesError) throw salesError;

    console.log(`[demand-analysis] ${sales?.length || 0} vendas aprovadas`);

    // 6. Buscar histórico de compras para obter último fornecedor e preço
    const { data: purchaseHistory } = await supabase
      .from("purchase_order_items")
      .select(`
        product_id,
        unit_price,
        created_at,
        purchase_order:purchase_order_id(
          supplier_id,
          supplier_name,
          nfe_date,
          pessoas:supplier_id(razao_social, nome_fantasia)
        )
      `)
      .order("created_at", { ascending: false });

    // Mapear último fornecedor/preço por produto
    const lastPurchaseByProduct = new Map<string, {
      supplier_id: string | null;
      supplier_name: string;
      price: number;
      date: string;
    }>();

    for (const item of purchaseHistory || []) {
      if (!item.product_id) continue;
      if (lastPurchaseByProduct.has(item.product_id)) continue; // já temos o mais recente
      
      const po = item.purchase_order as any;
      let supplierName = po?.supplier_name || '';
      if (po?.pessoas) {
        supplierName = po.pessoas.nome_fantasia || po.pessoas.razao_social || supplierName;
      }

      lastPurchaseByProduct.set(item.product_id, {
        supplier_id: po?.supplier_id || null,
        supplier_name: supplierName,
        price: item.unit_price || 0,
        date: po?.nfe_date || item.created_at
      });
    }

    // 7. Calcular demanda total por produto (somando todas as OSs e vendas)
    const demandByProduct = new Map<string, number>();

    // Somar demanda de OSs
    for (const os of serviceOrders || []) {
      const items = (os.items || []) as any[];
      for (const item of items) {
        if (!item.product_id) continue;
        const current = demandByProduct.get(item.product_id) || 0;
        demandByProduct.set(item.product_id, current + (item.quantity || 0));
      }
    }

    // Somar demanda de vendas
    for (const sale of sales || []) {
      const items = (sale.items || []) as any[];
      for (const item of items) {
        if (!item.product_id) continue;
        const current = demandByProduct.get(item.product_id) || 0;
        demandByProduct.set(item.product_id, current + (item.quantity || 0));
      }
    }

    // 8. Montar lista de demandas com falta de estoque
    const demands: DemandItem[] = [];

    // Processar OSs
    for (const os of serviceOrders || []) {
      const items = (os.items || []) as any[];
      const client = os.client as any;
      const clientName = client?.nome_fantasia || client?.razao_social || 'Cliente não identificado';
      const statusName = osStatusNameMap.get(os.status_id) || 'Aprovada';

      for (const item of items) {
        if (!item.product_id) continue;
        
        const product = productMap.get(item.product_id);
        if (!product) continue;

        const quantityNeeded = item.quantity || 0;
        const currentStock = product.quantity || 0;
        const totalDemand = demandByProduct.get(item.product_id) || 0;
        
        // Verificar se há falta de estoque para atender a demanda total
        const stockShortage = Math.max(0, totalDemand - currentStock);
        
        if (stockShortage <= 0) continue; // Tem estoque suficiente

        const lastPurchase = lastPurchaseByProduct.get(item.product_id);

        demands.push({
          id: item.id,
          source_type: 'service_order',
          source_number: os.order_number,
          source_id: os.id,
          client_name: clientName,
          client_id: client?.id || '',
          product_id: item.product_id,
          product_code: product.code,
          product_description: product.description,
          quantity_needed: quantityNeeded,
          current_stock: currentStock,
          stock_shortage: stockShortage,
          last_supplier_id: lastPurchase?.supplier_id || null,
          last_supplier_name: lastPurchase?.supplier_name || null,
          last_purchase_price: lastPurchase?.price || null,
          last_purchase_date: lastPurchase?.date || null,
          status_name: statusName,
          created_at: os.created_at
        });
      }
    }

    // Processar Vendas
    for (const sale of sales || []) {
      const items = (sale.items || []) as any[];
      const client = sale.client as any;
      const clientName = client?.nome_fantasia || client?.razao_social || 'Cliente não identificado';
      const statusName = saleStatusNameMap.get(sale.status_id) || 'Aprovada';

      for (const item of items) {
        if (!item.product_id) continue;
        
        const product = productMap.get(item.product_id);
        if (!product) continue;

        const quantityNeeded = item.quantity || 0;
        const currentStock = product.quantity || 0;
        const totalDemand = demandByProduct.get(item.product_id) || 0;
        
        const stockShortage = Math.max(0, totalDemand - currentStock);
        
        if (stockShortage <= 0) continue;

        const lastPurchase = lastPurchaseByProduct.get(item.product_id);

        demands.push({
          id: item.id,
          source_type: 'sale',
          source_number: sale.sale_number,
          source_id: sale.id,
          client_name: clientName,
          client_id: client?.id || '',
          product_id: item.product_id,
          product_code: product.code,
          product_description: product.description,
          quantity_needed: quantityNeeded,
          current_stock: currentStock,
          stock_shortage: stockShortage,
          last_supplier_id: lastPurchase?.supplier_id || null,
          last_supplier_name: lastPurchase?.supplier_name || null,
          last_purchase_price: lastPurchase?.price || null,
          last_purchase_date: lastPurchase?.date || null,
          status_name: statusName,
          created_at: sale.created_at
        });
      }
    }

    // 9. Agrupar por produto para resumo
    const productSummary = new Map<string, {
      product_id: string;
      product_code: string;
      product_description: string;
      total_demand: number;
      current_stock: number;
      stock_shortage: number;
      sources_count: number;
      last_supplier_name: string | null;
      last_purchase_price: number | null;
    }>();

    for (const demand of demands) {
      const key = demand.product_id;
      const existing = productSummary.get(key);
      
      if (existing) {
        existing.sources_count += 1;
      } else {
        productSummary.set(key, {
          product_id: demand.product_id,
          product_code: demand.product_code,
          product_description: demand.product_description,
          total_demand: demandByProduct.get(demand.product_id) || 0,
          current_stock: demand.current_stock,
          stock_shortage: demand.stock_shortage,
          sources_count: 1,
          last_supplier_name: demand.last_supplier_name,
          last_purchase_price: demand.last_purchase_price
        });
      }
    }

    // 10. Ordenar demandas por data (mais antigas primeiro - prioridade)
    demands.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const summary = {
      total_demands: demands.length,
      os_count: demands.filter(d => d.source_type === 'service_order').length,
      sale_count: demands.filter(d => d.source_type === 'sale').length,
      unique_products: productSummary.size,
      estimated_purchase_value: Array.from(productSummary.values()).reduce((sum, p) => {
        return sum + (p.stock_shortage * (p.last_purchase_price || 0));
      }, 0)
    };

    console.log(`[demand-analysis] Análise concluída:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          demands, // Lista detalhada por OS/Venda
          product_summary: Array.from(productSummary.values()), // Resumo por produto
          summary
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[demand-analysis] Erro:", error);
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
