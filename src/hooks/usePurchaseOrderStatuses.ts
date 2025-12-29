import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StockBehavior = 'none' | 'entry' | 'forecast';
export type FinancialBehavior = 'none' | 'payable' | 'forecast';

export interface PurchaseOrderStatus {
  id: string;
  company_id: string;
  name: string;
  color: string;
  is_default: boolean;
  stock_behavior: StockBehavior;
  financial_behavior: FinancialBehavior;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderStatusInsert {
  company_id: string;
  name: string;
  color?: string;
  is_default?: boolean;
  stock_behavior: StockBehavior;
  financial_behavior: FinancialBehavior;
  display_order?: number;
  is_active?: boolean;
}

export interface PurchaseOrderStatusUpdate {
  name?: string;
  color?: string;
  is_default?: boolean;
  stock_behavior?: StockBehavior;
  financial_behavior?: FinancialBehavior;
  display_order?: number;
  is_active?: boolean;
}

export function usePurchaseOrderStatuses() {
  const queryClient = useQueryClient();

  const statusesQuery = useQuery({
    queryKey: ["purchase_order_statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_statuses")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PurchaseOrderStatus[];
    },
  });

  const createStatus = useMutation({
    mutationFn: async (status: PurchaseOrderStatusInsert) => {
      // Se for default, remover default dos outros
      if (status.is_default) {
        await supabase
          .from("purchase_order_statuses")
          .update({ is_default: false })
          .eq("company_id", status.company_id);
      }

      const { data, error } = await supabase
        .from("purchase_order_statuses")
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data as PurchaseOrderStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_statuses"] });
      toast.success("Status criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar status: ${error.message}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PurchaseOrderStatusUpdate }) => {
      // Se for default, remover default dos outros
      if (data.is_default) {
        const status = statusesQuery.data?.find(s => s.id === id);
        if (status) {
          await supabase
            .from("purchase_order_statuses")
            .update({ is_default: false })
            .eq("company_id", status.company_id)
            .neq("id", id);
        }
      }

      const { data: result, error } = await supabase
        .from("purchase_order_statuses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as PurchaseOrderStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_statuses"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_order_statuses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_statuses"] });
      toast.success("Status excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir status: ${error.message}`);
    },
  });

  const getActiveStatuses = () => {
    return statusesQuery.data?.filter(s => s.is_active) ?? [];
  };

  const getDefaultStatus = () => {
    return statusesQuery.data?.find(s => s.is_default && s.is_active);
  };

  return {
    statuses: statusesQuery.data ?? [],
    isLoading: statusesQuery.isLoading,
    error: statusesQuery.error,
    createStatus,
    updateStatus,
    deleteStatus,
    getActiveStatuses,
    getDefaultStatus,
    refetch: statusesQuery.refetch,
  };
}
