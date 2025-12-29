import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PurchaseOrderStatus } from "./usePurchaseOrderStatuses";

export interface PurchaseOrder {
  id: string;
  supplier_cnpj: string | null;
  supplier_name: string | null;
  supplier_address: string | null;
  invoice_number: string | null;
  invoice_series: string | null;
  invoice_date: string | null;
  total_value: number | null;
  status: string | null;
  status_id: string | null;
  xml_url: string | null;
  payment_method: string | null;
  chart_account_id: string | null;
  cost_center_id: string | null;
  financial_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  purchase_order_status?: PurchaseOrderStatus;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  xml_code: string | null;
  xml_description: string | null;
  ncm: string | null;
  cfop: string | null;
  quantity: number;
  unit_price: number | null;
  total_value: number | null;
  created_at: string;
  product?: {
    code: string;
    description: string;
  };
}

export interface PurchaseOrderInsert {
  supplier_cnpj?: string;
  supplier_name?: string;
  supplier_address?: string;
  invoice_number?: string;
  invoice_series?: string;
  invoice_date?: string;
  total_value?: number;
  status?: string;
  status_id?: string;
  xml_url?: string;
  payment_method?: string;
  chart_account_id?: string;
  cost_center_id?: string;
  financial_notes?: string;
}

export interface PurchaseOrderItemInsert {
  purchase_order_id: string;
  product_id?: string;
  xml_code?: string;
  xml_description?: string;
  ncm?: string;
  cfop?: string;
  quantity: number;
  unit_price?: number;
  total_value?: number;
}

export function usePurchaseOrders() {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          purchase_order_status:purchase_order_statuses(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: PurchaseOrderInsert) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
    onError: (error) => {
      toast.error(`Erro ao criar pedido de compra: ${error.message}`);
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseOrderInsert> }) => {
      const { data: result, error } = await supabase
        .from("purchase_orders")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success("Pedido atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar pedido: ${error.message}`);
    },
  });

  const createOrderItems = useMutation({
    mutationFn: async (items: PurchaseOrderItemInsert[]) => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_items"] });
    },
    onError: (error) => {
      toast.error(`Erro ao criar itens do pedido: ${error.message}`);
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status_id }: { id: string; status_id: string }) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({ status_id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const getOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from("purchase_order_items")
      .select(`
        *,
        product:products(code, description)
      `)
      .eq("purchase_order_id", orderId);

    if (error) throw error;
    return data as PurchaseOrderItem[];
  };

  const getOrderById = async (orderId: string) => {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        purchase_order_status:purchase_order_statuses(*)
      `)
      .eq("id", orderId)
      .single();

    if (error) throw error;
    return data as PurchaseOrder;
  };

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    createOrder,
    updateOrder,
    createOrderItems,
    updateOrderStatus,
    getOrderItems,
    getOrderById,
    refetch: ordersQuery.refetch,
  };
}
