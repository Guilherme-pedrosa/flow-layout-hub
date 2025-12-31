import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export interface Supplier {
  id: string;
  company_id: string;
  tipo_pessoa: "PF" | "PJ";
  cpf_cnpj: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierInsert {
  company_id?: string;
  tipo_pessoa?: "PF" | "PJ";
  cpf_cnpj?: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
  is_active?: boolean;
}

export interface SupplierUpdate extends Partial<SupplierInsert> {
  id: string;
}

export function useSuppliers() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("razao_social", { ascending: true });

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!currentCompany,
  });

  const createSupplier = useMutation({
    mutationFn: async (supplier: Omit<SupplierInsert, "company_id">) => {
      if (!currentCompany) throw new Error("Nenhuma empresa selecionada");
      
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...supplier, company_id: currentCompany.id })
        .select()
        .single();

      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedor cadastrado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cadastrar fornecedor: ${error.message}`);
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...data }: SupplierUpdate) => {
      const { data: result, error } = await supabase
        .from("suppliers")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedor atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar fornecedor: ${error.message}`);
    },
  });

  const toggleSupplierStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Fornecedor ${data.is_active ? "ativado" : "desativado"} com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  const getSupplierByCnpj = async (cpfCnpj: string): Promise<Supplier | null> => {
    if (!currentCompany) return null;
    
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("cpf_cnpj", cpfCnpj)
      .maybeSingle();

    if (error) throw error;
    return data as Supplier | null;
  };

  return {
    suppliers: suppliersQuery.data ?? [],
    activeSuppliers: (suppliersQuery.data ?? []).filter(s => s.is_active),
    isLoading: suppliersQuery.isLoading,
    error: suppliersQuery.error,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus,
    getSupplierByCnpj,
    refetch: suppliersQuery.refetch,
  };
}
