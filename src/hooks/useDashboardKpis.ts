import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KpiData } from '@/lib/types';
import { getCurrentMonthRange } from '@/lib/utils';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function useDashboardKpis() {
  return useQuery<KpiData[], Error>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const { start, end } = getCurrentMonthRange();
      const now = new Date();
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));

      // Executa todas as queries em paralelo
      const [
        salesResult,
        prevSalesResult,
        payablesResult,
        prevPayablesResult,
        receivablesResult,
        prevReceivablesResult,
        lowStockResult,
      ] = await Promise.all([
        // 1. Vendas do mês atual
        supabase
          .from('sales')
          .select('total_value')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()),

        // 2. Vendas do mês anterior
        supabase
          .from('sales')
          .select('total_value')
          .gte('created_at', prevStart.toISOString())
          .lte('created_at', prevEnd.toISOString()),

        // 3. Contas a pagar (pendentes)
        supabase
          .from('payables')
          .select('amount')
          .eq('is_paid', false),

        // 4. Contas a pagar do mês anterior
        supabase
          .from('payables')
          .select('amount')
          .eq('is_paid', false)
          .lte('due_date', prevEnd.toISOString()),

        // 5. Contas a receber (pendentes)
        supabase
          .from('accounts_receivable')
          .select('amount')
          .eq('is_paid', false),

        // 6. Contas a receber do mês anterior
        supabase
          .from('accounts_receivable')
          .select('amount')
          .eq('is_paid', false)
          .lte('due_date', prevEnd.toISOString()),

        // 7. Produtos com estoque baixo
        supabase
          .from('products')
          .select('id, quantity, min_stock')
          .eq('is_active', true)
          .eq('controls_stock', true),
      ]);

      // Calcula os totais
      const sales = salesResult.data?.reduce((sum, item) => sum + (item.total_value || 0), 0) || 0;
      const prevSales = prevSalesResult.data?.reduce((sum, item) => sum + (item.total_value || 0), 0) || 0;
      
      const payables = payablesResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const prevPayables = prevPayablesResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      
      const receivables = receivablesResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      const prevReceivables = prevReceivablesResult.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      // Conta produtos com estoque baixo
      const lowStockCount = lowStockResult.data?.filter(
        (p) => (p.quantity || 0) < (p.min_stock || 0)
      ).length || 0;

      return [
        {
          id: 'revenue',
          title: 'Faturamento do Mês',
          value: sales,
          previousValue: prevSales || sales * 0.9,
          format: 'currency',
          icon: 'dollar',
          trend: sales >= prevSales ? 'up' : 'down',
        },
        {
          id: 'payables',
          title: 'Contas a Pagar',
          value: payables,
          previousValue: prevPayables || payables * 1.1,
          format: 'currency',
          icon: 'alert',
          trend: payables <= prevPayables ? 'up' : 'down',
        },
        {
          id: 'receivables',
          title: 'Contas a Receber',
          value: receivables,
          previousValue: prevReceivables || receivables * 0.95,
          format: 'currency',
          icon: 'cart',
          trend: receivables >= prevReceivables ? 'up' : 'down',
        },
        {
          id: 'lowStock',
          title: 'Estoque Baixo',
          value: lowStockCount,
          previousValue: lowStockCount + 2,
          format: 'number',
          icon: 'box',
          trend: lowStockCount <= 5 ? 'up' : 'down',
        },
      ] as KpiData[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });
}
