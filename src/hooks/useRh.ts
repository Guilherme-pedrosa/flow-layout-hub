import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface RhColaborador {
  id: string;
  company_id: string;
  nome: string;
  ativo: number;
  created_at: string;
  updated_at: string;
}

export interface RhDocumentoColaborador {
  id: string;
  company_id: string;
  colaborador_id: string;
  tipo_documento: string;
  data_emissao: string | null;
  data_vencimento: string;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  ativo: number;
  created_at: string;
  updated_at: string;
}

export interface RhIntegracao {
  id: string;
  company_id: string;
  colaborador_id: string;
  cliente_id: string;
  data_integracao: string;
  data_vencimento: string;
  observacoes: string | null;
  ativo: number;
  created_at: string;
  updated_at: string;
  colaborador?: RhColaborador;
  cliente?: { razao_social: string | null; nome_fantasia: string | null };
}

export const TIPOS_DOCUMENTO = ["ASO", "NR10", "NR35", "NR33", "NR12", "NR06", "NR11", "CNH", "Outros"];

export function useRhColaboradores() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading, refetch } = useQuery({
    queryKey: ['rh_colaboradores', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('rh_colaboradores')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('nome');
      if (error) throw error;
      return data as RhColaborador[];
    },
    enabled: !!currentCompany?.id,
  });

  const createColaborador = useMutation({
    mutationFn: async (data: { nome: string; ativo?: number }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('rh_colaboradores')
        .insert({ ...data, company_id: currentCompany.id, ativo: data.ativo ?? 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_colaboradores'] });
      toast.success('Colaborador criado com sucesso!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const updateColaborador = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RhColaborador> }) => {
      const { error } = await supabase
        .from('rh_colaboradores')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_colaboradores'] });
      toast.success('Colaborador atualizado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteColaborador = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rh_colaboradores')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_colaboradores'] });
      toast.success('Colaborador removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    colaboradores,
    isLoading,
    refetch,
    createColaborador,
    updateColaborador,
    deleteColaborador,
  };
}

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
        .order('tipo_documento');
      if (error) throw error;
      return data as RhDocumentoColaborador[];
    },
    enabled: !!colaboradorId,
  });

  const { data: todosDocumentos = [] } = useQuery({
    queryKey: ['rh_documentos_all', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('rh_documentos_colaborador')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data as RhDocumentoColaborador[];
    },
    enabled: !!currentCompany?.id,
  });

  const createDocumento = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      tipo_documento: string;
      data_emissao?: string;
      data_vencimento: string;
      arquivo_url?: string;
      arquivo_nome?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('rh_documentos_colaborador')
        .insert({ ...data, company_id: currentCompany.id, ativo: 1 })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['rh_documentos_all'] });
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
    todosDocumentos,
    isLoading,
    refetch,
    createDocumento,
    updateDocumento,
    deleteDocumento,
  };
}

export function useRhIntegracoes() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: integracoes = [], isLoading, refetch } = useQuery({
    queryKey: ['rh_integracoes', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('rh_integracoes')
        .select(`
          *,
          colaborador:rh_colaboradores(id, nome),
          cliente:clientes(razao_social, nome_fantasia)
        `)
        .eq('company_id', currentCompany.id)
        .eq('ativo', 1)
        .order('data_vencimento');
      if (error) throw error;
      return data as RhIntegracao[];
    },
    enabled: !!currentCompany?.id,
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
