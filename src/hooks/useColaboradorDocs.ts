import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export const TIPOS_DOCUMENTO = ['ASO', 'NR10', 'NR35', 'NR33', 'NR12', 'NR06', 'NR11', 'CNH', 'FICHA_REGISTRO', 'OUTROS'] as const;
export type TipoDocumento = typeof TIPOS_DOCUMENTO[number];

export interface ColaboradorDoc {
  id: string;
  colaborador_id: string;
  company_id: string;
  tipo: TipoDocumento;
  tipo_customizado?: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocStatus {
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  diasRestantes: number | null;
}

export function getDocStatus(dataVencimento: string | null): DocStatus {
  if (!dataVencimento) {
    return { label: 'Sem vencimento', color: 'gray', diasRestantes: null };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return { label: 'Vencido', color: 'red', diasRestantes: diffDias };
  }
  if (diffDias <= 15) {
    return { label: `Vence em ${diffDias}d`, color: 'red', diasRestantes: diffDias };
  }
  if (diffDias <= 30) {
    return { label: `Vence em ${diffDias}d`, color: 'yellow', diasRestantes: diffDias };
  }
  return { label: 'Em dia', color: 'green', diasRestantes: diffDias };
}

export function useColaboradorDocs(colaboradorId?: string) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading, refetch } = useQuery({
    queryKey: ['colaborador_docs', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return [];
      const { data, error } = await supabase
        .from('colaborador_docs')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .order('tipo');
      if (error) throw error;
      return data as ColaboradorDoc[];
    },
    enabled: !!colaboradorId,
  });

  const createDoc = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      tipo: TipoDocumento;
      tipo_customizado?: string;
      data_emissao?: string | null;
      data_vencimento?: string | null;
      arquivo_url?: string | null;
      arquivo_nome?: string | null;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await supabase
        .from('colaborador_docs')
        .insert({ 
          ...data,
          company_id: currentCompany.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador_docs'] });
      queryClient.invalidateQueries({ queryKey: ['all_colaborador_docs'] });
      toast.success('Documento adicionado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const updateDoc = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ColaboradorDoc> }) => {
      const { error } = await supabase
        .from('colaborador_docs')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador_docs'] });
      queryClient.invalidateQueries({ queryKey: ['all_colaborador_docs'] });
      toast.success('Documento atualizado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaborador_docs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador_docs'] });
      queryClient.invalidateQueries({ queryKey: ['all_colaborador_docs'] });
      toast.success('Documento removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Upload de arquivo para o Storage
  const uploadArquivo = async (file: File, colaboradorId: string, tipo: string): Promise<{ url: string; nome: string }> => {
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${colaboradorId}/${tipo}_${timestamp}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('colaborador-docs')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('colaborador-docs')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, nome: file.name };
  };

  // Criar ou atualizar documento com arquivo (sempre substitui pelo mais recente)
  const upsertDocComArquivo = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      tipo: TipoDocumento;
      tipo_customizado?: string;
      data_emissao?: string | null;
      data_vencimento: string;
      arquivo: File;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      // Upload do arquivo
      const { url, nome } = await uploadArquivo(data.arquivo, data.colaborador_id, data.tipo);

      // Verificar se já existe documento deste tipo
      const docExistente = documentos.find(d => d.tipo === data.tipo);

      if (docExistente) {
        // Atualizar o existente (substituir pelo válido)
        const { error } = await supabase
          .from('colaborador_docs')
          .update({
            data_emissao: data.data_emissao || null,
            data_vencimento: data.data_vencimento,
            arquivo_url: url,
            arquivo_nome: nome,
            tipo_customizado: data.tipo === 'OUTROS' ? data.tipo_customizado : null,
          })
          .eq('id', docExistente.id);
        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('colaborador_docs')
          .insert({
            colaborador_id: data.colaborador_id,
            company_id: currentCompany.id,
            tipo: data.tipo,
            tipo_customizado: data.tipo === 'OUTROS' ? data.tipo_customizado : null,
            data_emissao: data.data_emissao || null,
            data_vencimento: data.data_vencimento,
            arquivo_url: url,
            arquivo_nome: nome,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador_docs'] });
      queryClient.invalidateQueries({ queryKey: ['all_colaborador_docs'] });
      toast.success('Documento salvo com sucesso!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    documentos,
    isLoading,
    refetch,
    createDoc,
    updateDoc,
    deleteDoc,
    uploadArquivo,
    upsertDocComArquivo,
  };
}

// Hook para buscar todos os documentos da empresa (para visão geral)
export function useAllColaboradorDocs() {
  const { currentCompany } = useCompany();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['all_colaborador_docs', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('colaborador_docs')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data as ColaboradorDoc[];
    },
    enabled: !!currentCompany?.id,
  });

  return { documentos, isLoading };
}
