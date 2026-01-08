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

      console.info("[syncServiceTypes] 🚀 Starting sync for company_id:", currentCompany.id);
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('field-service-types', {
        body: { company_id: currentCompany.id, sync: true }
      });

      console.info("[syncServiceTypes] 📦 Edge function response:", { data, error });

      if (error) throw error;
      
      // Verificar o que foi salvo na tabela após o sync
      console.info("[syncServiceTypes] 🔍 Verifying data in service_types table...");
      const { data: verifyData, count, error: verifyError } = await supabase
        .from("service_types")
        .select("*", { count: "exact" })
        .eq("company_id", currentCompany.id);
      
      console.info("[syncServiceTypes] ✅ Post-sync verification - count:", count, "error:", verifyError);
      console.info("[syncServiceTypes] 📋 Records in DB:", verifyData?.map(d => ({ name: d.name, field_task_type_id: d.field_task_type_id })));
      
      return { ...data, verifiedCount: count };
    },
    onSuccess: (data) => {
      setIsSyncing(false);
      // Invalidar com queryKey EXATA para garantir que o cache é limpo
      console.info("[syncServiceTypes] 🔄 Invalidating cache for company_id:", currentCompany?.id);
      queryClient.invalidateQueries({ queryKey: ['service_types', currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ['field-service-types', currentCompany?.id] });
      // Também invalidar todas as queries que começam com service_types (fallback)
      queryClient.invalidateQueries({ queryKey: ['service_types'], exact: false });
      console.info("[syncServiceTypes] ✅ Sync complete - synced:", data?.synced, "verified in DB:", data?.verifiedCount);
      toast.success(`${data?.synced || 0} tipos sincronizados (${data?.verifiedCount || 0} verificados no banco)`);
    },
    onError: (error) => {
      setIsSyncing(false);
      console.error("[syncServiceTypes] ❌ Sync error:", error);
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
