import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuditLog } from "./useAuditLog";

export type StockBehavior = 'none' | 'reserve';
export type FinancialBehavior = 'none' | 'forecast' | 'effective';
export type CheckoutBehavior = 'none' | 'required';

export interface ServiceOrderStatus {
  id: string;
  company_id: string;
  name: string;
  color: string;
  is_default: boolean;
  stock_behavior: StockBehavior;
  financial_behavior: FinancialBehavior;
  checkout_behavior: CheckoutBehavior;
  display_order: number;
  is_active: boolean;
  opens_field_activity: boolean; // Novo campo
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderProductItem {
  id?: string;
  service_order_id?: string;
  product_id: string;
  product?: {
    id: string;
    code: string;
    description: string;
    quantity: number;
    sale_price: number;
    purchase_price: number;
    unit: string;
    barcode?: string | null;
  };
  details?: string;
  quantity: number;
  unit_price: number | null;
  purchase_price: number;
  discount_value: number | null;
  discount_type: 'value' | 'percent';
  subtotal: number;
  price_table_id?: string;
}

export interface ServiceOrderServiceItem {
  id?: string;
  service_order_id?: string;
  service_id?: string;
  service?: {
    id: string;
    code: string;
    description: string;
    unit: string;
    sale_price: number;
  };
  service_description: string;
  details?: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount_value: number;
  discount_type: 'value' | 'percent';
  subtotal: number;
}

export interface ServiceOrder {
  id: string;
  company_id: string;
  order_number: number;
  client_id?: string;
  client?: {
    id: string;
    razao_social: string;
    nome_fantasia: string;
    cpf_cnpj: string;
  } | null;
  seller_id?: string;
  technician_id?: string;
  status_id?: string;
  status?: ServiceOrderStatus | null;
  order_date: string;
  delivery_date?: string;
  sales_channel: string;
  cost_center_id?: string;
  
  // Equipamento
  equipment_type?: string;
  equipment_brand?: string;
  equipment_model?: string;
  equipment_serial?: string;
  reported_issue?: string;
  diagnosis?: string;
  solution?: string;
  
  // Datas de execução
  started_at?: string;
  finished_at?: string;
  warranty_until?: string;
  
  // Custos
  labor_cost: number;
  parts_cost: number;
  external_service_cost: number;
  total_cost: number;
  
  // Valores
  freight_value: number;
  carrier?: string;
  delivery_address?: Json;
  products_total: number;
  services_total: number;
  discount_value: number;
  discount_percent: number;
  total_value: number;
  
  // Pagamento
  payment_type: string;
  installments: number;
  
  // Observações
  observations?: string;
  internal_observations?: string;
  
  // Checkout
  checkout_status: string;
  tracking_token: string;
  
  // Field Control Integration
  scheduled_time?: string;
  estimated_duration?: number;
  field_order_id?: string;
  field_task_id?: string;
  field_synced_at?: string;
  field_sync_status?: 'pending' | 'synced' | 'error';
  field_technicians?: Array<{
    id: string | number;
    name: string;
    email?: string;
    phone?: string;
  }>;
  service_type_id?: string;
  equipment_id?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  product_items?: ServiceOrderProductItem[];
  service_items?: ServiceOrderServiceItem[];
}

export function useServiceOrderStatuses() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();

  const statusesQuery = useQuery({
    queryKey: ["service_order_statuses", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("service_order_statuses")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ServiceOrderStatus[];
    },
    enabled: !!currentCompany,
  });

  const createStatus = useMutation({
    mutationFn: async (status: Omit<ServiceOrderStatus, 'id' | 'created_at' | 'updated_at'>) => {
      if (status.is_default) {
        await supabase
          .from("service_order_statuses")
          .update({ is_default: false })
          .eq("company_id", status.company_id);
      }

      const { data, error } = await supabase
        .from("service_order_statuses")
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data as ServiceOrderStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_order_statuses"] });
      toast.success("Status criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar status: ${error.message}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServiceOrderStatus> }) => {
      const { data: result, error } = await supabase
        .from("service_order_statuses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as ServiceOrderStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_order_statuses"] });
      toast.success("Status atualizado!");
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("service_order_statuses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_order_statuses"] });
      toast.success("Status excluído!");
    },
  });

  return {
    statuses: statusesQuery.data ?? [],
    isLoading: statusesQuery.isLoading,
    createStatus,
    updateStatus,
    deleteStatus,
    getActiveStatuses: () => statusesQuery.data?.filter(s => s.is_active) ?? [],
    getDefaultStatus: () => statusesQuery.data?.find(s => s.is_default && s.is_active),
    refetch: statusesQuery.refetch,
  };
}

