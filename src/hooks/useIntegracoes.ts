import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePessoas, Pessoa } from "./usePessoas";
import { useAllColaboradorDocs, getDocStatus } from "./useColaboradorDocs";
import { toast } from "sonner";

export type IntegracaoStatus = 'ativo' | 'vencido' | 'pendente';

export interface Integracao {
  id: string;
  colaborador_id: string;
  cliente_id: string;
  company_id: string;
  data_realizacao: string;
  data_vencimento: string;
  status: IntegracaoStatus;
  comprovante_url: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Campos enriquecidos
  colaborador?: Pessoa;
  cliente?: Pessoa;
}

export interface IntegracaoComStatus extends Integracao {
  statusDocsGlobais: 'ok' | 'alerta' | 'bloqueado';
  docsVencidos: string[];
  statusFinal: 'ATIVO' | 'VENCIDO' | 'A_VENCER' | 'BLOQUEADO';
  diasParaVencer: number;
}

export function getIntegracaoStatus(dataVencimento: string): { label: string; color: 'green' | 'yellow' | 'red' } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return { label: 'Vencido', color: 'red' };
  }
  if (diffDias <= 15) {
    return { label: `Vence em ${diffDias}d`, color: 'yellow' };
  }
  return { label: 'Ativo', color: 'green' };
}

export function useIntegracoes() {
  const { currentCompany } = useCompany();
  const { colaboradores, clientes } = usePessoas();
  const { documentos: allDocs } = useAllColaboradorDocs();
  const queryClient = useQueryClient();

  const { data: integracoes = [], isLoading, refetch } = useQuery({
    queryKey: ['integracoes', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('integracoes')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('data_vencimento');
      if (error) throw error;
      return data as Integracao[];
    },
    enabled: !!currentCompany?.id,
  });

  // Enriquecer integrações com dados de pessoas e status de documentos
  const integracoesEnriquecidas: IntegracaoComStatus[] = integracoes.map(int => {
    const colaborador = colaboradores.find(c => c.id === int.colaborador_id);
    const cliente = clientes.find(c => c.id === int.cliente_id);
    
    // Verificar documentos globais do colaborador
    const docsColaborador = allDocs.filter(d => d.colaborador_id === int.colaborador_id);
    const docsVencidos: string[] = [];
    
    docsColaborador.forEach(doc => {
      const status = getDocStatus(doc.data_vencimento);
      if (status.color === 'red') {
        docsVencidos.push(doc.tipo_customizado || doc.tipo);
      }
    });

    // Calcular status da integração local
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(int.data_vencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diasParaVencer = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    // Status híbrido: considera docs globais + integração local
    let statusFinal: 'ATIVO' | 'VENCIDO' | 'A_VENCER' | 'BLOQUEADO';
    let statusDocsGlobais: 'ok' | 'alerta' | 'bloqueado' = 'ok';

    if (docsVencidos.length > 0) {
      statusDocsGlobais = 'bloqueado';
      statusFinal = 'BLOQUEADO';
    } else if (diasParaVencer < 0) {
      statusFinal = 'VENCIDO';
    } else if (diasParaVencer <= 15) {
      statusFinal = 'A_VENCER';
    } else {
      statusFinal = 'ATIVO';
    }

    return {
      ...int,
      colaborador,
      cliente,
      statusDocsGlobais,
      docsVencidos,
      statusFinal,
      diasParaVencer,
    };
  });

  const createIntegracao = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      cliente_id: string;
      data_realizacao: string;
      data_vencimento: string;
      observacoes?: string;
      comprovante_url?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Verificar duplicidade
      const { data: existing } = await supabase
        .from('integracoes')
        .select('id')
        .eq('colaborador_id', data.colaborador_id)
        .eq('cliente_id', data.cliente_id)
        .single();

      if (existing) {
        throw new Error('Já existe uma integração para este colaborador nesta unidade. Use a opção de renovar.');
      }

      const { error } = await supabase
        .from('integracoes')
        .insert({ 
          ...data, 
          company_id: currentCompany.id,
          status: 'ativo'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      toast.success('Integração registrada!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const updateIntegracao = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Integracao> }) => {
      const { error } = await supabase
        .from('integracoes')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      toast.success('Integração atualizada!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteIntegracao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integracoes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      toast.success('Integração removida!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    integracoes: integracoesEnriquecidas,
    isLoading,
    refetch,
    createIntegracao,
    updateIntegracao,
    deleteIntegracao,
    // Listas para selects
    colaboradores: colaboradores.filter(c => c.is_active),
    clientes: clientes.filter(c => c.is_active),
    allDocs,
  };
}
