import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

// Tipos exportados para uso nas páginas
export interface TomadorNFSe {
  cpf?: string;
  cnpj?: string;
  razao_social: string;
  email?: string;
  telefone?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  uf: string;
  cep: string;
}

export interface ServicoNFSe {
  discriminacao: string;
  valor_servicos: number;
  aliquota?: number;
  item_lista_servico?: string;
  codigo_tributario_municipio?: string;
  codigo_cnae?: string;
  iss_retido?: boolean;
  valor_deducoes?: number;
  valor_pis?: number;
  valor_cofins?: number;
  valor_inss?: number;
  valor_ir?: number;
  valor_csll?: number;
}

export interface DadosNFSe {
  tomador: TomadorNFSe;
  servico: ServicoNFSe;
  natureza_operacao?: number;
  natureza_operacao_texto?: string;
  data_emissao?: string;
}

export interface RespostaNFSe {
  success: boolean;
  nfse_id?: string;
  referencia?: string;
  status?: string;
  numero?: string;
  codigo_verificacao?: string;
  url?: string;
  error?: string;
  erros?: any[];
}

export function useNFSeEmissor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentCompany } = useCompany();

  /**
   * Emite uma NFS-e via Edge Function
   */
  const emitir = async (dados: DadosNFSe): Promise<RespostaNFSe> => {
    if (!currentCompany?.id) {
      const errorMsg = 'Empresa não selecionada';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive'
      });
      return { success: false, error: errorMsg };
    }

    setLoading(true);
    setError(null);

    try {
      // Chamar Edge Function nfse-focus
      const { data, error: fnError } = await supabase.functions.invoke('nfse-focus', {
        body: {
          action: 'emitir',
          company_id: currentCompany.id,
          data: {
            tomador: dados.tomador,
            servico: dados.servico,
            natureza_operacao: dados.natureza_operacao || 1,
            natureza_operacao_texto: dados.natureza_operacao_texto || 'Prestação de serviços',
            data_emissao: dados.data_emissao || new Date().toISOString(),
          }
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success) {
        toast({
          title: 'NFS-e processada!',
          description: data.status === 'autorizado' 
            ? `Número: ${data.data?.numero}` 
            : 'Aguardando autorização da prefeitura...',
        });
      } else {
        const errorMsg = data?.error || 'Erro ao emitir NFS-e';
        toast({
          title: 'Erro ao emitir NFS-e',
          description: errorMsg,
          variant: 'destructive'
        });
        setError(errorMsg);
      }

      return data as RespostaNFSe;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao emitir NFS-e';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive'
      });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Consulta status de uma NFS-e
   */
  const consultar = async (referencia: string): Promise<RespostaNFSe> => {
    if (!currentCompany?.id) {
      return { success: false, error: 'Empresa não selecionada' };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('nfse-focus', {
        body: {
          action: 'consultar',
          company_id: currentCompany.id,
          referencia
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data as RespostaNFSe;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao consultar NFS-e';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela uma NFS-e
   */
  const cancelar = async (referencia: string, justificativa: string): Promise<RespostaNFSe> => {
    if (!currentCompany?.id) {
      return { success: false, error: 'Empresa não selecionada' };
    }

    if (!justificativa || justificativa.length < 15) {
      const errorMsg = 'Justificativa deve ter no mínimo 15 caracteres';
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive'
      });
      return { success: false, error: errorMsg };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('nfse-focus', {
        body: {
          action: 'cancelar',
          company_id: currentCompany.id,
          referencia,
          data: { justificativa }
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success) {
        toast({
          title: 'NFS-e cancelada',
          description: 'A nota foi cancelada com sucesso.',
        });
      }

      return data as RespostaNFSe;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao cancelar NFS-e';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive'
      });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva configuração de NFS-e
   */
  const salvarConfig = async (config: any): Promise<boolean> => {
    if (!currentCompany?.id) {
      toast({
        title: 'Erro',
        description: 'Empresa não selecionada',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('nfse-focus', {
        body: {
          action: 'config',
          company_id: currentCompany.id,
          data: config
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      toast({
        title: 'Configuração salva',
        description: 'Configurações de NFS-e atualizadas com sucesso.',
      });

      return true;
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao salvar configuração',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    loading,
    error,
    emitir,
    consultar,
    cancelar,
    salvarConfig,
  };
}
