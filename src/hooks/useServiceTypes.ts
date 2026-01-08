import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export interface ServiceType {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  field_service_id?: string;
  field_task_type_id?: string; // ID do tipo de tarefa no Field Control
  default_duration: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useServiceTypes() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();

  const query = useQuery({
    queryKey: ["service_types", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) {
        console.info("[useServiceTypes] ❌ currentCompany is null/undefined");
        return [];
      }
      
      console.info("[useServiceTypes] 🔍 Querying service_types for company_id:", currentCompany.id);
      
      const { data, error, count } = await supabase
        .from("service_types")
        .select("*", { count: "exact" })
        .eq("company_id", currentCompany.id)
        .order("name");

      if (error) {
        console.error("[useServiceTypes] ❌ Query error:", error);
        throw error;
      }
      
      console.info("[useServiceTypes] ✅ Query result - count:", count, "data:", data?.length, "records");
      console.info("[useServiceTypes] 📋 Data sample:", data?.slice(0, 3).map(d => ({ id: d.id, name: d.name, field_task_type_id: d.field_task_type_id })));
      
      return data as ServiceType[];
    },
    enabled: !!currentCompany,
  });

  const createServiceType = useMutation({
    mutationFn: async (serviceType: Omit<ServiceType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("service_types")
        .insert(serviceType)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_types"] });
      toast.success("Tipo de serviço criado!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar tipo de serviço: ${error.message}`);
    },
  });

  const updateServiceType = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceType> }) => {
      const { data: result, error } = await supabase
        .from("service_types")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as ServiceType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_types"] });
      toast.success("Tipo de serviço atualizado!");
    },
  });

  const deleteServiceType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_types"] });
      toast.success("Tipo de serviço excluído!");
    },
  });

  return {
    serviceTypes: query.data ?? [],
    activeServiceTypes: query.data?.filter(s => s.is_active) ?? [],
    isLoading: query.isLoading,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    refetch: query.refetch,
  };
}
