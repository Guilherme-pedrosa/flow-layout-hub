import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CashFlowPoint {
  month: string;
  label: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export function useCashFlowData(months: number = 6) {
  return useQuery<CashFlowPoint[], Error>({
    queryKey: ['dashboard', 'cashFlow', months],
    queryFn: async () => {
      const results: CashFlowPoint[] = [];

      for (let i = months - 1; i >= 0; i--) {
        const now = new Date();
        const targetMonth = subMonths(now, i);
        const start = startOfMonth(targetMonth);
        const end = endOfMonth(targetMonth);

        // Busca receitas (contas a receber pagas)
        const { data: receivablesData } = await supabase
          .from('accounts_receivable')
          .select('paid_amount')
          .eq('is_paid', true)
          .gte('paid_at', start.toISOString())
          .lte('paid_at', end.toISOString());

        // Busca despesas (contas a pagar pagas)
        const { data: payablesData } = await supabase
          .from('payables')
          .select('paid_amount')
          .eq('is_paid', true)
          .gte('paid_at', start.toISOString())
          .lte('paid_at', end.toISOString());

        const receitas = receivablesData?.reduce((sum, item) => sum + (item.paid_amount || 0), 0) || 0;
        const despesas = payablesData?.reduce((sum, item) => sum + (item.paid_amount || 0), 0) || 0;

        results.push({
          month: format(targetMonth, 'yyyy-MM'),
          label: format(targetMonth, 'MMM', { locale: ptBR }),
          receitas,
          despesas,
          saldo: receitas - despesas,
        });
      }

      return results;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}
