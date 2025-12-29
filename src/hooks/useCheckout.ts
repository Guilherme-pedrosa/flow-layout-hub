import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CheckoutSourceType = 'venda' | 'os';

export interface CheckoutItem {
  id: string;
  sale_product_item_id?: string;
  service_order_product_item_id?: string;
  product_id: string;
  product_code: string;
  product_description: string;
  product_barcode: string | null;
  quantity_total: number;
  quantity_checked: number;
  quantity_pending: number;
  stock_available: number;
}

export interface CheckoutSource {
  id: string;
  type: CheckoutSourceType;
  number: number;
  client_name: string | null;
  client_cpf_cnpj: string | null;
  tracking_token: string;
  checkout_status: string;
  total_value: number;
  created_at: string;
  items: CheckoutItem[];
}

export function useCheckout() {
  const queryClient = useQueryClient();

  // Busca vendas pendentes de checkout
  const salesPendingQuery = useQuery({
    queryKey: ["checkout", "sales_pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, sale_number, tracking_token, checkout_status, total_value, created_at,
          client:clientes(id, razao_social, nome_fantasia, cpf_cnpj),
          status:sale_statuses(checkout_behavior)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filtra vendas que:
      // 1. Têm status com checkout_behavior = 'required'
      // 2. E checkout_status não está 'completed'
      return (data || []).filter(s => 
        s.status?.checkout_behavior === 'required' && 
        s.checkout_status !== 'completed'
      );
    },
  });

  // Busca OS pendentes de checkout
  const osPendingQuery = useQuery({
    queryKey: ["checkout", "os_pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          id, order_number, tracking_token, checkout_status, total_value, created_at,
          client:pessoas!service_orders_client_id_fkey(id, razao_social, nome_fantasia, cpf_cnpj),
          status:service_order_statuses(checkout_behavior)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filtra OS que:
      // 1. Têm status com checkout_behavior = 'required'
      // 2. E checkout_status não está 'completed'
      return (data || []).filter(s => 
        s.status?.checkout_behavior === 'required' && 
        s.checkout_status !== 'completed'
      );
    },
  });

  // Busca detalhes de uma venda para checkout
  const getSaleCheckoutDetails = async (saleId: string): Promise<CheckoutSource | null> => {
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select(`
        id, sale_number, tracking_token, checkout_status, total_value, created_at,
        client:clientes(id, razao_social, nome_fantasia, cpf_cnpj)
      `)
      .eq("id", saleId)
      .single();

    if (saleError) throw saleError;

    // Busca itens da venda com produtos
    const { data: productItems, error: itemsError } = await supabase
      .from("sale_product_items")
      .select(`
        id, product_id, quantity, subtotal,
        product:products(id, code, description, barcode, quantity)
      `)
      .eq("sale_id", saleId);

    if (itemsError) throw itemsError;

    // Busca itens de checkout existentes
    const { data: checkoutItems, error: checkoutError } = await supabase
      .from("sale_checkout_items")
      .select("*")
      .in("sale_product_item_id", productItems?.map(p => p.id) || []);

    if (checkoutError) throw checkoutError;

    const items: CheckoutItem[] = (productItems || []).map(item => {
      const checkoutItem = checkoutItems?.find(ci => ci.sale_product_item_id === item.id);
      
      return {
        id: checkoutItem?.id || item.id,
        sale_product_item_id: item.id,
        product_id: item.product_id || '',
        product_code: item.product?.code || '',
        product_description: item.product?.description || '',
        product_barcode: item.product?.barcode || null,
        quantity_total: item.quantity,
        quantity_checked: checkoutItem?.quantity_checked || 0,
        quantity_pending: checkoutItem?.quantity_pending ?? item.quantity,
        stock_available: item.product?.quantity || 0,
      };
    });

    const client = sale.client as any;

    return {
      id: sale.id,
      type: 'venda',
      number: sale.sale_number,
      client_name: client?.razao_social || client?.nome_fantasia || null,
      client_cpf_cnpj: client?.cpf_cnpj || null,
      tracking_token: sale.tracking_token,
      checkout_status: sale.checkout_status || 'pending',
      total_value: sale.total_value || 0,
      created_at: sale.created_at,
      items,
    };
  };

  // Busca detalhes de uma OS para checkout
  const getOSCheckoutDetails = async (osId: string): Promise<CheckoutSource | null> => {
    const { data: os, error: osError } = await supabase
      .from("service_orders")
      .select(`
        id, order_number, tracking_token, checkout_status, total_value, created_at,
        client:pessoas!service_orders_client_id_fkey(id, razao_social, nome_fantasia, cpf_cnpj)
      `)
      .eq("id", osId)
      .single();

    if (osError) throw osError;

    // Busca itens da OS com produtos
    const { data: productItems, error: itemsError } = await supabase
      .from("service_order_product_items")
      .select(`
        id, product_id, quantity, subtotal,
        product:products(id, code, description, barcode, quantity)
      `)
      .eq("service_order_id", osId);

    if (itemsError) throw itemsError;

    // Busca itens de checkout existentes
    const { data: checkoutItems, error: checkoutError } = await supabase
      .from("service_order_checkout_items")
      .select("*")
      .in("service_order_product_item_id", productItems?.map(p => p.id) || []);

    if (checkoutError) throw checkoutError;

    const items: CheckoutItem[] = (productItems || []).map(item => {
      const checkoutItem = checkoutItems?.find(ci => ci.service_order_product_item_id === item.id);
      
      return {
        id: checkoutItem?.id || item.id,
        service_order_product_item_id: item.id,
        product_id: item.product_id || '',
        product_code: item.product?.code || '',
        product_description: item.product?.description || '',
        product_barcode: item.product?.barcode || null,
        quantity_total: item.quantity,
        quantity_checked: checkoutItem?.quantity_checked || 0,
        quantity_pending: checkoutItem?.quantity_pending ?? item.quantity,
        stock_available: item.product?.quantity || 0,
      };
    });

    const client = os.client as any;

    return {
      id: os.id,
      type: 'os',
      number: os.order_number,
      client_name: client?.razao_social || client?.nome_fantasia || null,
      client_cpf_cnpj: client?.cpf_cnpj || null,
      tracking_token: os.tracking_token,
      checkout_status: os.checkout_status || 'pending',
      total_value: os.total_value || 0,
      created_at: os.created_at,
      items,
    };
  };

  // Busca por número ou token
  const searchByNumberOrToken = async (search: string, type: CheckoutSourceType): Promise<CheckoutSource | null> => {
    const searchClean = search.trim();
    
    if (type === 'venda') {
      // Tenta buscar por número ou token
      const { data, error } = await supabase
        .from("sales")
        .select("id")
        .or(`sale_number.eq.${parseInt(searchClean) || 0},tracking_token.eq.${searchClean}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return getSaleCheckoutDetails(data.id);
    } else {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id")
        .or(`order_number.eq.${parseInt(searchClean) || 0},tracking_token.eq.${searchClean}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return getOSCheckoutDetails(data.id);
    }
  };

  // Confirmar item (bipagem)
  const confirmItem = useMutation({
    mutationFn: async ({
      source,
      item,
      quantity,
      barcode,
    }: {
      source: CheckoutSource;
      item: CheckoutItem;
      quantity: number;
      barcode?: string;
    }) => {
      const newChecked = item.quantity_checked + quantity;
      const newPending = item.quantity_total - newChecked;

      if (source.type === 'venda') {
        // Verifica se já existe registro
        const { data: existing } = await supabase
          .from("sale_checkout_items")
          .select("id")
          .eq("sale_product_item_id", item.sale_product_item_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("sale_checkout_items")
            .update({
              quantity_checked: newChecked,
              quantity_pending: newPending,
              barcode_scanned: barcode || null,
              checked_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("sale_checkout_items")
            .insert({
              sale_product_item_id: item.sale_product_item_id,
              quantity_checked: newChecked,
              quantity_pending: newPending,
              barcode_scanned: barcode || null,
              checked_at: new Date().toISOString(),
            });
        }
      } else {
        // OS
        const { data: existing } = await supabase
          .from("service_order_checkout_items")
          .select("id")
          .eq("service_order_product_item_id", item.service_order_product_item_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("service_order_checkout_items")
            .update({
              quantity_checked: newChecked,
              quantity_pending: newPending,
              barcode_scanned: barcode || null,
              checked_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("service_order_checkout_items")
            .insert({
              service_order_product_item_id: item.service_order_product_item_id,
              quantity_checked: newChecked,
              quantity_pending: newPending,
              barcode_scanned: barcode || null,
              checked_at: new Date().toISOString(),
            });
        }
      }

      return { newChecked, newPending };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout"] });
    },
  });

  // Finalizar checkout (baixa estoque COM movimentação)
  const finalizeCheckout = useMutation({
    mutationFn: async (source: CheckoutSource) => {
      // Atualiza estoque de cada produto E cria movimentação
      for (const item of source.items) {
        if (item.quantity_checked > 0) {
          // Buscar o preço unitário do produto
          const { data: productData } = await supabase
            .from("products")
            .select("purchase_price, sale_price, quantity")
            .eq("id", item.product_id)
            .single();

          const currentQty = productData?.quantity ?? 0;
          const newQty = currentQty - item.quantity_checked;
          const unitPrice = productData?.sale_price || productData?.purchase_price || 0;

          // Criar movimentação de saída
          await supabase
            .from("stock_movements")
            .insert({
              product_id: item.product_id,
              type: "SAIDA_VENDA",
              quantity: item.quantity_checked,
              unit_price: unitPrice,
              total_value: unitPrice * item.quantity_checked,
              reason: `Checkout ${source.type === 'venda' ? 'Venda' : 'OS'} #${source.number}`,
              reference_type: source.type,
              reference_id: source.id,
            });

          // Baixa o estoque
          await supabase
            .from("products")
            .update({ quantity: newQty })
            .eq("id", item.product_id);
        }
      }

      // Verifica se todos os itens foram totalmente conferidos
      const allChecked = source.items.every(item => item.quantity_checked >= item.quantity_total);
      const newStatus = allChecked ? 'completed' : 'partial';

      // Atualiza status do checkout
      if (source.type === 'venda') {
        await supabase
          .from("sales")
          .update({ checkout_status: newStatus })
          .eq("id", source.id);
      } else {
        await supabase
          .from("service_orders")
          .update({ checkout_status: newStatus })
          .eq("id", source.id);
      }

      return { source, isPartial: !allChecked };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["checkout"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (data.isPartial) {
        toast.success("Separação parcial salva! Estoque baixado.");
      } else {
        toast.success("Checkout finalizado! Estoque baixado.");
      }
    },
    onError: (error) => {
      toast.error(`Erro ao finalizar checkout: ${error.message}`);
    },
  });

  // Reiniciar checkout
  const resetCheckout = useMutation({
    mutationFn: async (source: CheckoutSource) => {
      if (source.type === 'venda') {
        // Deleta todos os registros de checkout
        const itemIds = source.items
          .filter(i => i.sale_product_item_id)
          .map(i => i.sale_product_item_id!);
        
        if (itemIds.length > 0) {
          await supabase
            .from("sale_checkout_items")
            .delete()
            .in("sale_product_item_id", itemIds);
        }

        await supabase
          .from("sales")
          .update({ checkout_status: 'pending' })
          .eq("id", source.id);
      } else {
        const itemIds = source.items
          .filter(i => i.service_order_product_item_id)
          .map(i => i.service_order_product_item_id!);
        
        if (itemIds.length > 0) {
          await supabase
            .from("service_order_checkout_items")
            .delete()
            .in("service_order_product_item_id", itemIds);
        }

        await supabase
          .from("service_orders")
          .update({ checkout_status: 'pending' })
          .eq("id", source.id);
      }

      return source;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkout"] });
      toast.success("Checkout reiniciado!");
    },
  });

  return {
    salesPending: salesPendingQuery.data ?? [],
    osPending: osPendingQuery.data ?? [],
    isLoading: salesPendingQuery.isLoading || osPendingQuery.isLoading,
    getSaleCheckoutDetails,
    getOSCheckoutDetails,
    searchByNumberOrToken,
    confirmItem,
    finalizeCheckout,
    resetCheckout,
    refetch: () => {
      salesPendingQuery.refetch();
      osPendingQuery.refetch();
    },
  };
}
