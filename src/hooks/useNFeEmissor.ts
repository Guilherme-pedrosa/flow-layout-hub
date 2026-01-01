import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

// Tipos exportados para uso nas páginas
export interface DestinatarioNFe {
  cpf?: string;
  cnpj?: string;
  nome: string;
  inscricao_estadual?: string;
  email?: string;
  telefone?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
  indicador_ie?: number; // 1=Contribuinte, 2=Isento, 9=Não contribuinte
}

export interface ItemNFe {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_bruto: number;
  valor_desconto?: number;
  icms_origem: string; // 0=Nacional, 1=Estrangeira importação direta, etc
  icms_situacao_tributaria: string; // CST ou CSOSN
  icms_aliquota?: number;
  icms_base_calculo?: number;
  icms_valor?: number;
  pis_situacao_tributaria: string;
  cofins_situacao_tributaria: string;
}

export interface DadosNFe {
  natureza_operacao: string;
  tipo_documento?: number; // 0=Entrada, 1=Saída
  finalidade_emissao?: number; // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  consumidor_final?: number; // 0=Normal, 1=Consumidor final
  presenca_comprador?: number; // 0=Não se aplica, 1=Presencial, etc
  destinatario: DestinatarioNFe;
  itens: ItemNFe[];
  valor_produtos: number;
  valor_frete?: number;
  valor_seguro?: number;
  valor_desconto?: number;
  valor_outras_despesas?: number;
  valor_total: number;
  modalidade_frete?: number; // 0=Emitente, 1=Destinatário, 2=Terceiros, 9=Sem frete
  informacoes_complementares?: string;
  data_emissao?: string;
}

export interface RespostaNFe {
  success: boolean;
  nfe_id?: string;
  referencia?: string;
  status?: string;
  chave?: string;
  chave_acesso?: string;
  protocolo?: string;
  numero?: number;
  serie?: number;
  danfe_url?: string;
  xml_url?: string;
  cStat?: string;
  xMotivo?: string;
  error?: string;
}

export function useNFeEmissor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentCompany } = useCompany();

  /**
   * Verifica status do serviço SEFAZ
   */
  const verificarStatus = async (): Promise<{ online: boolean; mensagem: string }> => {
    if (!currentCompany?.id) {
      return { online: false, mensagem: 'Empresa não selecionada' };
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('nfe-direto', {
        body: {
          action: 'status',
          company_id: currentCompany.id,
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return {
        online: data?.online || false,
        mensagem: data?.xMotivo || 'Status desconhecido'
      };
    } catch (err: any) {
      return { online: false, mensagem: err.message };
    }
  };

  /**
   * Emite uma NF-e diretamente na SEFAZ via Edge Function
   */
  const emitirNFe = async (dados: DadosNFe): Promise<RespostaNFe> => {
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
      // Chamar Edge Function nfe-direto
      const { data, error: fnError } = await supabase.functions.invoke('nfe-direto', {
        body: {
          action: 'emitir',
          company_id: currentCompany.id,
          data: {
            natureza_operacao: dados.natureza_operacao,
            tipo_documento: dados.tipo_documento ?? 1,
            finalidade_emissao: dados.finalidade_emissao ?? 1,
            consumidor_final: dados.consumidor_final ?? 1,
            presenca_comprador: dados.presenca_comprador ?? 1,
            destinatario: dados.destinatario,
            itens: dados.itens,
            valor_produtos: dados.valor_produtos,
            valor_frete: dados.valor_frete || 0,
            valor_seguro: dados.valor_seguro || 0,
            valor_desconto: dados.valor_desconto || 0,
            valor_outras_despesas: dados.valor_outras_despesas || 0,
            valor_total: dados.valor_total,
            modalidade_frete: dados.modalidade_frete ?? 9,
            informacoes_complementares: dados.informacoes_complementares,
            data_emissao: dados.data_emissao || new Date().toISOString(),
          }
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success) {
        toast({
          title: data.status === 'autorizada' ? 'NF-e Autorizada!' : 'NF-e em processamento',
          description: data.chave 
            ? `Chave: ${data.chave}` 
            : data.xMotivo || 'Aguardando resposta da SEFAZ...',
        });
      } else {
        const errorMsg = data?.xMotivo || data?.error || 'Erro ao emitir NF-e';
        toast({
          title: 'Erro ao emitir NF-e',
          description: `${data?.cStat ? `[${data.cStat}] ` : ''}${errorMsg}`,
          variant: 'destructive'
        });
        setError(errorMsg);
      }

      return {
        ...data,
        chave_acesso: data?.chave,
      } as RespostaNFe;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao emitir NF-e';
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
   * Consulta status de uma NF-e
   */
  const consultarNFe = async (referencia: string): Promise<RespostaNFe> => {
    if (!currentCompany?.id) {
      return { success: false, error: 'Empresa não selecionada' };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('nfe-direto', {
        body: {
          action: 'consultar',
          company_id: currentCompany.id,
          referencia
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return {
        ...data,
        chave_acesso: data?.chave,
      } as RespostaNFe;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao consultar NF-e';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela uma NF-e
   */
  const cancelarNFe = async (referencia: string, justificativa: string): Promise<RespostaNFe> => {
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
      const { data, error: fnError } = await supabase.functions.invoke('nfe-direto', {
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
          title: 'NF-e cancelada',
          description: 'A nota foi cancelada com sucesso.',
        });
      } else {
        toast({
          title: 'Erro ao cancelar',
          description: data?.xMotivo || 'Erro ao cancelar NF-e',
          variant: 'destructive'
        });
      }

      return data as RespostaNFe;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao cancelar NF-e';
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
   * Emite carta de correção
   */
  const cartaCorrecao = async (referencia: string, correcao: string): Promise<RespostaNFe> => {
    if (!currentCompany?.id) {
      return { success: false, error: 'Empresa não selecionada' };
    }

    if (!correcao || correcao.length < 15) {
      const errorMsg = 'Correção deve ter no mínimo 15 caracteres';
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
      const { data, error: fnError } = await supabase.functions.invoke('nfe-direto', {
        body: {
          action: 'carta_correcao',
          company_id: currentCompany.id,
          referencia,
          data: { correcao }
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.success) {
        toast({
          title: 'Carta de correção emitida',
          description: 'A carta de correção foi registrada com sucesso.',
        });
      } else {
        toast({
          title: 'Erro',
          description: data?.xMotivo || 'Erro ao emitir carta de correção',
          variant: 'destructive'
        });
      }

      return data as RespostaNFe;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao emitir carta de correção';
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
   * Salva configuração de NF-e
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
      const { data, error: fnError } = await supabase.functions.invoke('nfe-direto', {
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
        description: 'Configurações de NF-e atualizadas com sucesso.',
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
    verificarStatus,
    emitirNFe,
    consultarNFe,
    cancelarNFe,
    cartaCorrecao,
    salvarConfig,
  };
}
