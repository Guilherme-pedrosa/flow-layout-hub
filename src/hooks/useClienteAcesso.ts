import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePessoas, Pessoa } from "./usePessoas";
import { toast } from "sonner";

export interface TecnicoAcesso {
  id: string;
  client_id: string;
  colaborador_id: string;
  company_id: string;
  data_inicio: string;
  data_validade: string;
  comprovante_url: string | null;
  nome_arquivo: string | null;
  is_blocked: boolean;
  motivo_bloqueio: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Enriquecido
  colaborador?: Pessoa;
  statusAcesso: 'AUTORIZADO' | 'BLOQUEADO' | 'A_VENCER';
  diasParaVencer: number;
}

export function getStatusAcesso(dataValidade: string, isBlocked: boolean): { status: 'AUTORIZADO' | 'BLOQUEADO' | 'A_VENCER'; dias: number } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade);
  validade.setHours(0, 0, 0, 0);
  const dias = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (isBlocked || dias < 0) {
    return { status: 'BLOQUEADO', dias };
  }
  if (dias <= 30) {
    return { status: 'A_VENCER', dias };
  }
  return { status: 'AUTORIZADO', dias };
}

export function useClienteAcesso(clienteId?: string) {
  const { currentCompany } = useCompany();
  const { colaboradores } = usePessoas();
  const queryClient = useQueryClient();

  // Buscar técnicos autorizados para este cliente
  const { data: tecnicos = [], isLoading, refetch } = useQuery({
    queryKey: ['cliente_acesso', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('clientes_tecnicos_acesso')
        .select('*')
        .eq('client_id', clienteId)
        .order('data_validade');
      if (error) throw error;
      
      // Enriquecer com dados do colaborador e calcular status
      return (data as any[]).map(t => {
        const colaborador = colaboradores.find(c => c.id === t.colaborador_id);
        const { status, dias } = getStatusAcesso(t.data_validade, t.is_blocked);
        return {
          ...t,
          colaborador,
          statusAcesso: status,
          diasParaVencer: dias,
        } as TecnicoAcesso;
      });
    },
    enabled: !!clienteId && colaboradores.length > 0,
  });

  // Adicionar técnico
  const addTecnico = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      data_validade: string;
      data_inicio?: string;
      comprovante_url?: string;
      nome_arquivo?: string;
      observacoes?: string;
    }) => {
      if (!clienteId || !currentCompany?.id) throw new Error('Cliente ou empresa não selecionado');
      
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('clientes_tecnicos_acesso')
        .select('id')
        .eq('client_id', clienteId)
        .eq('colaborador_id', data.colaborador_id)
        .single();

      if (existing) {
        throw new Error('Este técnico já possui acesso cadastrado para este cliente. Use a opção de editar.');
      }

      const { error } = await supabase
        .from('clientes_tecnicos_acesso')
        .insert({
          client_id: clienteId,
          company_id: currentCompany.id,
          colaborador_id: data.colaborador_id,
          data_validade: data.data_validade,
          data_inicio: data.data_inicio || new Date().toISOString().split('T')[0],
          comprovante_url: data.comprovante_url || null,
          nome_arquivo: data.nome_arquivo || null,
          observacoes: data.observacoes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_acesso', clienteId] });
      toast.success('Técnico adicionado com sucesso!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Atualizar técnico
  const updateTecnico = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TecnicoAcesso> }) => {
      const { error } = await supabase
        .from('clientes_tecnicos_acesso')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_acesso', clienteId] });
      toast.success('Acesso atualizado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Revogar acesso (bloquear)
  const revogarAcesso = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo?: string }) => {
      const { error } = await supabase
        .from('clientes_tecnicos_acesso')
        .update({ is_blocked: true, motivo_bloqueio: motivo || 'Acesso revogado' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_acesso', clienteId] });
      toast.success('Acesso revogado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Reativar acesso
  const reativarAcesso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes_tecnicos_acesso')
        .update({ is_blocked: false, motivo_bloqueio: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_acesso', clienteId] });
      toast.success('Acesso reativado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Excluir registro
  const deleteTecnico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes_tecnicos_acesso')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_acesso', clienteId] });
      toast.success('Registro removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Upload de comprovante
  const uploadComprovante = async (file: File, acessoId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${clienteId}/${acessoId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('integracao-comprovantes')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('integracao-comprovantes')
      .getPublicUrl(fileName);

    // Atualizar registro com a URL
    await updateTecnico.mutateAsync({
      id: acessoId,
      data: {
        comprovante_url: urlData.publicUrl,
        nome_arquivo: file.name,
      },
    });

    return urlData.publicUrl;
  };

  // Lista de colaboradores disponíveis (que ainda não têm acesso)
  const colaboradoresDisponiveis = colaboradores.filter(
    c => c.is_active && !tecnicos.some(t => t.colaborador_id === c.id)
  );

  return {
    tecnicos,
    isLoading,
    refetch,
    addTecnico,
    updateTecnico,
    revogarAcesso,
    reativarAcesso,
    deleteTecnico,
    uploadComprovante,
    colaboradoresDisponiveis,
    allColaboradores: colaboradores.filter(c => c.is_active),
  };
}

// Verificar se técnico tem acesso válido a um cliente (para uso na OS)
export async function verificarAcessoTecnico(clienteId: string, colaboradorId: string): Promise<{
  autorizado: boolean;
  motivo?: string;
}> {
  const { data, error } = await supabase
    .from('clientes_tecnicos_acesso')
    .select('*')
    .eq('client_id', clienteId)
    .eq('colaborador_id', colaboradorId)
    .single();

  if (error || !data) {
    // Verificar se cliente exige integração
    const { data: cliente } = await supabase
      .from('clientes')
      .select('exige_integracao')
      .eq('id', clienteId)
      .single();

    if (cliente?.exige_integracao) {
      return { autorizado: false, motivo: 'Técnico não possui integração cadastrada para este cliente' };
    }
    return { autorizado: true }; // Cliente não exige integração
  }

  const { status } = getStatusAcesso(data.data_validade, data.is_blocked);
  
  if (status === 'BLOQUEADO') {
    return { 
      autorizado: false, 
      motivo: data.is_blocked 
        ? `Acesso bloqueado: ${data.motivo_bloqueio || 'Sem motivo informado'}`
        : 'Integração vencida'
    };
  }

  return { autorizado: true };
}
