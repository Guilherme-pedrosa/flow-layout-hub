import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChartDataPoint } from '@/lib/types';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useSalesChartData(days: number = 7, companyId?: string | null) {
  return useQuery<ChartDataPoint[], Error>({
    queryKey: ['dashboard', 'salesChart', days, companyId],
    queryFn: async () => {
      const startDate = subDays(new Date(), days - 1);

      let query = supabase
        .from('sales')
        .select('created_at, total_value')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      // Group by day
      const groupedByDay = new Map<string, number>();

      // Initialize all days with 0
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - 1 - i);
        const key = format(date, 'yyyy-MM-dd');
        groupedByDay.set(key, 0);
      }

      // Sum values by day
      data?.forEach((item) => {
        const key = format(new Date(item.created_at), 'yyyy-MM-dd');
        const current = groupedByDay.get(key) || 0;
        groupedByDay.set(key, current + (item.total_value || 0));
      });

      // Convert to array
      return Array.from(groupedByDay.entries()).map(([date, value]) => ({
        date,
        label: format(new Date(date), 'dd/MM', { locale: ptBR }),
        value,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
