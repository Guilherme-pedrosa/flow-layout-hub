import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Service {
  id: string;
  company_id: string;
  code: string;
  description: string;
  unit: string;
  sale_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceTable {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceTableItem {
  id: string;
  price_table_id: string;
  product_id?: string;
  service_id?: string;
  custom_price: number;
  created_at: string;
}

export function useServices() {
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("description", { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
  });

  const createService = useMutation({
    mutationFn: async (service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("services")
        .insert(service)
        .select()
        .single();

      if (error) throw error;
      return data as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar serviço: ${error.message}`);
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Service> }) => {
      const { data: result, error } = await supabase
        .from("services")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço atualizado!");
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Serviço excluído!");
    },
  });

  return {
    services: servicesQuery.data ?? [],
    isLoading: servicesQuery.isLoading,
    createService,
    updateService,
    deleteService,
    refetch: servicesQuery.refetch,
  };
}

export function usePriceTables() {
  const queryClient = useQueryClient();

  const priceTablesQuery = useQuery({
    queryKey: ["price_tables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_tables")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as PriceTable[];
    },
  });

  return {
    priceTables: priceTablesQuery.data ?? [],
    isLoading: priceTablesQuery.isLoading,
    refetch: priceTablesQuery.refetch,
  };
}

export function useSystemUsers() {
  return useQuery({
    queryKey: ["system_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
