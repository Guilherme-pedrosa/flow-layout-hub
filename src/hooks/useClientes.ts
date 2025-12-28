import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Cliente = Tables<"clientes">;
export type ClienteContato = Tables<"cliente_contatos">;
export type ClienteInsert = TablesInsert<"clientes">;
export type ClienteUpdate = TablesUpdate<"clientes">;
export type ClienteContatoInsert = TablesInsert<"cliente_contatos">;

export function useClientes() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchCliente = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cliente",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchContatos = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from("cliente_contatos")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("principal", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contatos",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const saveCliente = async (cliente: ClienteInsert, contatos: ClienteContatoInsert[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .insert(cliente)
        .select()
        .single();

      if (error) throw error;

      // Salvar contatos se houver
      if (contatos.length > 0 && data) {
        const contatosComClienteId = contatos.map(c => ({
          ...c,
          cliente_id: data.id,
        }));

        const { error: contatosError } = await supabase
          .from("cliente_contatos")
          .insert(contatosComClienteId);

        if (contatosError) throw contatosError;
      }

      toast({
        title: "Cliente salvo",
        description: "Cadastro realizado com sucesso.",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cliente",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCliente = async (id: string, cliente: ClienteUpdate, contatos: ClienteContatoInsert[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .update(cliente)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar contatos: deletar existentes e inserir novos
      const { error: deleteError } = await supabase
        .from("cliente_contatos")
        .delete()
        .eq("cliente_id", id);

      if (deleteError) throw deleteError;

      if (contatos.length > 0) {
        const contatosComClienteId = contatos.map(c => ({
          ...c,
          cliente_id: id,
        }));

        const { error: contatosError } = await supabase
          .from("cliente_contatos")
          .insert(contatosComClienteId);

        if (contatosError) throw contatosError;
      }

      toast({
        title: "Cliente atualizado",
        description: "Dados atualizados com sucesso.",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicateCpfCnpj = async (cpfCnpj: string, excludeId?: string) => {
    if (!cpfCnpj) return false;

    try {
      let query = supabase
        .from("clientes")
        .select("id")
        .eq("cpf_cnpj", cpfCnpj);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data?.length || 0) > 0;
    } catch {
      return false;
    }
  };

  return {
    loading,
    fetchClientes,
    fetchCliente,
    fetchContatos,
    saveCliente,
    updateCliente,
    checkDuplicateCpfCnpj,
  };
}
