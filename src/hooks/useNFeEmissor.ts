import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Tipos
export interface EmpresaConfigNFe {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  cnae?: string;
  regimeTributario: 1 | 2 | 3;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone?: string;
  certificadoBase64: string;
  certificadoSenha: string;
  ambiente: 1 | 2;
  serieNFe: number;
  serieNFCe: number;
}

export interface DestinatarioNFe {
  cpfCnpj: string;
  nome: string;
  inscricaoEstadual?: string;
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
  indIEDest: 1 | 2 | 9;
}

export interface ItemNFe {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto?: number;
  origem: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  cstIcms: string;
  aliquotaIcms?: number;
  baseCalculoIcms?: number;
  valorIcms?: number;
  cstPis: string;
  cstCofins: string;
}

export interface DadosNFe {
  naturezaOperacao: string;
  tipoOperacao: 0 | 1;
  finalidade: 1 | 2 | 3 | 4;
  consumidorFinal: 0 | 1;
  presencaComprador: 0 | 1 | 2 | 3 | 4 | 5 | 9;
  destinatario: DestinatarioNFe;
  itens: ItemNFe[];
  valorProdutos: number;
  valorFrete?: number;
  valorSeguro?: number;
  valorDesconto?: number;
  valorOutrasDespesas?: number;
  valorTotal: number;
  transporte: {
    modalidadeFrete: 0 | 1 | 2 | 3 | 4 | 9;
    transportadora?: {
      cnpjCpf?: string;
      nome?: string;
      inscricaoEstadual?: string;
      endereco?: string;
      municipio?: string;
      uf?: string;
    };
  };
  pagamentos: {
    indicadorPagamento: 0 | 1;
    formaPagamento: string;
    valor: number;
  }[];
  informacoesComplementares?: string;
  nfeReferenciada?: string[];
}

export interface RespostaEmissao {
  sucesso: boolean;
  status: string;
  motivo?: string;
  chaveAcesso?: string;
  protocolo?: string;
  numero?: number;
  serie?: number;
  dataEmissao?: string;
  dataAutorizacao?: string;
  xml?: string;
  xmlBase64?: string;
  erros?: string[];
}

// URL do serviço de NF-e (configurar no .env)
const NFE_SERVICE_URL = import.meta.env.VITE_NFE_SERVICE_URL || 'http://localhost:3001';
const NFE_API_KEY = import.meta.env.VITE_NFE_API_KEY || '';

export function useNFeEmissor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const makeRequest = async (endpoint: string, data: any) => {
    const response = await fetch(`${NFE_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': NFE_API_KEY
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na requisição');
    }

    return response.json();
  };

  /**
   * Consulta status do serviço SEFAZ
   */
  const consultarStatusServico = async (config: EmpresaConfigNFe) => {
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await makeRequest('/nfe/status', { config });
      
      if (resultado.online) {
        toast({
          title: 'SEFAZ Online',
          description: resultado.motivo,
        });
      } else {
        toast({
          title: 'SEFAZ Offline',
          description: resultado.motivo,
          variant: 'destructive'
        });
      }
      
      return resultado;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Emite uma NF-e
   */
  const emitirNFe = async (config: EmpresaConfigNFe, dados: DadosNFe, numero: number, serie?: number): Promise<RespostaEmissao> => {
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await makeRequest('/nfe/emitir', { config, dados, numero, serie });
      
      if (resultado.sucesso) {
        toast({
          title: 'NF-e Emitida',
          description: `Nota ${numero} autorizada. Chave: ${resultado.chaveAcesso}`,
        });
      } else {
        toast({
          title: 'Erro na Emissão',
          description: resultado.motivo || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
      
      return resultado;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Consulta uma NF-e pela chave de acesso
   */
  const consultarNFe = async (config: EmpresaConfigNFe, chaveAcesso: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await makeRequest('/nfe/consultar', { config, chaveAcesso });
      return resultado;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancela uma NF-e
   */
  const cancelarNFe = async (config: EmpresaConfigNFe, chaveAcesso: string, justificativa: string, protocolo: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await makeRequest('/nfe/cancelar', { config, chaveAcesso, justificativa, protocolo });
      
      if (resultado.sucesso) {
        toast({
          title: 'NF-e Cancelada',
          description: `Nota cancelada com sucesso. Protocolo: ${resultado.protocolo}`,
        });
      } else {
        toast({
          title: 'Erro no Cancelamento',
          description: resultado.motivo || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
      
      return resultado;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Emite carta de correção
   */
  const emitirCartaCorrecao = async (config: EmpresaConfigNFe, chaveAcesso: string, correcao: string, sequencia?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await makeRequest('/nfe/carta-correcao', { config, chaveAcesso, correcao, sequencia });
      
      if (resultado.sucesso) {
        toast({
          title: 'Carta de Correção Emitida',
          description: `Correção registrada. Protocolo: ${resultado.protocolo}`,
        });
      } else {
        toast({
          title: 'Erro na Carta de Correção',
          description: resultado.motivo || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
      
      return resultado;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inutiliza numeração
   */
  const inutilizarNumeracao = async (config: EmpresaConfigNFe, serie: number, numeroInicial: number, numeroFinal: number, justificativa: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const resultado = await makeRequest('/nfe/inutilizar', { config, serie, numeroInicial, numeroFinal, justificativa });
      
      if (resultado.sucesso) {
        toast({
          title: 'Numeração Inutilizada',
          description: `Números ${numeroInicial} a ${numeroFinal} inutilizados.`,
        });
      } else {
        toast({
          title: 'Erro na Inutilização',
          description: resultado.motivo || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
      
      return resultado;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gera DANFE (PDF)
   */
  const gerarDanfe = async (chaveAcesso: string): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${NFE_SERVICE_URL}/danfe/${chaveAcesso}/base64`, {
        headers: {
          'X-API-Key': NFE_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar DANFE');
      }

      const resultado = await response.json();
      return resultado.pdfBase64;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Abre DANFE em nova aba
   */
  const abrirDanfe = (chaveAcesso: string) => {
    window.open(`${NFE_SERVICE_URL}/danfe/${chaveAcesso}?api_key=${NFE_API_KEY}`, '_blank');
  };

  /**
   * Download do XML
   */
  const downloadXml = (chaveAcesso: string) => {
    window.open(`${NFE_SERVICE_URL}/nfe/xml/${chaveAcesso}?api_key=${NFE_API_KEY}`, '_blank');
  };

  /**
   * Upload de certificado digital
   */
  const uploadCertificado = async (file: File): Promise<{ certificadoBase64: string; nomeArquivo: string }> => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('certificado', file);

      const response = await fetch(`${NFE_SERVICE_URL}/nfe/upload-certificado`, {
        method: 'POST',
        headers: {
          'X-API-Key': NFE_API_KEY
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do certificado');
      }

      const resultado = await response.json();
      
      toast({
        title: 'Certificado Carregado',
        description: `Arquivo ${resultado.nomeArquivo} carregado com sucesso.`,
      });
      
      return resultado;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Erro',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    consultarStatusServico,
    emitirNFe,
    consultarNFe,
    cancelarNFe,
    emitirCartaCorrecao,
    inutilizarNumeracao,
    gerarDanfe,
    abrirDanfe,
    downloadXml,
    uploadCertificado
  };
}
