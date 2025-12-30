import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChartDataPoint } from '@/lib/types';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useSalesChartData(days: number = 7) {
  return useQuery<ChartDataPoint[], Error>({
    queryKey: ['dashboard', 'salesChart', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days - 1);

      const { data, error } = await supabase
        .from('sales')
        .select('created_at, total_value')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);

      // Agrupa por dia
      const groupedByDay = new Map<string, number>();

      // Inicializa todos os dias com 0
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - 1 - i);
        const key = format(date, 'yyyy-MM-dd');
        groupedByDay.set(key, 0);
      }

      // Soma os valores por dia
      data?.forEach((item) => {
        const key = format(new Date(item.created_at), 'yyyy-MM-dd');
        const current = groupedByDay.get(key) || 0;
        groupedByDay.set(key, current + (item.total_value || 0));
      });

      // Converte para array
      return Array.from(groupedByDay.entries()).map(([date, value]) => ({
        date,
        label: format(new Date(date), 'dd/MM', { locale: ptBR }),
        value,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
