import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PurchaseOrderStatus } from "./usePurchaseOrderStatuses";
import { Supplier } from "./useSuppliers";
import { useCompany } from "@/contexts/CompanyContext";

export interface PurchaseOrder {
  id: string;
  order_number: number;
  supplier_id: string | null;
  supplier_cnpj: string | null;
  supplier_name: string | null;
  supplier_address: string | null;
  requester_id: string | null;
  purpose: "estoque" | "ordem_de_servico" | "despesa_operacional" | "garantia";
  observations: string | null;
  freight_value: number;
  has_external_freight: boolean;
  // NF-e fields
  nfe_xml_url: string | null;
  nfe_key: string | null;
  nfe_number: string | null;
  nfe_series: string | null;
  nfe_date: string | null;
  nfe_imported_at: string | null;
  nfe_supplier_cnpj: string | null;
  nfe_supplier_name: string | null;
  nfe_cfop_saida: string | null;
  nfe_natureza_operacao: string | null; // Ex: "Venda", "Remessa em garantia"
  // CT-e fields
  cte_xml_url: string | null;
  cte_key: string | null;
  cte_number: string | null;
  cte_carrier_id: string | null;
  cte_freight_value: number;
  cte_date: string | null;
  cte_imported_at: string | null;
  // Approval
  requires_reapproval: boolean;
  reapproval_reason: string | null;
  // Status
  status: string | null;
  status_id: string | null;
  receipt_status: "pending" | "partial" | "complete";
  receipt_date: string | null;
  // Financial & Stock
  financial_generated: boolean;
  financial_generated_at: string | null;
  stock_entry_done: boolean;
  stock_entry_done_at: string | null;
  // Legacy fields
  invoice_number: string | null;
  invoice_series: string | null;
  invoice_date: string | null;
  total_value: number | null;
  xml_url: string | null;
  payment_method: string | null;
  chart_account_id: string | null;
  cost_center_id: string | null;
  financial_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Relations
  purchase_order_status?: PurchaseOrderStatus;
  supplier?: Supplier;
  cte_carrier?: Supplier;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  xml_code: string | null;
  xml_description: string | null;
  description: string | null;
  ncm: string | null;
  cfop: string | null;
  quantity: number;
  unit_price: number | null;
  total_value: number | null;
  chart_account_id: string | null;
  cost_center_id: string | null;
  // NF-e comparison
  nfe_quantity: number | null;
  nfe_unit_price: number | null;
  nfe_total_value: number | null;
  has_divergence: boolean;
  divergence_details: any | null;
  // Receipt
  quantity_received: number;
  freight_allocated: number;
  final_unit_cost: number;
  created_at: string;
  product?: {
    code: string;
    description: string;
  };
}

export interface PurchaseOrderDivergence {
  id: string;
  purchase_order_id: string;
  item_id: string | null;
  divergence_type: string;
  field_name: string | null;
  expected_value: string | null;
  actual_value: string | null;
  difference: number | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface PurchaseOrderInsert {
  supplier_id?: string;
  supplier_cnpj?: string;
  supplier_name?: string;
  supplier_address?: string;
  requester_id?: string;
  purpose?: "estoque" | "ordem_de_servico" | "despesa_operacional" | "garantia";
  observations?: string;
  freight_value?: number;
  has_external_freight?: boolean;
  nfe_xml_url?: string;
  nfe_key?: string;
  nfe_number?: string;
  nfe_series?: string;
  nfe_date?: string;
  nfe_imported_at?: string;
  cte_xml_url?: string;
  cte_key?: string;
  cte_number?: string;
  cte_carrier_id?: string;
  cte_freight_value?: number;
  cte_date?: string;
  cte_imported_at?: string;
  requires_reapproval?: boolean;
  reapproval_reason?: string;
  status?: string;
  status_id?: string;
  receipt_status?: "pending" | "partial" | "complete";
  receipt_date?: string;
  financial_generated?: boolean;
  financial_generated_at?: string;
  stock_entry_done?: boolean;
  stock_entry_done_at?: string;
  invoice_number?: string;
  invoice_series?: string;
  invoice_date?: string;
  total_value?: number;
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
  description?: string;
  ncm?: string;
  cfop?: string;
  quantity: number;
  unit_price?: number;
  total_value?: number;
  chart_account_id?: string;
  cost_center_id?: string;
  nfe_quantity?: number;
  nfe_unit_price?: number;
  nfe_total_value?: number;
  has_divergence?: boolean;
  divergence_details?: any;
  quantity_received?: number;
  freight_allocated?: number;
  final_unit_cost?: number;
}

export function usePurchaseOrders() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();

