import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PessoaEndereco {
  id: string;
  pessoa_id: string;
  tipo_endereco: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  is_principal: boolean;
  created_at: string;
  updated_at: string;
}

export type PessoaEnderecoInsert = Omit<PessoaEndereco, "id" | "created_at" | "updated_at">;
export type PessoaEnderecoUpdate = Partial<PessoaEnderecoInsert> & { id: string };

export function usePessoaEnderecos(pessoaId?: string) {
  const queryClient = useQueryClient();

  const enderecosQuery = useQuery({
    queryKey: ["pessoa-enderecos", pessoaId],
    queryFn: async () => {
      if (!pessoaId) return [];
      const { data, error } = await supabase
        .from("pessoa_enderecos")
        .select("*")
        .eq("pessoa_id", pessoaId)
        .order("is_principal", { ascending: false });

      if (error) throw error;
      return data as PessoaEndereco[];
    },
    enabled: !!pessoaId,
  });

  const createEndereco = useMutation({
    mutationFn: async (endereco: PessoaEnderecoInsert) => {
      // Se for principal, remove o flag dos outros
      if (endereco.is_principal) {
        await supabase
          .from("pessoa_enderecos")
          .update({ is_principal: false })
          .eq("pessoa_id", endereco.pessoa_id);
      }

      const { data, error } = await supabase
        .from("pessoa_enderecos")
        .insert(endereco)
        .select()
        .single();

      if (error) throw error;
      return data as PessoaEndereco;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoa-enderecos", pessoaId] });
      toast.success("Endereço adicionado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar endereço: ${error.message}`);
    },
  });

  const updateEndereco = useMutation({
    mutationFn: async ({ id, ...data }: PessoaEnderecoUpdate) => {
      // Se for principal, remove o flag dos outros
      if (data.is_principal && pessoaId) {
        await supabase
          .from("pessoa_enderecos")
          .update({ is_principal: false })
          .eq("pessoa_id", pessoaId)
          .neq("id", id);
      }

      const { data: result, error } = await supabase
        .from("pessoa_enderecos")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as PessoaEndereco;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoa-enderecos", pessoaId] });
      toast.success("Endereço atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar endereço: ${error.message}`);
    },
  });

  const deleteEndereco = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pessoa_enderecos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoa-enderecos", pessoaId] });
      toast.success("Endereço removido!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover endereço: ${error.message}`);
    },
  });

  return {
    enderecos: enderecosQuery.data ?? [],
    isLoading: enderecosQuery.isLoading,
    createEndereco,
    updateEndereco,
    deleteEndereco,
    refetch: enderecosQuery.refetch,
  };
}
