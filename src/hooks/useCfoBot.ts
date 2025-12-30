import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

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

interface ProductData {
  id: string;
  code: string;
  description: string;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  product_group?: string;
}

export function useCfoBot() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [loading, setLoading] = useState(false);

  const analyzePricing = useCallback(async (minMarginThreshold = 20): Promise<PricingSuggestion[]> => {
    if (!companyId) return [];
    
    setLoading(true);
    const suggestions: PricingSuggestion[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('products')
        .select('id, code, description, purchase_price, sale_price, quantity')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      const products = (result.data || []) as ProductData[];

      for (const product of products) {
        const cost = Number(product.purchase_price) || 0;
        const price = Number(product.sale_price) || 0;
        
        if (cost <= 0 || price <= 0) continue;
        
        const margin = ((price - cost) / cost) * 100;

        if (margin < minMarginThreshold) {
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

        if (margin > 100) {
          suggestions.push({
            product_id: product.id,
            product_name: product.description,
            current_price: price,
            suggested_price: price,
            current_margin: margin,
            suggested_margin: margin,
            reason: `Margem muito alta (${margin.toFixed(1)}%) - verifique competitividade`,
            confidence: 'low',
            impact: 'neutral',
          });
        }
      }

      return suggestions.sort((a, b) => {
        const impactOrder = { positive: 0, neutral: 1, negative: 2 };
        const confOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact] || confOrder[a.confidence] - confOrder[b.confidence];
      });
    } catch (error) {
      console.error('Erro ao analisar preços:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const analyzeMargins = useCallback(async (threshold = 20): Promise<MarginAnalysis[]> => {
    if (!companyId) return [];
    
    setLoading(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase as any)
        .from('products')
        .select('id, product_group, purchase_price, sale_price, quantity')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const products = (result.data || []) as ProductData[];

      const byCategory: Record<string, ProductData[]> = {};
      products.forEach(p => {
        const cost = Number(p.purchase_price) || 0;
        const price = Number(p.sale_price) || 0;
        if (cost <= 0 || price <= 0) return;
        
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

  const projectCashFlow = useCallback(async (days = 30): Promise<CashFlowProjection[]> => {
    if (!companyId) return [];
    
    setLoading(true);

    try {
      const today = new Date();
      const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      const todayStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payablesResult = await (supabase as any)
        .from('payables')
        .select('amount, due_date')
        .eq('company_id', companyId)
        .eq('is_paid', false)
        .gte('due_date', todayStr)
        .lte('due_date', endDateStr);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receivablesResult = await (supabase as any)
        .from('accounts_receivable')
        .select('amount, due_date')
        .eq('company_id', companyId)
        .eq('is_paid', false)
        .gte('due_date', todayStr)
        .lte('due_date', endDateStr);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountsResult = await (supabase as any)
        .from('bank_accounts')
        .select('current_balance')
        .eq('company_id', companyId)
        .eq('is_active', true);

      type AmountDate = { amount: number; due_date: string };
      type Balance = { current_balance: number };
      
      const payablesList = (payablesResult.data || []) as AmountDate[];
      const receivablesList = (receivablesResult.data || []) as AmountDate[];
      const accountsList = (accountsResult.data || []) as Balance[];

      let currentBalance = accountsList.reduce((s, a) => s + Number(a.current_balance || 0), 0);

      const byDate: Record<string, { inflows: number; outflows: number }> = {};

      payablesList.forEach(p => {
        if (!byDate[p.due_date]) byDate[p.due_date] = { inflows: 0, outflows: 0 };
        byDate[p.due_date].outflows += Number(p.amount);
      });

      receivablesList.forEach(r => {
        if (!byDate[r.due_date]) byDate[r.due_date] = { inflows: 0, outflows: 0 };
        byDate[r.due_date].inflows += Number(r.amount);
      });

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
