import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any;

export interface PricingSuggestion {
  product_id: string;
  product_name: string;
  current_price: number;
  suggested_price: number;
  current_margin: number;
  suggested_margin: number;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  impact: 'negative' | 'neutral' | 'positive';
}

export interface MarginAnalysis {
  category: string;
  avg_margin: number;
  products_below_threshold: number;
  products_above_threshold: number;
  revenue_at_risk: number;
}

export interface CashFlowProjection {
  date: string;
  projected_balance: number;
  inflows: number;
  outflows: number;
  is_critical: boolean;
}

export function useCfoBot() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [loading, setLoading] = useState(false);

  // Analisar margens e sugerir preços
  const analyzePricing = useCallback(async (minMarginThreshold = 20): Promise<PricingSuggestion[]> => {
    if (!companyId) return [];
    
    setLoading(true);
    const suggestions: PricingSuggestion[] = [];

    try {
      // Buscar produtos com custo e preço
      const q: SupabaseQuery = supabase.from('products').select('id, code, description, purchase_price, sale_price, quantity').eq('company_id', companyId).eq('is_active', true);
      const products = (await q).data;
        .select('id, code, description, purchase_price, sale_price, quantity')
        .eq('company_id', companyId)
        .eq('is_active', true) as any).then((r: any) => r.data as { id: string; code: string; description: string; purchase_price: number; sale_price: number; quantity: number }[] | null);

      if (!products) return [];

      // Buscar histórico de vendas para análise
      const { data: salesItems } = await supabase
        .from('sale_product_items')
        .select('product_id, quantity, unit_price, subtotal, sale:sales(sale_date)')
        .in('product_id', products.map(p => p.id))
        .order('created_at', { ascending: false })
        .limit(1000);

      // Agrupar vendas por produto
      const salesByProduct: Record<string, { qty: number; avg_price: number }> = {};
      salesItems?.forEach(item => {
        if (!salesByProduct[item.product_id]) {
          salesByProduct[item.product_id] = { qty: 0, avg_price: 0 };
        }
        salesByProduct[item.product_id].qty += item.quantity;
        salesByProduct[item.product_id].avg_price = item.unit_price;
      });

      for (const product of products) {
        const cost = Number(product.purchase_price);
        const price = Number(product.sale_price);
        const margin = ((price - cost) / cost) * 100;

        // Margem abaixo do threshold
        if (margin < minMarginThreshold) {
          // Calcular preço sugerido para atingir margem mínima
          const suggestedPrice = cost * (1 + minMarginThreshold / 100);
          
          suggestions.push({
            product_id: product.id,
            product_name: product.description,
            current_price: price,
            suggested_price: suggestedPrice,
            current_margin: margin,
            suggested_margin: minMarginThreshold,
            reason: `Margem atual (${margin.toFixed(1)}%) está abaixo do mínimo de ${minMarginThreshold}%`,
            confidence: margin < 10 ? 'high' : 'medium',
            impact: 'positive',
          });
        }

        // Margem muito alta pode indicar preço fora do mercado
        if (margin > 100) {
          suggestions.push({
            product_id: product.id,
            product_name: product.description,
            current_price: price,
            suggested_price: price,
            current_margin: margin,
            suggested_margin: margin,
            reason: `Margem muito alta (${margin.toFixed(1)}%) - verifique competitividade do preço`,
            confidence: 'low',
            impact: 'neutral',
          });
        }

        // Produto sem vendas recentes com estoque alto
        const sales = salesByProduct[product.id];
        if (!sales && product.quantity > 10) {
          const suggestedPrice = price * 0.9; // Sugerir 10% de desconto
          suggestions.push({
            product_id: product.id,
            product_name: product.description,
            current_price: price,
            suggested_price: suggestedPrice,
            current_margin: margin,
            suggested_margin: ((suggestedPrice - cost) / cost) * 100,
            reason: 'Produto sem vendas recentes com estoque alto - considere promoção',
            confidence: 'medium',
            impact: 'positive',
          });
        }
      }

      return suggestions.sort((a, b) => {
        // Ordenar por impacto e confiança
        const impactOrder = { positive: 0, neutral: 1, negative: 2 };
        const confOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact] || 
               confOrder[a.confidence] - confOrder[b.confidence];
      });
    } catch (error) {
      console.error('Erro ao analisar preços:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Análise de margens por categoria
  const analyzeMargins = useCallback(async (threshold = 20): Promise<MarginAnalysis[]> => {
    if (!companyId) return [];
    
    setLoading(true);

    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, product_group, purchase_price, sale_price, quantity')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gt('purchase_price', 0)
        .gt('sale_price', 0);

      if (!products) return [];

      // Agrupar por categoria
      const byCategory: Record<string, typeof products> = {};
      products.forEach(p => {
        const cat = p.product_group || 'Sem Categoria';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(p);
      });

      const analysis: MarginAnalysis[] = [];

      for (const [category, prods] of Object.entries(byCategory)) {
        let totalMargin = 0;
        let belowThreshold = 0;
        let aboveThreshold = 0;
        let revenueAtRisk = 0;

        prods.forEach(p => {
          const cost = Number(p.purchase_price);
          const price = Number(p.sale_price);
          const margin = ((price - cost) / cost) * 100;
          totalMargin += margin;

          if (margin < threshold) {
            belowThreshold++;
            // Receita em risco = potencial de perda com margem baixa
            revenueAtRisk += (threshold - margin) / 100 * price * (p.quantity || 1);
          } else {
            aboveThreshold++;
          }
        });

        analysis.push({
          category,
          avg_margin: totalMargin / prods.length,
          products_below_threshold: belowThreshold,
          products_above_threshold: aboveThreshold,
          revenue_at_risk: revenueAtRisk,
        });
      }

      return analysis.sort((a, b) => a.avg_margin - b.avg_margin);
    } catch (error) {
      console.error('Erro ao analisar margens:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Projeção de fluxo de caixa
  const projectCashFlow = useCallback(async (days = 30): Promise<CashFlowProjection[]> => {
    if (!companyId) return [];
    
    setLoading(true);

    try {
      const today = new Date();
      const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      // Buscar contas a pagar
      const { data: payables } = await supabase
        .from('payables')
        .select('amount, due_date, is_paid')
        .eq('company_id', companyId)
        .eq('is_paid', false)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0]);

      // Buscar contas a receber
      const { data: receivables } = await supabase
        .from('accounts_receivable')
        .select('amount, due_date, is_paid')
        .eq('company_id', companyId)
        .eq('is_paid', false)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0]);

      // Buscar saldo atual
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('company_id', companyId)
        .eq('is_active', true);

      let currentBalance = accounts?.reduce((s, a) => s + Number(a.current_balance || 0), 0) || 0;

      // Agrupar por data
      const byDate: Record<string, { inflows: number; outflows: number }> = {};

      payables?.forEach(p => {
        if (!byDate[p.due_date]) byDate[p.due_date] = { inflows: 0, outflows: 0 };
        byDate[p.due_date].outflows += Number(p.amount);
      });

      receivables?.forEach(r => {
        if (!byDate[r.due_date]) byDate[r.due_date] = { inflows: 0, outflows: 0 };
        byDate[r.due_date].inflows += Number(r.amount);
      });

      // Gerar projeção diária
      const projections: CashFlowProjection[] = [];
      let runningBalance = currentBalance;

      for (let d = 0; d <= days; d++) {
        const date = new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = byDate[dateStr] || { inflows: 0, outflows: 0 };

        runningBalance += dayData.inflows - dayData.outflows;

        projections.push({
          date: dateStr,
          projected_balance: runningBalance,
          inflows: dayData.inflows,
          outflows: dayData.outflows,
          is_critical: runningBalance < 0,
        });
      }

      return projections;
    } catch (error) {
      console.error('Erro ao projetar fluxo de caixa:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  return {
    loading,
    analyzePricing,
    analyzeMargins,
    projectCashFlow,
  };
}
