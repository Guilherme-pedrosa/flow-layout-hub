import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { usePessoas, Pessoa } from "./usePessoas";

// Documentos de colaborador - usa pessoa_id como referência
export interface RhDocumentoColaborador {
  id: string;
  company_id: string;
  colaborador_id: string; // pessoa_id
  tipo_documento: string;
  data_emissao: string | null;
  data_vencimento: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  ativo: number;
  created_at: string;
  updated_at: string;
}

// Integração colaborador x cliente (unidade)
export interface RhIntegracao {
  id: string;
  company_id: string;
  colaborador_id: string; // pessoa_id (is_colaborador)
  cliente_id: string; // pessoa_id (is_cliente) - a unidade
  data_integracao: string;
  data_vencimento: string;
  observacoes: string | null;
  ativo: number;
  created_at: string;
  updated_at: string;
  colaborador?: Pessoa;
  cliente?: Pessoa;
}

export const TIPOS_DOCUMENTO = ["ASO", "NR10", "NR35", "NR33", "NR12", "NR06", "NR11", "CNH", "Outros"];

// Hook principal de RH que usa pessoas com is_colaborador = true
export function useRh() {
  const { colaboradores, isLoadingColaboradores, createPessoa, updatePessoa, toggleStatus } = usePessoas();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  // Todos os documentos da empresa
  const { data: documentos = [], isLoading: isLoadingDocs, refetch: refetchDocs } = useQuery({
    queryKey: ['rh_documentos_all', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('rh_documentos_colaborador')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('ativo', 1);
      if (error) throw error;
      return data as RhDocumentoColaborador[];
    },
    enabled: !!currentCompany?.id,
  });

  // Criar documento
  const createDocumento = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      tipo_documento: string;
      data_emissao?: string | null;
      data_vencimento?: string | null;
      arquivo_url?: string;
      arquivo_nome?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('rh_documentos_colaborador')
        .insert({ 
          colaborador_id: data.colaborador_id,
          tipo_documento: data.tipo_documento,
          data_emissao: data.data_emissao || null,
          data_vencimento: data.data_vencimento || null,
          arquivo_url: data.arquivo_url || null,
          arquivo_nome: data.arquivo_nome || null,
          company_id: currentCompany.id, 
          ativo: 1 
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['rh_documentos_all'] });
      toast.success('Documento adicionado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Atualizar documento
  const updateDocumento = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RhDocumentoColaborador> }) => {
      const { error } = await supabase
        .from('rh_documentos_colaborador')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['rh_documentos_all'] });
      toast.success('Documento atualizado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Deletar documento
  const deleteDocumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rh_documentos_colaborador')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['rh_documentos_all'] });
      toast.success('Documento removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Função para verificar status de documento
  const getStatusDocumento = (dataVencimento: string | null) => {
    if (!dataVencimento) return "ok";

    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return "vencido";
    if (diffDias <= 15) return "critico";
    if (diffDias <= 30) return "alerta";
    return "ok";
  };

  return {
    // Colaboradores vem de pessoas
    colaboradores,
    isLoadingColaboradores,
    createColaborador: createPessoa,
    updateColaborador: updatePessoa,
    toggleColaborador: toggleStatus,
    
    // Documentos
    documentos,
    isLoadingDocs,
    refetchDocs,
    createDocumento,
    updateDocumento,
    deleteDocumento,
    
    // Utils
    TIPOS_DOCUMENTO,
    getStatusDocumento,
  };
}

// Para compatibilidade com código legado - redireciona para pessoas
export function useRhColaboradores() {
  const { colaboradores, isLoadingColaboradores, createPessoa, updatePessoa, toggleStatus } = usePessoas();
  
  return {
    colaboradores: colaboradores.map(c => ({
      ...c,
      nome: c.nome_fantasia || c.razao_social || '',
      ativo: c.is_active ? 1 : 0,
    })),
    isLoading: isLoadingColaboradores,
    createColaborador: {
      mutateAsync: async (data: { nome: string; ativo?: number }) => {
        return createPessoa.mutateAsync({
          razao_social: data.nome,
          nome_fantasia: data.nome,
          is_colaborador: true,
          is_active: data.ativo !== 0,
        });
      },
      isPending: createPessoa.isPending,
    },
    updateColaborador: {
      mutateAsync: async ({ id, data }: { id: string; data: any }) => {
        return updatePessoa.mutateAsync({
          id,
          data: {
            razao_social: data.nome,
            nome_fantasia: data.nome,
          },
        });
      },
      isPending: updatePessoa.isPending,
    },
    deleteColaborador: {
      mutate: (id: string) => toggleStatus.mutate({ id, is_active: false }),
      isPending: toggleStatus.isPending,
    },
    refetch: () => {},
  };
}

// Documentos - usa colaborador_id que é pessoa_id
export function useRhDocumentos(colaboradorId?: string) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading, refetch } = useQuery({
    queryKey: ['rh_documentos', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return [];
      const { data, error } = await supabase
        .from('rh_documentos_colaborador')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .eq('ativo', 1)
        .order('tipo_documento');
      if (error) throw error;
      return data as RhDocumentoColaborador[];
    },
    enabled: !!colaboradorId,
  });

  const createDocumento = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      tipo_documento: string;
      data_emissao?: string;
      data_vencimento: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('rh_documentos_colaborador')
        .insert({ ...data, company_id: currentCompany.id, ativo: 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['rh_documentos_all'] });
      toast.success('Documento adicionado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const updateDocumento = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RhDocumentoColaborador> }) => {
      const { error } = await supabase
        .from('rh_documentos_colaborador')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['rh_documentos_all'] });
      toast.success('Documento atualizado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteDocumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rh_documentos_colaborador')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['rh_documentos_all'] });
      toast.success('Documento removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    documentos,
    isLoading,
    refetch,
    createDocumento,
    updateDocumento,
    deleteDocumento,
  };
}

