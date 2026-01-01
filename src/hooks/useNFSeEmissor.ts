import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

// URL do microserviço de NF-e (configurar no .env)
const NFE_SERVICE_URL = import.meta.env.VITE_NFE_SERVICE_URL || 'http://localhost:3001';

// Tipos
export interface ConfigNFSe {
  cnpj: string;
  inscricaoMunicipal: string;
  razaoSocial: string;
  nomeFantasia?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  email?: string;
  certificadoBase64: string;
  certificadoSenha: string;
  ambiente: 'producao' | 'homologacao';
  serieNFSe: number;
}

export interface TomadorNFSe {
  cpfCnpj: string;
  inscricaoMunicipal?: string;
  razaoSocial: string;
  email?: string;
  telefone?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
}

export interface ServicoNFSe {
  codigoServico: string;
  discriminacao: string;
  valorServicos: number;
  valorDeducoes?: number;
  valorPis?: number;
  valorCofins?: number;
  valorInss?: number;
  valorIr?: number;
  valorCsll?: number;
  valorIss?: number;
  aliquotaIss?: number;
  issRetido: boolean;
  codigoMunicipioIncidencia?: string;
}

export interface DadosNFSe {
  tomador: TomadorNFSe;
  servico: ServicoNFSe;
  naturezaOperacao: number;
  regimeEspecialTributacao?: number;
  optanteSimplesNacional: boolean;
  incentivadorCultural: boolean;
  informacoesComplementares?: string;
}

export interface RespostaNFSe {
  sucesso: boolean;
  status: string;
  motivo?: string;
  numeroNfse?: string;
  codigoVerificacao?: string;
  dataEmissao?: string;
  linkNfse?: string;
  xml?: string;
  erros?: string[];
}

