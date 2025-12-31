import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useCompany } from "@/contexts/CompanyContext";

export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

export function useProducts() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();

  const productsQuery = useQuery({
    queryKey: ["products", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      // Buscar produtos da empresa atual OU produtos sem company_id (legado)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`company_id.eq.${currentCompany.id},company_id.is.null`)
        .order("description", { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!currentCompany,
  });

  // Buscar próximo código sequencial (5 dígitos)
  const getNextCode = async (): Promise<string> => {
    if (!currentCompany) return "00001";
    
    const { data, error } = await supabase
      .from("products")
      .select("code")
      .eq("company_id", currentCompany.id)
      .order("code", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Filtrar apenas códigos numéricos de 5 dígitos
    const numericCodes = (data || [])
      .map(p => parseInt(p.code, 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= 99999)
      .sort((a, b) => b - a);

    const nextNum = numericCodes.length > 0 ? numericCodes[0] + 1 : 1;
    return nextNum.toString().padStart(5, '0');
  };

  // Gerar código de barras EAN-13
  const generateBarcode = async (): Promise<string> => {
    // Prefixo Brasil (789) + código de empresa fictício (0000) + sequencial
    const prefix = "7890000";
    const timestamp = Date.now().toString().slice(-5);
    const partial = prefix + timestamp;
    
    // Calcular dígito verificador EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(partial[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    return partial + checkDigit;
  };

  const createProduct = useMutation({
    mutationFn: async (product: ProductInsert) => {
      if (!currentCompany) throw new Error("Nenhuma empresa selecionada");
      
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, company_id: currentCompany.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar produto: ${error.message}`);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar produto: ${error.message}`);
    },
  });

  // Atualizar preço de compra (apenas se aumentar)
  const updatePurchasePrice = useMutation({
    mutationFn: async ({ id, newPrice, accessoryExpenses, otherExpenses }: { 
      id: string; 
      newPrice: number;
      accessoryExpenses?: number;
      otherExpenses?: number;
    }) => {
      // Buscar produto atual
      const { data: currentProduct, error: fetchError } = await supabase
        .from("products")
        .select("purchase_price")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Só atualiza se o novo preço for maior
      if (newPrice > (currentProduct.purchase_price || 0)) {
        const updates: ProductUpdate = {
          purchase_price: newPrice,
        };
        
        if (accessoryExpenses !== undefined) {
          updates.accessory_expenses = accessoryExpenses;
        }
        if (otherExpenses !== undefined) {
          updates.other_expenses = otherExpenses;
        }
        
        // Recalcular custo final
        updates.final_cost = newPrice + (accessoryExpenses || 0) + (otherExpenses || 0);

        const { data, error } = await supabase
          .from("products")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      return currentProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const toggleProductStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        variables.is_active ? "Produto ativado!" : "Produto desativado!"
      );
    },
    onError: (error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  return {
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    createProduct,
    updateProduct,
    updatePurchasePrice,
    toggleProductStatus,
    getNextCode,
    generateBarcode,
    refetch: productsQuery.refetch,
  };
}
