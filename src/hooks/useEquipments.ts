import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export interface Equipment {
  id: string;
  company_id: string;
  client_id?: string;
  serial_number: string;
  model?: string;
  brand?: string;
  equipment_type?: string;
  location_description?: string;
  sector?: string;
  environment?: string;
  notes?: string;
  warranty_start?: string;
  warranty_end?: string;
  qr_code?: string;
  is_active: boolean;
  field_equipment_id?: string;
  created_at: string;
  updated_at: string;
}

export function useEquipments(clientId?: string) {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();

  const query = useQuery({
    queryKey: ["equipments", currentCompany?.id, clientId],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      let queryBuilder = supabase
        .from("equipments")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .order("serial_number");

      // Filtrar por cliente se especificado
      if (clientId) {
        queryBuilder = queryBuilder.eq("client_id", clientId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data as Equipment[];
    },
    enabled: !!currentCompany,
  });

  const createEquipment = useMutation({
    mutationFn: async (equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("equipments")
        .insert(equipment)
        .select()
        .single();

      if (error) throw error;
      return data as Equipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
      toast.success("Equipamento cadastrado!");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar equipamento: ${error.message}`);
    },
  });

  const updateEquipment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Equipment> }) => {
      const { data: result, error } = await supabase
        .from("equipments")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as Equipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
      toast.success("Equipamento atualizado!");
    },
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipments")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipments"] });
      toast.success("Equipamento removido!");
    },
  });

  return {
    equipments: query.data ?? [],
    isLoading: query.isLoading,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    refetch: query.refetch,
  };
}

// Hook para buscar todos os equipamentos (sem filtro de cliente)
export function useAllEquipments() {
  const { currentCompany } = useCompany();

  const query = useQuery({
    queryKey: ["all_equipments", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("equipments")
        .select(`
          *,
          client:clientes(id, razao_social, nome_fantasia)
        `)
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .order("serial_number");

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany,
  });

  return {
    equipments: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