export function useNFSeEmissor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentCompany } = useCompany();

  /**
   * Busca a configuração de NFS-e da empresa atual
   */
  const getConfig = async (): Promise<ConfigNFSe | null> => {
    if (!currentCompany?.id) {
      setError('Empresa não selecionada');
      return null;
    }

    try {
      // Buscar configuração da empresa
      const { data: configData, error: configError } = await supabase
        .from('nfse_config')
        .select('*')
        .eq('company_id', currentCompany.id)
        .single();

      if (configError || !configData) {
        setError('Configuração de NFS-e não encontrada. Configure primeiro em Configurações > NFS-e');
        return null;
      }

      // Buscar certificado
      const { data: certData, error: certError } = await supabase
        .from('certificados_digitais')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (certError || !certData) {
        setError('Certificado digital não encontrado. Faça o upload em Configurações > Certificado Digital');
        return null;
      }

      const ambiente = configData.ambiente === 'producao' ? 'producao' : 'homologacao';
      const serieNfse = typeof configData.serie_nfse === 'number' ? configData.serie_nfse : parseInt(String(configData.serie_nfse)) || 1;

      return {
        cnpj: currentCompany.cnpj || '',
        inscricaoMunicipal: configData.inscricao_municipal || '',
        razaoSocial: currentCompany.razao_social || currentCompany.name,
        nomeFantasia: currentCompany.name,
        logradouro: (currentCompany as any).endereco || '',
        numero: '',
        complemento: '',
        bairro: '',
        codigoMunicipio: configData.codigo_municipio || '',
        municipio: currentCompany.cidade || '',
        uf: currentCompany.estado || '',
        cep: (currentCompany as any).cep || '',
        telefone: (currentCompany as any).telefone || '',
        email: (currentCompany as any).email || '',
        certificadoBase64: certData.certificado_base64 || '',
        certificadoSenha: certData.senha || '',
        ambiente,
        serieNFSe: serieNfse
      };
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  /**
   * Emite uma NFS-e
   */
  const emitir = async (dados: DadosNFSe): Promise<RespostaNFSe> => {
    setLoading(true);
    setError(null);

    try {
      const config = await getConfig();
      if (!config) {
        return { sucesso: false, status: 'ERRO', motivo: error || 'Configuração não encontrada' };
      }

      // Buscar próximo número
      const { data: ultimoNumero } = await supabase
        .from('nfse_emitidas')
        .select('numero')
        .eq('company_id', currentCompany?.id)
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();

      const numeroAtual = typeof ultimoNumero?.numero === 'number' ? ultimoNumero.numero : 0;
      const proximoNumero = numeroAtual + 1;

      // Chamar API do microserviço
      const response = await fetch(`${NFE_SERVICE_URL}/nfse/emitir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, dados, numero: proximoNumero })
      });

      const resultado: RespostaNFSe = await response.json();

      if (resultado.sucesso) {
        // Salvar no banco
        await supabase.from('nfse_emitidas').insert([{
          company_id: currentCompany?.id,
          referencia: `NFSE-${Date.now()}`,
          numero: String(proximoNumero),
          serie: String(config.serieNFSe),
          chave_acesso: resultado.codigoVerificacao,
          tomador_cpf_cnpj: dados.tomador.cpfCnpj,
          tomador_nome: dados.tomador.razaoSocial,
          valor_servicos: dados.servico.valorServicos,
          valor_iss: dados.servico.valorIss,
          codigo_servico: dados.servico.codigoServico,
          discriminacao_servicos: dados.servico.discriminacao,
          status: 'AUTORIZADA',
          data_emissao: new Date().toISOString(),
          xml_url: resultado.xml
        }]);

        toast({
          title: 'NFS-e emitida com sucesso!',
          description: `Número: ${resultado.numeroNfse}`,
        });
      } else {
        toast({
          title: 'Erro ao emitir NFS-e',
          description: resultado.motivo,
          variant: 'destructive'
        });
      }

      return resultado;
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao emitir NFS-e';
      setError(errorMsg);
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive'
      });
      return { sucesso: false, status: 'ERRO', motivo: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Consulta uma NFS-e
   */
  const consultar = async (chaveAcesso: string): Promise<RespostaNFSe> => {
    setLoading(true);
    setError(null);

    try {
      const config = await getConfig();
      if (!config) {
        return { sucesso: false, status: 'ERRO', motivo: error || 'Configuração não encontrada' };
      }

      const response = await fetch(`${NFE_SERVICE_URL}/nfse/consultar/${chaveAcesso}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return await response.json();
    } catch (err: any) {
      setError(err.message);
      return { sucesso: false, status: 'ERRO', motivo: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela uma NFS-e
   */
  const cancelar = async (chaveAcesso: string, justificativa: string): Promise<RespostaNFSe> => {
    setLoading(true);
    setError(null);

    try {
      const config = await getConfig();
      if (!config) {
        return { sucesso: false, status: 'ERRO', motivo: error || 'Configuração não encontrada' };
      }

      if (justificativa.length < 15) {
        return { sucesso: false, status: 'ERRO', motivo: 'Justificativa deve ter no mínimo 15 caracteres' };
      }

      const response = await fetch(`${NFE_SERVICE_URL}/nfse/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, chaveAcesso, justificativa })
      });

      const resultado: RespostaNFSe = await response.json();

      if (resultado.sucesso) {
        // Atualizar status no banco
        await supabase
          .from('nfse_emitidas')
          .update({ status: 'CANCELADA', data_cancelamento: new Date().toISOString() })
          .eq('chave_acesso', chaveAcesso);

        toast({
          title: 'NFS-e cancelada com sucesso!',
        });
      } else {
        toast({
          title: 'Erro ao cancelar NFS-e',
          description: resultado.motivo,
          variant: 'destructive'
        });
      }

      return resultado;
    } catch (err: any) {
      setError(err.message);
      return { sucesso: false, status: 'ERRO', motivo: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valida dados antes de emitir
   */
  const validar = async (dados: DadosNFSe): Promise<{ valido: boolean; erros: string[] }> => {
    try {
      const config = await getConfig();
      if (!config) {
        return { valido: false, erros: [error || 'Configuração não encontrada'] };
      }

      const response = await fetch(`${NFE_SERVICE_URL}/nfse/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, dados })
      });

      const resultado = await response.json();
      return { valido: resultado.valido, erros: resultado.erros || [] };
    } catch (err: any) {
      return { valido: false, erros: [err.message] };
    }
  };

  /**
   * Lista NFS-e emitidas
   */
  const listar = async (filtros?: { dataInicio?: string; dataFim?: string; status?: string }) => {
    setLoading(true);

    try {
      let query = supabase
        .from('nfse_emitidas')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('data_emissao', { ascending: false });

      if (filtros?.dataInicio) {
        query = query.gte('data_emissao', filtros.dataInicio);
      }
      if (filtros?.dataFim) {
        query = query.lte('data_emissao', filtros.dataFim);
      }
      if (filtros?.status) {
        query = query.eq('status', filtros.status);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    emitir,
    consultar,
    cancelar,
    validar,
    listar
  };
}