  const ordersQuery = useQuery({
    queryKey: ["purchase_orders", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          purchase_order_status:purchase_order_statuses(*),
          supplier:pessoas!purchase_orders_supplier_id_fkey(*)
        `)
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PurchaseOrder[];
    },
    enabled: !!currentCompany?.id,
  });

  const createOrder = useMutation({
    mutationFn: async (order: PurchaseOrderInsert & { generatePayable?: boolean; dueDate?: string }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { generatePayable, dueDate, ...orderData } = order;
      
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert({ ...orderData, company_id: currentCompany.id })
        .select()
        .single();

      if (error) throw error;

      // Generate payable as forecast if supplier and total > 0
      if (generatePayable && orderData.supplier_id && orderData.total_value && orderData.total_value > 0) {
        const { error: payableError } = await supabase
          .from("payables")
          .insert({
            company_id: currentCompany.id,
            supplier_id: orderData.supplier_id,
            purchase_order_id: data.id,
            amount: orderData.total_value,
            due_date: dueDate || new Date().toISOString().split('T')[0],
            document_type: "pedido_compra",
            document_number: data.order_number?.toString(),
            description: `Pedido de Compra #${data.order_number}`,
            chart_account_id: orderData.chart_account_id,
            cost_center_id: orderData.cost_center_id,
            is_forecast: true,
          });

        if (payableError) {
          console.error("Erro ao criar previsão financeira:", payableError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Pedido de compra criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar pedido de compra: ${error.message}`);
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ 
      id, 
      data, 
      updatePayable,
      dueDate 
    }: { 
      id: string; 
      data: Partial<PurchaseOrderInsert>; 
      updatePayable?: boolean;
      dueDate?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("purchase_orders")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update or create payable if total value changed
      if (updatePayable && data.supplier_id) {
        // Check if payable exists
        const { data: existingPayable } = await supabase
          .from("payables")
          .select("id")
          .eq("purchase_order_id", id)
          .maybeSingle();

        if (existingPayable) {
          // Update existing payable
          await supabase
            .from("payables")
            .update({
              amount: data.total_value || 0,
              supplier_id: data.supplier_id,
              chart_account_id: data.chart_account_id,
              cost_center_id: data.cost_center_id,
              due_date: dueDate,
            })
            .eq("id", existingPayable.id);
        } else if (data.total_value && data.total_value > 0 && currentCompany?.id) {
          // Create new payable
          await supabase
            .from("payables")
            .insert({
              company_id: currentCompany.id,
              supplier_id: data.supplier_id,
              purchase_order_id: id,
              amount: data.total_value,
              due_date: dueDate || new Date().toISOString().split('T')[0],
              document_type: "pedido_compra",
              document_number: result.order_number?.toString(),
              description: `Pedido de Compra #${result.order_number}`,
              chart_account_id: data.chart_account_id,
              cost_center_id: data.cost_center_id,
              is_forecast: true,
            });
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Pedido atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar pedido: ${error.message}`);
    },
  });

  const createOrderItems = useMutation({
    mutationFn: async (items: PurchaseOrderItemInsert[]) => {
      if (!currentCompany) throw new Error("Nenhuma empresa selecionada");
      
      // Adicionar company_id a cada item
      const itemsWithCompany = items.map(item => ({
        ...item,
        company_id: currentCompany.id,
      }));
      
      const { data, error } = await supabase
        .from("purchase_order_items")
        .insert(itemsWithCompany)
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

  const updateOrderItems = useMutation({
    mutationFn: async (items: { id: string; data: Partial<PurchaseOrderItemInsert> }[]) => {
      const promises = items.map(({ id, data }) =>
        supabase
          .from("purchase_order_items")
          .update(data)
          .eq("id", id)
      );
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_items"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar itens: ${error.message}`);
    },
  });

  const deleteOrderItems = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_items"] });
    },
    onError: (error) => {
      toast.error(`Erro ao excluir itens: ${error.message}`);
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status_id, convertForecast }: { id: string; status_id: string; convertForecast?: boolean }) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({ status_id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Convert forecast to effective payable if status behavior is "gerar"
      if (convertForecast) {
        await supabase
          .from("payables")
          .update({
            is_forecast: false,
            forecast_converted_at: new Date().toISOString(),
          })
          .eq("purchase_order_id", id)
          .eq("is_forecast", true);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const markForReapproval = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({
          requires_reapproval: true,
          reapproval_reason: reason,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", currentCompany?.id] });
      toast.warning("Pedido marcado para reaprovação!");
    },
    onError: (error) => {
      toast.error(`Erro ao marcar para reaprovação: ${error.message}`);
    },
  });

  const clearReapproval = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .update({
          requires_reapproval: false,
          reapproval_reason: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", currentCompany?.id] });
      toast.success("Reaprovação concedida!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
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
        purchase_order_status:purchase_order_statuses(*),
        supplier:pessoas!purchase_orders_supplier_id_fkey(*),
        cte_carrier:pessoas!purchase_orders_cte_carrier_id_fkey(*)
      `)
      .eq("id", orderId)
      .single();

    if (error) throw error;
    return data as unknown as PurchaseOrder;
  };

  const getOrderDivergences = async (orderId: string) => {
    const { data, error } = await supabase
      .from("purchase_order_divergences")
      .select("*")
      .eq("purchase_order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as PurchaseOrderDivergence[];
  };

  const createDivergences = useMutation({
    mutationFn: async (divergences: Omit<PurchaseOrderDivergence, "id" | "created_at">[]) => {
      const { data, error } = await supabase
        .from("purchase_order_divergences")
        .insert(divergences)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_divergences"] });
    },
  });

  const resolveDivergence = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data, error } = await supabase
        .from("purchase_order_divergences")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_divergences"] });
      toast.success("Divergência resolvida!");
    },
  });

  // Check if order can be deleted (no confirmed financial records)
  const canDeleteOrder = async (orderId: string): Promise<{ canDelete: boolean; reason?: string }> => {
    // Check if there are any payables that are paid or have confirmed status
    const { data: payables, error } = await supabase
      .from("payables")
      .select("id, is_paid, financial_situation_id, financial_situations(confirms_payment)")
      .eq("purchase_order_id", orderId);

    if (error) {
      console.error("Erro ao verificar payables:", error);
      return { canDelete: false, reason: "Erro ao verificar registros financeiros" };
    }

    if (payables && payables.length > 0) {
      // Check if any payable is paid
      const paidPayable = payables.find(p => p.is_paid);
      if (paidPayable) {
        return { canDelete: false, reason: "Pedido possui título financeiro já pago" };
      }

      // Check if any payable has confirmed payment status
      const confirmedPayable = payables.find(p => {
        const situation = p.financial_situations as any;
        return situation?.confirms_payment === true;
      });
      if (confirmedPayable) {
        return { canDelete: false, reason: "Pedido possui título financeiro confirmado" };
      }
    }

    return { canDelete: true };
  };

  const deleteOrder = useMutation({
    mutationFn: async (orderId: string) => {
      // Verify if can delete
      const check = await canDeleteOrder(orderId);
      if (!check.canDelete) {
        throw new Error(check.reason || "Não é possível excluir este pedido");
      }

      // Delete related payables first (only forecasts/non-confirmed)
      const { error: payableError } = await supabase
        .from("payables")
        .delete()
        .eq("purchase_order_id", orderId)
        .eq("is_paid", false);

      if (payableError) {
        console.error("Erro ao excluir payables:", payableError);
      }

      // Delete order items
      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", orderId);

      if (itemsError) {
        console.error("Erro ao excluir itens:", itemsError);
      }

      // Delete divergences
      const { error: divError } = await supabase
        .from("purchase_order_divergences")
        .delete()
        .eq("purchase_order_id", orderId);

      if (divError) {
        console.error("Erro ao excluir divergências:", divError);
      }

      // Delete the order
      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders", currentCompany?.id] });
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      toast.success("Pedido excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir pedido: ${error.message}`);
    },
  });

  // Gerenciar parcelas do pedido
  const getOrderInstallments = async (orderId: string) => {
    const { data, error } = await supabase
      .from("purchase_order_installments")
      .select("*")
      .eq("purchase_order_id", orderId)
      .order("installment_number", { ascending: true });
    
    if (error) throw error;
    return data || [];
  };

  const createOrderInstallments = useMutation({
    mutationFn: async (installments: {
      purchase_order_id: string;
      installment_number: number;
      due_date: string;
      amount: number;
      source?: string;
      nfe_original_date?: string;
      nfe_original_amount?: number;
    }[]) => {
      if (installments.length === 0) return [];
      
      const { data, error } = await supabase
        .from("purchase_order_installments")
        .insert(installments)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_installments"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar parcelas: ${error.message}`);
    },
  });

  const deleteOrderInstallments = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("purchase_order_installments")
        .delete()
        .eq("purchase_order_id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_order_installments"] });
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    createOrder,
    updateOrder,
    createOrderItems,
    updateOrderItems,
    deleteOrderItems,
    updateOrderStatus,
    markForReapproval,
    clearReapproval,
    deleteOrder,
    canDeleteOrder,
    getOrderItems,
    getOrderById,
    getOrderDivergences,
    createDivergences,
    resolveDivergence,
    getOrderInstallments,
    createOrderInstallments,
    deleteOrderInstallments,
    refetch: ordersQuery.refetch,
  };
}