export function useServiceOrders() {
  const queryClient = useQueryClient();
  const { logEvent } = useAuditLog();

  const ordersQuery = useQuery({
    queryKey: ["service_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          *,
          client:pessoas!service_orders_client_id_fkey(id, razao_social, nome_fantasia, cpf_cnpj),
          status:service_order_statuses(*)
        `)
        .order("order_number", { ascending: false });

      if (error) throw error;
      return data as unknown as ServiceOrder[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async ({
      order,
      productItems,
      serviceItems,
      installments = [],
      attachments = []
    }: {
      order: Record<string, unknown>;
      productItems: Omit<ServiceOrderProductItem, 'id' | 'service_order_id' | 'product'>[];
      serviceItems: Omit<ServiceOrderServiceItem, 'id' | 'service_order_id' | 'service'>[];
      installments?: { installment_number: number; due_date: string; amount: number; payment_method: string }[];
      attachments?: { file_name: string; file_url: string; file_size?: number }[];
    }) => {
      const { data: orderData, error: orderError } = await supabase
        .from("service_orders")
        .insert(order as any)
        .select()
        .single();

      if (orderError) throw orderError;

      if (productItems.length > 0) {
        await supabase.from("service_order_product_items").insert(
          productItems.map(item => ({ ...item, service_order_id: orderData.id }))
        );
      }

      if (serviceItems.length > 0) {
        await supabase.from("service_order_service_items").insert(
          serviceItems.map(item => ({ ...item, service_order_id: orderData.id }))
        );
      }

      if (installments.length > 0) {
        await supabase.from("service_order_installments").insert(
          installments.map(item => ({ ...item, service_order_id: orderData.id }))
        );
      }

      if (attachments.length > 0) {
        await supabase.from("service_order_attachments").insert(
          attachments.map(item => ({ ...item, service_order_id: orderData.id }))
        );
      }

      return orderData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      toast.success("Ordem de serviço criada com sucesso!");
      logEvent({ eventType: "service_order.created", entityType: "service_order", entityId: data.id });
    },
    onError: (error) => {
      toast.error(`Erro ao criar OS: ${error.message}`);
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, order }: { id: string; order: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("service_orders")
        .update(order as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      toast.success("OS atualizada!");
      logEvent({ eventType: "service_order.updated", entityType: "service_order", entityId: data.id });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      toast.success("OS excluída!");
    },
  });

  // Sincronizar OS com Field Control
  const syncWithField = useMutation({
    mutationFn: async ({ serviceOrderId, companyId }: { serviceOrderId: string; companyId: string }) => {
      const { data, error } = await supabase.functions.invoke('field-sync-activity', {
        body: { service_order_id: serviceOrderId, company_id: companyId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      toast.success(data?.message || "OS sincronizada com Field Control!");
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar com Field: ${error.message}`);
    },
  });

  // Atualizar status e sincronizar automaticamente se o status estiver configurado para abrir no Field
  const updateStatusWithFieldSync = useMutation({
    mutationFn: async ({ 
      id, 
      statusId, 
      opensFieldActivity,
      companyId 
    }: { 
      id: string; 
      statusId: string;
      opensFieldActivity: boolean;
      companyId: string;
    }) => {
      // Verificar se a OS já foi sincronizada antes
      const { data: currentOrder } = await supabase
        .from("service_orders")
        .select("field_order_id")
        .eq("id", id)
        .single();

      // Atualizar o status
      const { data, error } = await supabase
        .from("service_orders")
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Se o status abre atividade no Field E a OS ainda não foi sincronizada
      if (opensFieldActivity && !currentOrder?.field_order_id) {
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('field-sync-activity', {
            body: { service_order_id: id, company_id: companyId }
          });
          
          if (syncError) {
            console.error('Erro ao sincronizar com Field:', syncError);
            toast.warning('Status atualizado, mas houve erro na sincronização com Field Control');
          } else if (syncResult?.error) {
            console.error('Erro ao sincronizar com Field:', syncResult.error);
            toast.warning(`Status atualizado. Field: ${syncResult.error}`);
          } else {
            toast.success('Status atualizado e OS enviada para o Field Control!');
          }
        } catch (syncErr) {
          console.error('Erro ao sincronizar com Field:', syncErr);
          toast.warning('Status atualizado, mas houve erro na sincronização com Field Control');
        }
      } else if (opensFieldActivity && currentOrder?.field_order_id) {
        toast.info('Status atualizado. OS já foi sincronizada anteriormente com Field Control.');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    createOrder,
    updateOrder,
    deleteOrder,
    syncWithField,
    updateStatusWithFieldSync,
    refetch: ordersQuery.refetch,
  };
}
