import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useCompany } from "@/contexts/CompanyContext";

export type Cliente = Tables<"clientes">;
export type ClienteContato = Tables<"cliente_contatos">;
export type ClienteInsert = TablesInsert<"clientes">;
export type ClienteUpdate = TablesUpdate<"clientes">;
export type ClienteContatoInsert = TablesInsert<"cliente_contatos">;

export function useClientes() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useCompany();

  const fetchClientes = async () => {
    if (!currentCompany) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("company_id", currentCompany.id)
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
    if (!currentCompany) {
      toast({
        title: "Erro",
        description: "Nenhuma empresa selecionada",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .insert({ ...cliente, company_id: currentCompany.id })
        .select()
        .single();

      if (error) throw error;

      // Salvar contatos se houver
      if (contatos.length > 0 && data) {
        const contatosComClienteId = contatos.map(c => ({
          ...c,
          cliente_id: data.id,
          company_id: currentCompany.id,
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
    if (!currentCompany) return null;

    setLoading(true);
    try {
      // Buscar dados atuais para comparar
      const { data: clienteAtual } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await supabase
        .from("clientes")
        .update(cliente)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Registrar histórico de alterações
      if (clienteAtual && data) {
        const alteracoes: { campo_alterado: string; valor_anterior: string | null; valor_novo: string | null }[] = [];
        
        const camposParaMonitorar = [
          'razao_social', 'nome_fantasia', 'cpf_cnpj', 'email', 'telefone', 'status',
          'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'complemento',
          'inscricao_estadual', 'inscricao_municipal', 'regime_tributario',
          'tipo_cliente', 'limite_credito', 'condicao_pagamento',
          'responsavel_comercial', 'responsavel_tecnico', 'sla_padrao',
          'contribuinte_icms', 'retencao_impostos',
          'observacoes_comerciais', 'observacoes_fiscais', 'observacoes_internas'
        ];

        for (const campo of camposParaMonitorar) {
          const valorAnterior = (clienteAtual as any)[campo];
          const valorNovo = (cliente as any)[campo];
          
          // Converter para string para comparação
          const strAnterior = valorAnterior?.toString() || '';
          const strNovo = valorNovo?.toString() || '';
          
          if (strAnterior !== strNovo) {
            alteracoes.push({
              campo_alterado: campo,
              valor_anterior: strAnterior || null,
              valor_novo: strNovo || null,
            });
          }
        }

        // Inserir alterações no histórico
        if (alteracoes.length > 0) {
          await supabase.from("cliente_historico").insert(
            alteracoes.map(alt => ({
              ...alt,
              cliente_id: id,
              company_id: currentCompany.id,
              usuario_id: null, // TODO: pegar do usuário logado quando tiver auth
            }))
          );
        }
      }

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
          company_id: currentCompany.id,
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
    if (!cpfCnpj || !currentCompany) return false;

    try {
      let query = supabase
        .from("clientes")
        .select("id")
        .eq("cpf_cnpj", cpfCnpj)
        .eq("company_id", currentCompany.id);

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
