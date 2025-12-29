import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StockMovement {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  unit_price: number | null;
  total_value: number | null;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  created_by: string | null;
  product?: {
    code: string;
    description: string;
    unit: string | null;
  };
}

export interface StockMovementInsert {
  product_id: string;
  type: string;
  quantity: number;
  unit_price?: number;
  total_value?: number;
  reason?: string;
  reference_type?: string;
  reference_id?: string;
}

export function useStockMovements() {
  const queryClient = useQueryClient();

  const movementsQuery = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          product:products(code, description, unit)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StockMovement[];
    },
  });

  const createMovement = useMutation({
    mutationFn: async (movement: StockMovementInsert) => {
      // Criar movimentação
      const { data: movementData, error: movementError } = await supabase
        .from("stock_movements")
        .insert(movement)
        .select()
        .single();

      if (movementError) throw movementError;

      // Atualizar saldo do produto
      const { data: productData, error: productFetchError } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", movement.product_id)
        .single();

      if (productFetchError) throw productFetchError;

      const currentQty = productData?.quantity ?? 0;
      const isEntry = movement.type.includes("ENTRADA");
      const newQty = isEntry 
        ? currentQty + movement.quantity 
        : currentQty - movement.quantity;

      const { error: updateError } = await supabase
        .from("products")
        .update({ quantity: newQty })
        .eq("id", movement.product_id);

      if (updateError) throw updateError;

      return movementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Movimentação registrada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao registrar movimentação: ${error.message}`);
    },
  });

  const reverseMovement = useMutation({
    mutationFn: async (originalMovement: StockMovement) => {
      const reversedType = originalMovement.type.includes("ENTRADA") 
        ? "ESTORNO_ENTRADA" 
        : "ESTORNO_SAIDA";

      const reverseMovement: StockMovementInsert = {
        product_id: originalMovement.product_id,
        type: reversedType,
        quantity: originalMovement.quantity,
        unit_price: originalMovement.unit_price ?? 0,
        total_value: originalMovement.total_value ?? 0,
        reason: `Estorno da movimentação ${originalMovement.id}`,
        reference_type: "estorno",
        reference_id: originalMovement.id,
      };

      // Criar movimentação de estorno
      const { data: movementData, error: movementError } = await supabase
        .from("stock_movements")
        .insert(reverseMovement)
        .select()
        .single();

      if (movementError) throw movementError;

      // Atualizar saldo (inverso do original)
      const { data: productData, error: productFetchError } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", originalMovement.product_id)
        .single();

      if (productFetchError) throw productFetchError;

      const currentQty = productData?.quantity ?? 0;
      const isOriginalEntry = originalMovement.type.includes("ENTRADA");
      const newQty = isOriginalEntry 
        ? currentQty - originalMovement.quantity 
        : currentQty + originalMovement.quantity;

      const { error: updateError } = await supabase
        .from("products")
        .update({ quantity: newQty })
        .eq("id", originalMovement.product_id);

      if (updateError) throw updateError;

      return movementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Movimentação estornada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao estornar movimentação: ${error.message}`);
    },
  });

  return {
    movements: movementsQuery.data ?? [],
    isLoading: movementsQuery.isLoading,
    error: movementsQuery.error,
    createMovement,
    reverseMovement,
    refetch: movementsQuery.refetch,
  };
}
