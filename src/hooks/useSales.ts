import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export type StockBehavior = 'none' | 'reserve' | 'move';
export type FinancialBehavior = 'none' | 'forecast' | 'effective';

export interface SaleStatus {
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

export interface SaleProductItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product?: {
    id: string;
    code: string;
    description: string;
    quantity: number;
    sale_price: number;
    unit: string;
    barcode?: string | null;
  };
  details?: string;
  quantity: number;
  unit_price: number;
  discount_value: number;
  discount_type: 'value' | 'percent';
  subtotal: number;
  price_table_id?: string;
}

export interface SaleServiceItem {
  id?: string;
  sale_id?: string;
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
  discount_value: number;
  discount_type: 'value' | 'percent';
  subtotal: number;
}

export interface Sale {
  id: string;
  company_id: string;
  sale_number: number;
  client_id?: string;
  client?: {
    id: string;
    razao_social: string;
    nome_fantasia: string;
    cpf_cnpj: string;
  } | null;
  seller_id?: string;
  status_id?: string;
  status?: SaleStatus | null;
  sale_date: string;
  delivery_date?: string;
  sales_channel: string;
  cost_center_id?: string;
  quote_number?: string;
  os_number?: string;
  os_gc?: string;
  extra_observation?: string;
  freight_value: number;
  carrier?: string;
  delivery_address?: Json;
  products_total: number;
  services_total: number;
  discount_value: number;
  discount_percent: number;
  total_value: number;
  payment_type: string;
  installments: number;
  observations?: string;
  internal_observations?: string;
  tracking_token: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  product_items?: SaleProductItem[];
  service_items?: SaleServiceItem[];
}

export function useSaleStatuses() {
  const queryClient = useQueryClient();

  const statusesQuery = useQuery({
    queryKey: ["sale_statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_statuses")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as SaleStatus[];
    },
  });

  const createStatus = useMutation({
    mutationFn: async (status: Omit<SaleStatus, 'id' | 'created_at' | 'updated_at'>) => {
      if (status.is_default) {
        await supabase
          .from("sale_statuses")
          .update({ is_default: false })
          .eq("company_id", status.company_id);
      }

      const { data, error } = await supabase
        .from("sale_statuses")
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data as SaleStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale_statuses"] });
      toast.success("Status criado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar status: ${error.message}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SaleStatus> }) => {
      const { data: result, error } = await supabase
        .from("sale_statuses")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as SaleStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale_statuses"] });
      toast.success("Status atualizado!");
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sale_statuses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sale_statuses"] });
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

export function useSales() {
  const queryClient = useQueryClient();

  const salesQuery = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          client:clientes(id, razao_social, nome_fantasia, cpf_cnpj),
          status:sale_statuses(*)
        `)
        .order("sale_number", { ascending: false });

      if (error) throw error;
      return data as unknown as Sale[];
    },
  });

  const createSale = useMutation({
    mutationFn: async ({
      sale,
      productItems,
      serviceItems,
      installments = [],
      attachments = []
    }: {
      sale: Record<string, unknown>;
      productItems: Omit<SaleProductItem, 'id' | 'sale_id' | 'product'>[];
      serviceItems: Omit<SaleServiceItem, 'id' | 'sale_id' | 'service'>[];
      installments?: { installment_number: number; due_date: string; amount: number; payment_method: string }[];
      attachments?: { file_name: string; file_url: string; file_size?: number }[];
    }) => {
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert(sale as any)
        .select()
        .single();

      if (saleError) throw saleError;

      if (productItems.length > 0) {
        await supabase.from("sale_product_items").insert(
          productItems.map(item => ({ ...item, sale_id: saleData.id }))
        );
      }

      if (serviceItems.length > 0) {
        await supabase.from("sale_service_items").insert(
          serviceItems.map(item => ({ ...item, sale_id: saleData.id }))
        );
      }

      if (installments.length > 0) {
        await supabase.from("sale_installments").insert(
          installments.map(item => ({ ...item, sale_id: saleData.id }))
        );
      }

      if (attachments.length > 0) {
        await supabase.from("sale_attachments").insert(
          attachments.map(item => ({ ...item, sale_id: saleData.id }))
        );
      }

      return saleData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda criada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar venda: ${error.message}`);
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, sale }: { id: string; sale: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("sales")
        .update(sale as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda atualizada!");
    },
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda excluída!");
    },
  });

  return {
    sales: salesQuery.data ?? [],
    isLoading: salesQuery.isLoading,
    createSale,
    updateSale,
    deleteSale,
    refetch: salesQuery.refetch,
  };
}

export function useInTransitStock(productId: string) {
  return useQuery({
    queryKey: ["in_transit_stock", productId],
    queryFn: async () => {
      if (!productId) return { quantity: 0, nextArrivalDate: null };

      const { data, error } = await supabase
        .from("purchase_order_items")
        .select(`
          quantity, 
          purchase_order:purchase_orders(
            id,
            invoice_date, 
            status,
            status_id,
            purchase_status:purchase_order_statuses(stock_behavior)
          )
        `)
        .eq("product_id", productId);

      if (error || !data) return { quantity: 0, nextArrivalDate: null };

      // Filtrar apenas pedidos que ainda não deram entrada no estoque
      // Considera pendentes aqueles cujo status não é "finalizado", "concluido" ou "cancelado"
      // ou cujo stock_behavior não é "move"
      const pendingItems = data.filter((item: any) => {
        const status = item.purchase_order?.status?.toLowerCase() || '';
        const stockBehavior = item.purchase_order?.purchase_status?.stock_behavior;
        
        // Se tem status configurado com comportamento de estoque, usa ele
        if (stockBehavior) {
          return stockBehavior !== 'move'; // Ainda não moveu para o estoque
        }
        
        // Senão, filtra por status textual
        const finishedStatuses = ['finalizado', 'concluido', 'concluído', 'cancelado'];
        return !finishedStatuses.includes(status);
      });

      const totalInTransit = pendingItems.reduce((sum: number, item: any) => 
        sum + Number(item.quantity || 0), 0
      );

      const nextArrival = pendingItems
        .map((item: any) => item.purchase_order?.invoice_date)
        .filter(Boolean)
        .sort()[0] || null;

      return { quantity: totalInTransit, nextArrivalDate: nextArrival };
    },
    enabled: !!productId
  });
}