// Integrações - agora usa clientes (is_cliente) como unidades
export function useRhIntegracoes() {
  const { currentCompany } = useCompany();
  const { clientes, colaboradores } = usePessoas();
  const queryClient = useQueryClient();

  const { data: integracoes = [], isLoading, refetch } = useQuery({
    queryKey: ['rh_integracoes', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('rh_integracoes')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('ativo', 1)
        .order('data_vencimento');
      if (error) throw error;
      
      // Enriquecer com dados de pessoas
      return (data as any[]).map(int => ({
        ...int,
        colaborador: colaboradores.find(c => c.id === int.colaborador_id),
        cliente: clientes.find(c => c.id === int.cliente_id),
      })) as RhIntegracao[];
    },
    enabled: !!currentCompany?.id && colaboradores.length > 0,
  });

  const createIntegracao = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      cliente_id: string;
      data_integracao: string;
      data_vencimento: string;
      observacoes?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('rh_integracoes')
        .insert({ ...data, company_id: currentCompany.id, ativo: 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_integracoes'] });
      toast.success('Integração registrada!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const updateIntegracao = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RhIntegracao> }) => {
      const { error } = await supabase
        .from('rh_integracoes')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_integracoes'] });
      toast.success('Integração atualizada!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteIntegracao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rh_integracoes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_integracoes'] });
      toast.success('Integração removida!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    integracoes,
    isLoading,
    refetch,
    createIntegracao,
    updateIntegracao,
    deleteIntegracao,
    // Listas para selects
    colaboradores,
    clientes, // unidades
  };
}

export function getStatusDocumento(dataVencimento: string | null) {
  if (!dataVencimento) return null;

  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return { label: "Vencido", variant: "destructive" as const, className: "bg-red-600" };
  } else if (diffDias <= 30) {
    return { label: "Vencendo", variant: "default" as const, className: "bg-yellow-600" };
  } else {
    return { label: "OK", variant: "default" as const, className: "bg-green-600" };
  }
}
