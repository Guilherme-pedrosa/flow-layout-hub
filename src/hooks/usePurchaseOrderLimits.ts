import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PurchaseOrderLimit {
  id: string;
  company_id: string;
  user_id: string | null;
  max_per_transaction: number | null;
  max_monthly_total: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface PurchaseOrderLimitInsert {
  company_id: string;
  user_id?: string | null;
  max_per_transaction?: number | null;
  max_monthly_total?: number | null;
  is_active?: boolean;
}

export interface PurchaseOrderLimitUpdate {
  max_per_transaction?: number | null;
  max_monthly_total?: number | null;
  is_active?: boolean;
}

export function usePurchaseOrderLimits() {
  const queryClient = useQueryClient();

  const limitsQuery = useQuery({
    queryKey: ["purchase-order-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_limits")
        .select(`
          *,
          user:users(id, name, email)
        `)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as PurchaseOrderLimit[];
    },
  });

  const createLimit = useMutation({
    mutationFn: async (data: PurchaseOrderLimitInsert) => {
      const { data: result, error } = await supabase
        .from("purchase_order_limits")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order-limits"] });
      toast.success("Limite criado com sucesso");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Já existe um limite configurado para este usuário");
      } else {
        toast.error("Erro ao criar limite: " + error.message);
      }
    },
  });

  const updateLimit = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PurchaseOrderLimitUpdate }) => {
      const { data: result, error } = await supabase
        .from("purchase_order_limits")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order-limits"] });
      toast.success("Limite atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar limite: " + error.message);
    },
  });

  const deleteLimit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_order_limits")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-order-limits"] });
      toast.success("Limite excluído com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir limite: " + error.message);
    },
  });

  // Função para verificar se um pedido ultrapassa os limites
  const checkOrderLimits = async (
    companyId: string,
    userId: string | null,
    orderValue: number,
    currentOrderId?: string
  ): Promise<{ allowed: boolean; message?: string }> => {
    // Buscar limites aplicáveis (específico do usuário ou global)
    const { data: limits } = await supabase
      .from("purchase_order_limits")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .or(`user_id.eq.${userId},user_id.is.null`);

    if (!limits || limits.length === 0) {
      return { allowed: true };
    }

    // Pegar o limite mais específico (usuário > global)
    const userLimit = limits.find((l) => l.user_id === userId);
    const globalLimit = limits.find((l) => l.user_id === null);
    const applicableLimit = userLimit || globalLimit;

    if (!applicableLimit) {
      return { allowed: true };
    }

    // Verificar limite por transação
    if (applicableLimit.max_per_transaction && orderValue > applicableLimit.max_per_transaction) {
      return {
        allowed: false,
        message: `Valor do pedido (R$ ${orderValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) excede o limite por transação de R$ ${applicableLimit.max_per_transaction.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      };
    }

    // Verificar limite mensal
    if (applicableLimit.max_monthly_total) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      let query = supabase
        .from("purchase_orders")
        .select("total_value")
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      // Se estiver editando um pedido, excluir ele da soma
      if (currentOrderId) {
        query = query.neq("id", currentOrderId);
      }

      // Se tiver userId, filtrar por usuário
      if (userId) {
        query = query.eq("created_by", userId);
      }

      const { data: orders } = await query;

      const monthlyTotal = (orders || []).reduce(
        (sum, order) => sum + (order.total_value || 0),
        0
      );

      if (monthlyTotal + orderValue > applicableLimit.max_monthly_total) {
        const remaining = Math.max(0, applicableLimit.max_monthly_total - monthlyTotal);
        return {
          allowed: false,
          message: `Total mensal (R$ ${(monthlyTotal + orderValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) excederia o limite de R$ ${applicableLimit.max_monthly_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Valor disponível: R$ ${remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        };
      }
    }

    return { allowed: true };
  };

  // Função para obter o resumo de uso mensal
  const getMonthlyUsage = async (
    companyId: string,
    userId: string | null
  ): Promise<{ used: number; limit: number | null }> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    let query = supabase
      .from("purchase_orders")
      .select("total_value")
      .gte("created_at", startOfMonth)
      .lte("created_at", endOfMonth);

    if (userId) {
      query = query.eq("created_by", userId);
    }

    const { data: orders } = await query;
    const used = (orders || []).reduce((sum, order) => sum + (order.total_value || 0), 0);

    // Buscar limite
    const { data: limits } = await supabase
      .from("purchase_order_limits")
      .select("max_monthly_total, user_id")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .or(`user_id.eq.${userId},user_id.is.null`);

    const userLimit = limits?.find((l) => l.user_id === userId);
    const globalLimit = limits?.find((l) => l.user_id === null);
    const applicableLimit = userLimit || globalLimit;

    return {
      used,
      limit: applicableLimit?.max_monthly_total || null,
    };
  };

  return {
    limits: limitsQuery.data || [],
    isLoading: limitsQuery.isLoading,
    createLimit,
    updateLimit,
    deleteLimit,
    checkOrderLimits,
    getMonthlyUsage,
  };
}
