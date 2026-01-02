import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export interface ReceiptSource {
  id: string;
  type: 'purchase_order';
  order_number: number;
  supplier_name: string;
  supplier_id: string;
  receipt_id: string | null;
  receipt_status: 'pending' | 'in_progress' | 'partial' | 'complete';
  items: ReceiptItem[];
  total_value: number;
}

export interface ReceiptItem {
  id: string;
  receipt_item_id: string | null;
  purchase_order_item_id: string;
  product_id: string | null;
  product_code: string;
  product_description: string;
  product_barcode: string | null;
  quantity_total: number;
  quantity_received: number;
  quantity_pending: number;
  unit_price: number;
}

export function usePurchaseReceipt() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  // Buscar pedidos pendentes de recebimento (com status que requires_receipt = true)
  const pendingOrdersQuery = useQuery({
    queryKey: ["purchase_orders_pending_receipt"],
    queryFn: async (): Promise<any[]> => {
      // Buscar os status que requerem recebimento
      const { data: statuses, error: statusError } = await supabase
        .from("purchase_order_statuses" as any)
        .select("id")
        .eq("is_active", true)
        .eq("requires_receipt", true);

      console.log("Status que requerem recebimento:", statuses, statusError);

      if (!statuses || statuses.length === 0) return [];
      const statusIds = statuses.map((s: any) => s.id);

      console.log("Status IDs:", statusIds);

      // Buscar pedidos que estão nesses status e não estão completos
      const { data: orders, error: ordersError } = await supabase
        .from("purchase_orders" as any)
        .select("*")
        .in("status_id", statusIds)
        .neq("receipt_status", "complete");

      console.log("Pedidos encontrados:", orders, ordersError);
      
      if (!orders || orders.length === 0) return [];
      
      const supplierIds = orders.map((d: any) => d.supplier_id).filter(Boolean);
      
      let suppliers: any[] = [];
      if (supplierIds.length > 0) {
        const { data: suppliersData } = await supabase
          .from("pessoas")
          .select("id, razao_social, nome_fantasia")
          .in("id", supplierIds);
        suppliers = suppliersData || [];
      }

      return orders.map((order: any) => {
        const supplier = suppliers.find((s: any) => s.id === order.supplier_id);
        return { ...order, supplier };
      });
    },
    enabled: true,
  });

  // Buscar detalhes de um pedido para check-in
  const getReceiptDetails = async (orderId: string): Promise<ReceiptSource | null> => {
    if (!companyId) return null;

    // Buscar pedido
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .select(`
        id,
        order_number,
        supplier_id,
        supplier_name,
        total_value,
        receipt_status
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) return null;

    // Buscar fornecedor separadamente devido a múltiplas FKs para 'pessoas'
    let supplierData: { razao_social: string | null; nome_fantasia: string | null } | null = null;
    if (order.supplier_id) {
      const { data } = await supabase
        .from("pessoas")
        .select("razao_social, nome_fantasia")
        .eq("id", order.supplier_id)
        .maybeSingle();
      supplierData = data;
    }

    if (orderError || !order) return null;

    // Verificar se já existe um recebimento em andamento
    const { data: existingReceipt } = await supabase
      .from("purchase_order_receipts")
      .select("id, status")
      .eq("purchase_order_id", orderId)
      .neq("status", "complete")
      .maybeSingle();

    // Buscar itens do pedido
    const { data: orderItems, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        product:products(code, description, barcode)
      `)
      .eq("purchase_order_id", orderId);

    if (itemsError) throw itemsError;

    // Se já existe um recebimento, buscar os itens do recebimento
    let receiptItems: any[] = [];
    if (existingReceipt) {
      const { data: items } = await supabase
        .from("purchase_order_receipt_items")
        .select("*")
        .eq("receipt_id", existingReceipt.id);
      receiptItems = items || [];
    }

    // Montar a estrutura de itens
    const items: ReceiptItem[] = (orderItems || []).map((item: any) => {
      const receiptItem = receiptItems.find(ri => ri.purchase_order_item_id === item.id);
      const quantityReceived = receiptItem?.quantity_received || 0;
      
      return {
        id: item.id,
        receipt_item_id: receiptItem?.id || null,
        purchase_order_item_id: item.id,
        product_id: item.product_id,
        product_code: item.product?.code || '',
        product_description: item.product?.description || 'Produto não identificado',
        product_barcode: item.product?.barcode || null,
        quantity_total: item.quantity,
        quantity_received: quantityReceived,
        quantity_pending: item.quantity - quantityReceived,
        unit_price: item.unit_price,
      };
    });

    return {
      id: order.id,
      type: 'purchase_order',
      order_number: order.order_number,
      supplier_name: supplierData?.razao_social || supplierData?.nome_fantasia || order.supplier_name || 'Fornecedor não identificado',
      supplier_id: order.supplier_id,
      receipt_id: existingReceipt?.id || null,
      receipt_status: (existingReceipt?.status as 'pending' | 'in_progress' | 'partial' | 'complete') || 'pending',
      items,
      total_value: order.total_value || 0,
    };
  };

  // Iniciar ou continuar recebimento
  const startReceipt = useMutation({
    mutationFn: async (orderId: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");

      // Verificar se já existe recebimento em andamento
      const { data: existing } = await supabase
        .from("purchase_order_receipts")
        .select("id")
        .eq("purchase_order_id", orderId)
        .neq("status", "complete")
        .maybeSingle();

      if (existing) return existing.id;

      // Criar novo recebimento
      const { data: receipt, error } = await supabase
        .from("purchase_order_receipts")
        .insert({
          company_id: companyId,
          purchase_order_id: orderId,
          status: 'in_progress',
        })
        .select("id")
        .single();

      if (error) throw error;

      // Buscar itens do pedido e criar itens de recebimento
      const { data: orderItems } = await supabase
        .from("purchase_order_items")
        .select("id, product_id, quantity")
        .eq("purchase_order_id", orderId);

      if (orderItems && orderItems.length > 0) {
        const receiptItems = orderItems.map(item => ({
          receipt_id: receipt.id,
          company_id: companyId,
          purchase_order_item_id: item.id,
          product_id: item.product_id,
          quantity_expected: item.quantity,
          quantity_received: 0,
        }));

        await supabase.from("purchase_order_receipt_items").insert(receiptItems);
      }

      // Atualizar status do pedido
      await supabase
        .from("purchase_orders")
        .update({ receipt_status: 'partial' })
        .eq("id", orderId);

      // Log
      await supabase.from("purchase_order_receipt_logs").insert({
        receipt_id: receipt.id,
        action: 'receipt_started',
        user_name: 'Usuário',
      });

      return receipt.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders_pending_receipt"] });
    },
  });

  // Confirmar item recebido
  const confirmItem = useMutation({
    mutationFn: async ({
      source,
      item,
      quantity,
      barcode,
    }: {
      source: ReceiptSource;
      item: ReceiptItem;
      quantity: number;
      barcode?: string;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");

      let receiptId = source.receipt_id;

      // Se não há recebimento, criar um
      if (!receiptId) {
        receiptId = await startReceipt.mutateAsync(source.id);
      }

      // Buscar ou criar item de recebimento
      let receiptItemId = item.receipt_item_id;
      
      if (!receiptItemId) {
        const { data: receiptItem } = await supabase
          .from("purchase_order_receipt_items")
          .select("id")
          .eq("receipt_id", receiptId)
          .eq("purchase_order_item_id", item.purchase_order_item_id)
          .maybeSingle();

        receiptItemId = receiptItem?.id;
      }

      if (!receiptItemId) {
        // Criar item de recebimento se não existir
        const { data: newItem, error: createError } = await supabase
          .from("purchase_order_receipt_items")
          .insert({
            receipt_id: receiptId,
            company_id: companyId,
            purchase_order_item_id: item.purchase_order_item_id,
            product_id: item.product_id,
            quantity_expected: item.quantity_total,
            quantity_received: 0,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        receiptItemId = newItem.id;
      }

      // Atualizar quantidade recebida
      const newQuantity = item.quantity_received + quantity;
      if (newQuantity > item.quantity_total) {
        throw new Error(`Quantidade excede o esperado. Máximo: ${item.quantity_pending}`);
      }

      const { error: updateError } = await supabase
        .from("purchase_order_receipt_items")
        .update({ quantity_received: newQuantity })
        .eq("id", receiptItemId);

      if (updateError) throw updateError;

      // Registrar log
      await supabase.from("purchase_order_receipt_logs").insert({
        receipt_id: receiptId,
        receipt_item_id: receiptItemId,
        action: 'item_received',
        quantity,
        barcode_scanned: barcode,
        user_name: 'Usuário',
      });

      return { receiptId, receiptItemId, newQuantity };
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao confirmar item");
    },
  });

  // Atualizar quantidade de item recebido
  const updateItemQuantity = useMutation({
    mutationFn: async ({
      source,
      item,
      newQuantity,
    }: {
      source: ReceiptSource;
      item: ReceiptItem;
      newQuantity: number;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      if (newQuantity < 0) throw new Error("Quantidade não pode ser negativa");
      if (newQuantity > item.quantity_total) throw new Error(`Quantidade máxima: ${item.quantity_total}`);

      let receiptId = source.receipt_id;

      // Se não há recebimento e a quantidade é 0, não fazer nada
      if (!receiptId && newQuantity === 0) return;

      // Se não há recebimento, criar um
      if (!receiptId) {
        receiptId = await startReceipt.mutateAsync(source.id);
      }

      // Buscar ou criar item de recebimento
      let receiptItemId = item.receipt_item_id;
      
      if (!receiptItemId) {
        const { data: receiptItem } = await supabase
          .from("purchase_order_receipt_items")
          .select("id")
          .eq("receipt_id", receiptId)
          .eq("purchase_order_item_id", item.purchase_order_item_id)
          .maybeSingle();

        receiptItemId = receiptItem?.id;
      }

      if (!receiptItemId) {
        // Criar item de recebimento se não existir
        const { data: newItem, error: createError } = await supabase
          .from("purchase_order_receipt_items")
          .insert({
            receipt_id: receiptId,
            company_id: companyId,
            purchase_order_item_id: item.purchase_order_item_id,
            product_id: item.product_id,
            quantity_expected: item.quantity_total,
            quantity_received: 0,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        receiptItemId = newItem.id;
      }

      // Atualizar quantidade recebida
      const { error: updateError } = await supabase
        .from("purchase_order_receipt_items")
        .update({ quantity_received: newQuantity })
        .eq("id", receiptItemId);

      if (updateError) throw updateError;

      // Registrar log
      await supabase.from("purchase_order_receipt_logs").insert({
        receipt_id: receiptId,
        receipt_item_id: receiptItemId,
        action: 'quantity_updated',
        quantity: newQuantity,
        user_name: 'Usuário',
      });

      return { receiptId, receiptItemId, newQuantity };
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar quantidade");
    },
  });

  // Finalizar recebimento
  const finalizeReceipt = useMutation({
    mutationFn: async (source: ReceiptSource) => {
      let receiptId = source.receipt_id;

      // Se não há receipt_id no state, buscar do banco de dados
      if (!receiptId) {
        const { data: existingReceipt } = await supabase
          .from("purchase_order_receipts")
          .select("id")
          .eq("purchase_order_id", source.id)
          .neq("status", "complete")
          .maybeSingle();
        
        receiptId = existingReceipt?.id || null;
      }

      if (!receiptId) throw new Error("Recebimento não iniciado");

      // Verificar itens recebidos
      const { data: items } = await supabase
        .from("purchase_order_receipt_items")
        .select("quantity_expected, quantity_received")
        .eq("receipt_id", receiptId);

      const allComplete = items?.every(i => i.quantity_received >= i.quantity_expected);
      const hasPartial = items?.some(i => i.quantity_received > 0 && i.quantity_received < i.quantity_expected);
      const hasReceived = items?.some(i => i.quantity_received > 0);

      if (!hasReceived) {
        throw new Error("Nenhum item foi recebido");
      }

      const newStatus = allComplete ? 'complete' : 'partial';

      // Atualizar recebimento
      await supabase
        .from("purchase_order_receipts")
        .update({
          status: newStatus,
          completed_at: allComplete ? new Date().toISOString() : null,
        })
        .eq("id", receiptId);

      // Atualizar status do pedido
      await supabase
        .from("purchase_orders")
        .update({ receipt_status: newStatus })
        .eq("id", source.id);

      // Log
      await supabase.from("purchase_order_receipt_logs").insert({
        receipt_id: receiptId,
        action: allComplete ? 'receipt_completed' : 'receipt_saved_partial',
        user_name: 'Usuário',
      });

      toast.success(allComplete ? "Recebimento finalizado!" : "Recebimento salvo (parcial)");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders_pending_receipt"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao finalizar recebimento");
    },
  });

  // Cancelar/resetar recebimento
  const resetReceipt = useMutation({
    mutationFn: async (source: ReceiptSource) => {
      if (!source.receipt_id) {
        toast.info("Nenhum recebimento para cancelar");
        return;
      }

      // Log antes de deletar
      await supabase.from("purchase_order_receipt_logs").insert({
        receipt_id: source.receipt_id,
        action: 'receipt_cancelled',
        user_name: 'Usuário',
      });

      // Deletar itens do recebimento
      await supabase
        .from("purchase_order_receipt_items")
        .delete()
        .eq("receipt_id", source.receipt_id);

      // Deletar recebimento
      await supabase
        .from("purchase_order_receipts")
        .delete()
        .eq("id", source.receipt_id);

      // Atualizar status do pedido
      await supabase
        .from("purchase_orders")
        .update({ receipt_status: 'pending' })
        .eq("id", source.id);

      toast.success("Recebimento cancelado");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders_pending_receipt"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    },
    onError: (error) => {
      toast.error("Erro ao cancelar recebimento");
    },
  });

  return {
    pendingOrders: pendingOrdersQuery.data || [],
    isLoading: pendingOrdersQuery.isLoading,
    getReceiptDetails,
    startReceipt,
    confirmItem,
    updateItemQuantity,
    finalizeReceipt,
    resetReceipt,
    refetch: pendingOrdersQuery.refetch,
  };
}
