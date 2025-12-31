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
    queryKey: ["products"],
    queryFn: async () => {
      // Buscar TODOS os produtos ativos (compartilhado entre empresas)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("description", { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
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

  // Verificar se já existe produto com código ou descrição duplicada
  const checkDuplicates = async (code: string, description: string, excludeId?: string): Promise<{
    hasDuplicateCode: boolean;
    hasDuplicateDescription: boolean;
    hasSimilarDescription: boolean;
    duplicateCodeProduct?: { code: string; description: string };
    duplicateDescriptionProduct?: { code: string; description: string };
    similarProducts?: { code: string; description: string; similarity: number }[];
  }> => {
    if (!currentCompany) {
      return { hasDuplicateCode: false, hasDuplicateDescription: false, hasSimilarDescription: false };
    }

    // Buscar produtos existentes
    let query = supabase
      .from("products")
      .select("id, code, description")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true);
    
    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data: products, error } = await query;
    if (error || !products) {
      return { hasDuplicateCode: false, hasDuplicateDescription: false, hasSimilarDescription: false };
    }

    // Verificar código duplicado exato
    const duplicateCodeProduct = products.find(p => 
      p.code?.toLowerCase().trim() === code.toLowerCase().trim()
    );

    // Verificar descrição duplicada exata
    const duplicateDescriptionProduct = products.find(p => 
      p.description?.toLowerCase().trim() === description.toLowerCase().trim()
    );

    // Verificar descrições muito semelhantes (80%+ similaridade)
    const normalizeString = (str: string) => 
      str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
    
    const calcSimilarity = (a: string, b: string): number => {
      const aNorm = normalizeString(a);
      const bNorm = normalizeString(b);
      
      if (aNorm === bNorm) return 1;
      
      const wordsA = aNorm.split(' ').filter(w => w.length > 2);
      const wordsB = bNorm.split(' ').filter(w => w.length > 2);
      
      if (wordsA.length === 0 || wordsB.length === 0) return 0;
      
      const matchingWords = wordsA.filter(w => wordsB.includes(w));
      return (matchingWords.length * 2) / (wordsA.length + wordsB.length);
    };

    const similarProducts = products
      .filter(p => p.description && p.id !== excludeId)
      .map(p => ({
        code: p.code || '',
        description: p.description || '',
        similarity: calcSimilarity(description, p.description || ''),
      }))
      .filter(p => p.similarity >= 0.8 && p.description.toLowerCase().trim() !== description.toLowerCase().trim())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    return {
      hasDuplicateCode: !!duplicateCodeProduct,
      hasDuplicateDescription: !!duplicateDescriptionProduct,
      hasSimilarDescription: similarProducts.length > 0,
      duplicateCodeProduct: duplicateCodeProduct ? { code: duplicateCodeProduct.code || '', description: duplicateCodeProduct.description || '' } : undefined,
      duplicateDescriptionProduct: duplicateDescriptionProduct ? { code: duplicateDescriptionProduct.code || '', description: duplicateDescriptionProduct.description || '' } : undefined,
      similarProducts: similarProducts.length > 0 ? similarProducts : undefined,
    };
  };

  const createProduct = useMutation({
    mutationFn: async (product: ProductInsert) => {
      if (!currentCompany) throw new Error("Nenhuma empresa selecionada");
      
      // Validar duplicidade antes de criar
      const duplicateCheck = await checkDuplicates(product.code || '', product.description || '');
      
      if (duplicateCheck.hasDuplicateCode && duplicateCheck.hasDuplicateDescription) {
        throw new Error(`Cadastro duplicado! Já existe o produto "${duplicateCheck.duplicateCodeProduct?.description}" com o código "${duplicateCheck.duplicateCodeProduct?.code}".`);
      }
      
      if (duplicateCheck.hasDuplicateCode) {
        throw new Error(`Código duplicado! O produto "${duplicateCheck.duplicateCodeProduct?.description}" já usa o código "${product.code}". Altere o código.`);
      }
      
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, company_id: currentCompany.id })
        .select()
        .single();

      if (error) throw error;
      
      // Avisar sobre descrições semelhantes (não bloqueia, apenas avisa)
      if (duplicateCheck.hasSimilarDescription && duplicateCheck.similarProducts) {
        const similar = duplicateCheck.similarProducts[0];
        toast.warning(`Atenção: O produto "${similar.description}" (${similar.code}) tem descrição muito semelhante. Confira se não é duplicação.`, { duration: 8000 });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      // Validar duplicidade antes de atualizar (excluindo o próprio produto)
      if (updates.code || updates.description) {
        const currentProduct = await supabase
          .from("products")
          .select("code, description")
          .eq("id", id)
          .single();
        
        const codeToCheck = updates.code || currentProduct.data?.code || '';
        const descriptionToCheck = updates.description || currentProduct.data?.description || '';
        
        const duplicateCheck = await checkDuplicates(codeToCheck, descriptionToCheck, id);
        
        if (duplicateCheck.hasDuplicateCode) {
          throw new Error(`Código duplicado! O produto "${duplicateCheck.duplicateCodeProduct?.description}" já usa o código "${codeToCheck}".`);
        }
        
        if (duplicateCheck.hasDuplicateDescription) {
          throw new Error(`Descrição duplicada! O produto "${duplicateCheck.duplicateDescriptionProduct?.code}" já tem essa descrição.`);
        }
        
        // Avisar sobre descrições semelhantes
        if (duplicateCheck.hasSimilarDescription && duplicateCheck.similarProducts) {
          const similar = duplicateCheck.similarProducts[0];
          toast.warning(`Atenção: O produto "${similar.description}" (${similar.code}) tem descrição muito semelhante.`, { duration: 6000 });
        }
      }
      
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
      toast.error(error.message);
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
    checkDuplicates,
    refetch: productsQuery.refetch,
  };
}
