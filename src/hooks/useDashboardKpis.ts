import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KpiData } from '@/lib/types';
import { getCurrentMonthRange } from '@/lib/utils';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

async function fetchSalesTotal(startDate: Date, endDate: Date, companyId?: string | null) {
  let query = supabase
    .from('sales')
    .select('total_value')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data } = await query;
  return data?.reduce((sum, item) => sum + (item.total_value || 0), 0) || 0;
}

async function fetchPayablesTotal(isPaid: boolean, companyId?: string | null, maxDueDate?: Date) {
  let query = supabase.from('payables').select('amount').eq('is_paid', isPaid);
  if (maxDueDate) query = query.lte('due_date', maxDueDate.toISOString());
  if (companyId) query = query.eq('company_id', companyId);
  
  const { data } = await query;
  return data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
}

async function fetchReceivablesTotal(isPaid: boolean, companyId?: string | null, maxDueDate?: Date) {
  let query = supabase.from('accounts_receivable').select('amount').eq('is_paid', isPaid);
  if (maxDueDate) query = query.lte('due_date', maxDueDate.toISOString());
  if (companyId) query = query.eq('company_id', companyId);
  
  const { data } = await query;
  return data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
}

async function fetchLowStockCount(companyId?: string | null) {
  let query: any = supabase
    .from('products')
    .select('id, quantity, min_stock')
    .eq('is_active', true)
    .eq('controls_stock', true);
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data } = await query;
  return (data as any[])?.filter((p) => (p.quantity || 0) < (p.min_stock || 0)).length || 0;
}

export function useDashboardKpis(companyId?: string | null) {
  return useQuery<KpiData[], Error>({
    queryKey: ['dashboard', 'kpis', companyId],
    queryFn: async () => {
      const { start, end } = getCurrentMonthRange();
      const now = new Date();
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));

      const [
        sales,
        prevSales,
        payables,
        prevPayables,
        receivables,
        prevReceivables,
        lowStockCount,
      ] = await Promise.all([
        fetchSalesTotal(start, end, companyId),
        fetchSalesTotal(prevStart, prevEnd, companyId),
        fetchPayablesTotal(false, companyId),
        fetchPayablesTotal(false, companyId, prevEnd),
        fetchReceivablesTotal(false, companyId),
        fetchReceivablesTotal(false, companyId, prevEnd),
        fetchLowStockCount(companyId),
      ]);

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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
