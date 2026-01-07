import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface FieldServiceType {
  id: string | number;
  name: string;
  color?: string;
  duration?: number;
}

export function useFieldServiceTypes() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Buscar tipos de serviço do Field Control
  const fetchFieldServiceTypes = async (): Promise<FieldServiceType[]> => {
    if (!currentCompany?.id) return [];

    const { data, error } = await supabase.functions.invoke('field-service-types', {
      body: { company_id: currentCompany.id }
    });

    if (error) {
      console.error('Erro ao buscar tipos de serviço do Field:', error);
      return [];
    }

    return data?.services || [];
  };

  const query = useQuery({
    queryKey: ['field-service-types', currentCompany?.id],
    queryFn: fetchFieldServiceTypes,
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Sincronizar tipos de serviço do Field com banco local
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      setIsSyncing(true);
      const { data, error } = await supabase.functions.invoke('field-service-types', {
        body: { company_id: currentCompany.id, sync: true }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['service_types'] });
      queryClient.invalidateQueries({ queryKey: ['field-service-types'] });
      toast.success(`${data?.synced || 0} tipos de serviço sincronizados do Field Control`);
    },
    onError: (error) => {
      setIsSyncing(false);
      toast.error(`Erro ao sincronizar tipos: ${error.message}`);
    }
  });

  return {
    fieldServiceTypes: query.data || [],
    isLoading: query.isLoading,
    isSyncing,
    syncServiceTypes: syncMutation.mutate,
    refetch: query.refetch
  };
}
