import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SupplierBankAccount {
  id: string;
  pessoa_id: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string;
  pix_key: string | null;
  pix_key_type: string | null;
  is_principal: boolean;
  created_at: string;
  updated_at: string;
}

export type SupplierBankAccountInsert = Omit<SupplierBankAccount, "id" | "created_at" | "updated_at">;
export type SupplierBankAccountUpdate = Partial<SupplierBankAccountInsert> & { id: string };

export function useSupplierBankAccounts(pessoaId?: string) {
  const queryClient = useQueryClient();

  const bankAccountsQuery = useQuery({
    queryKey: ["supplier-bank-accounts", pessoaId],
    queryFn: async () => {
      if (!pessoaId) return [];
      const { data, error } = await supabase
        .from("supplier_bank_accounts")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .order("is_principal", { ascending: false });

      if (error) throw error;
      return data as SupplierBankAccount[];
    },
    enabled: !!pessoaId,
  });

  const createBankAccount = useMutation({
    mutationFn: async (account: SupplierBankAccountInsert) => {
      // Se for principal, remove o flag dos outros
      if (account.is_principal) {
        await supabase
          .from("supplier_bank_accounts")
          .update({ is_principal: false })
          .eq("pessoa_id", account.pessoa_id);
      }

      const { data, error } = await supabase
        .from("supplier_bank_accounts")
        .insert(account)
        .select()
        .single();

      if (error) throw error;
      return data as SupplierBankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bank-accounts", pessoaId] });
      toast.success("Dados bancários adicionados!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar dados bancários: ${error.message}`);
    },
  });

  const updateBankAccount = useMutation({
    mutationFn: async ({ id, ...data }: SupplierBankAccountUpdate) => {
      // Se for principal, remove o flag dos outros
      if (data.is_principal && pessoaId) {
        await supabase
          .from("supplier_bank_accounts")
          .update({ is_principal: false })
          .eq("pessoa_id", pessoaId)
          .neq("id", id);
      }

      const { data: result, error } = await supabase
        .from("supplier_bank_accounts")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as SupplierBankAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bank-accounts", pessoaId] });
      toast.success("Dados bancários atualizados!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar dados bancários: ${error.message}`);
    },
  });

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bank-accounts", pessoaId] });
      toast.success("Dados bancários removidos!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover dados bancários: ${error.message}`);
    },
  });

  return {
    bankAccounts: bankAccountsQuery.data ?? [],
    isLoading: bankAccountsQuery.isLoading,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    refetch: bankAccountsQuery.refetch,
  };
}
