import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Apuração de Comissões - WeDo ERP
 * Conforme Prompt 5.1 do Spec
 * 
 * Calcula comissões de vendedores com base em:
 * - Vendas do período (por data de pagamento ou emissão)
 * - Percentual de comissão do vendedor
 * - Regras de pagamento (só após recebimento ou na venda)
 * 
 * IMPORTANTE: Não efetua pagamento automático de comissões
 * Apenas gera relatório para aprovação pelo gestor
 */

interface CommissionEntry {
  sale_id: string;
  sale_number: string;
  sale_date: string;
  client_name: string;
  total_value: number;
  commission_percentage: number;
  commission_value: number;
  payment_status: 'pending' | 'paid' | 'partial';
  paid_amount: number;
  commission_on_paid: number;
}

interface SellerCommissionSummary {
  seller_id: string;
  seller_name: string;
  commission_percentage: number;
  total_sales_count: number;
  total_sales_value: number;
  total_commission: number;
  commission_on_paid_sales: number;
  commission_on_pending_sales: number;
  entries: CommissionEntry[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      company_id, 
      start_date, 
      end_date, 
      seller_id,
      commission_basis = 'sale_date', // 'sale_date' | 'payment_date'
      include_pending = true 
    } = await req.json();

    if (!company_id || !start_date || !end_date) {
      throw new Error("company_id, start_date e end_date são obrigatórios");
    }

    console.log(`[calculate-commissions] Período: ${start_date} a ${end_date}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar vendedores (colaboradores com comissão)
    let sellersQuery = supabase
      .from("pessoas")
      .select("id, razao_social, nome_fantasia, comissao_percentual")
      .eq("is_colaborador", true)
      .eq("is_active", true)
      .gt("comissao_percentual", 0);

    if (seller_id) {
      sellersQuery = sellersQuery.eq("id", seller_id);
    }

    const { data: sellers, error: sellersError } = await sellersQuery;
    if (sellersError) throw sellersError;

    console.log(`[calculate-commissions] ${sellers?.length || 0} vendedores encontrados`);

    // 2. Buscar vendas do período
    let salesQuery = supabase
      .from("sales")
      .select(`
        id,
        sale_number,
        sale_date,
        total,
        seller_id,
        status,
        clientes:client_id(razao_social, nome_fantasia)
      `)
      .eq("company_id", company_id)
      .gte("sale_date", start_date)
      .lte("sale_date", end_date)
      .not("seller_id", "is", null);

    if (seller_id) {
      salesQuery = salesQuery.eq("seller_id", seller_id);
    }

    const { data: sales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;

    console.log(`[calculate-commissions] ${sales?.length || 0} vendas no período`);

    // 3. Buscar recebíveis relacionados às vendas
    const saleIds = sales?.map(s => s.id) || [];
    const { data: receivables } = await supabase
      .from("accounts_receivable")
      .select("sale_id, amount, paid_amount, is_paid")
      .in("sale_id", saleIds);

    // Agrupar recebíveis por venda
    const receivablesBySale = new Map<string, { total: number; paid: number }>();
    for (const r of receivables || []) {
      if (!r.sale_id) continue;
      const current = receivablesBySale.get(r.sale_id) || { total: 0, paid: 0 };
      current.total += r.amount;
      current.paid += r.paid_amount || 0;
      receivablesBySale.set(r.sale_id, current);
    }

    // 4. Calcular comissões por vendedor
    const commissionsBySeller = new Map<string, SellerCommissionSummary>();

    for (const seller of sellers || []) {
      const sellerSales = sales?.filter(s => s.seller_id === seller.id) || [];
      const commissionPercentage = seller.comissao_percentual || 0;

      const entries: CommissionEntry[] = [];
      let totalCommission = 0;
      let commissionOnPaid = 0;
      let commissionOnPending = 0;

      for (const sale of sellerSales) {
        const receivable = receivablesBySale.get(sale.id) || { total: sale.total, paid: 0 };
        const paidPercentage = receivable.total > 0 ? (receivable.paid / receivable.total) : 0;
        
        let paymentStatus: 'pending' | 'paid' | 'partial';
        if (paidPercentage >= 0.99) {
          paymentStatus = 'paid';
        } else if (paidPercentage > 0) {
          paymentStatus = 'partial';
        } else {
          paymentStatus = 'pending';
        }

        const fullCommission = sale.total * (commissionPercentage / 100);
        const commissionOnPaidAmount = receivable.paid * (commissionPercentage / 100);

        // Se o critério for por pagamento e não está pago, pular
        if (commission_basis === 'payment_date' && paymentStatus === 'pending' && !include_pending) {
          continue;
        }

        const clientData = sale.clientes as unknown as { razao_social: string; nome_fantasia: string } | null;

        entries.push({
          sale_id: sale.id,
          sale_number: sale.sale_number,
          sale_date: sale.sale_date,
          client_name: clientData?.nome_fantasia || clientData?.razao_social || 'Cliente não identificado',
          total_value: sale.total,
          commission_percentage: commissionPercentage,
          commission_value: fullCommission,
          payment_status: paymentStatus,
          paid_amount: receivable.paid,
          commission_on_paid: commissionOnPaidAmount
        });

        totalCommission += fullCommission;
        commissionOnPaid += commissionOnPaidAmount;
        commissionOnPending += (fullCommission - commissionOnPaidAmount);
      }

      if (entries.length > 0) {
        commissionsBySeller.set(seller.id, {
          seller_id: seller.id,
          seller_name: seller.nome_fantasia || seller.razao_social || 'Vendedor',
          commission_percentage: commissionPercentage,
          total_sales_count: entries.length,
          total_sales_value: entries.reduce((sum, e) => sum + e.total_value, 0),
          total_commission: totalCommission,
          commission_on_paid_sales: commissionOnPaid,
          commission_on_pending_sales: commissionOnPending,
          entries
        });
      }
    }

    // 5. Gerar resumo geral
    const allCommissions = Array.from(commissionsBySeller.values());
    const summary = {
      period: { start: start_date, end: end_date },
      sellers_count: allCommissions.length,
      total_sales_count: allCommissions.reduce((sum, s) => sum + s.total_sales_count, 0),
      total_sales_value: allCommissions.reduce((sum, s) => sum + s.total_sales_value, 0),
      total_commissions: allCommissions.reduce((sum, s) => sum + s.total_commission, 0),
      commissions_on_paid: allCommissions.reduce((sum, s) => sum + s.commission_on_paid_sales, 0),
      commissions_on_pending: allCommissions.reduce((sum, s) => sum + s.commission_on_pending_sales, 0),
    };

    console.log(`[calculate-commissions] Resumo:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          summary,
          sellers: allCommissions,
          // IMPORTANTE: Estas são apenas apurações para revisão
          // O sistema NUNCA efetua pagamento automático de comissões
          requires_human_approval: true,
          auto_paid_commissions: 0
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[calculate-commissions] Erro:", error);
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
