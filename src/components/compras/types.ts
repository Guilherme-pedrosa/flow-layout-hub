// Tipos para o sistema de importação de XML NFe e CTe

export interface NFEItemImpostos {
  icms: { cst: string; baseCalculo: number; aliquota: number; valor: number };
  ipi: { cst: string; baseCalculo: number; aliquota: number; valor: number };
  pis: { cst: string; baseCalculo: number; aliquota: number; valor: number };
  cofins: { cst: string; baseCalculo: number; aliquota: number; valor: number };
}

export interface NFEItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfopSaida: string;
  cfopEntrada: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  impostos: NFEItemImpostos;
  productId?: string;
  criarProduto?: boolean;
}

export interface Parcela {
  numero: string;
  dataVencimento: string;
  valor: number;
}

export interface Transportador {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  endereco: string;
  cidade: string;
  uf: string;
  modalidadeFrete: string;
}

export interface NFEFornecedor {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
}

export interface NFENota {
  numero: string;
  serie: string;
  dataEmissao: string;
  valorTotal: number;
  valorProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutros: number;
  chaveAcesso: string;
  naturezaOperacao?: string;
}

export interface NFEImpostos {
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  baseCalculoIcms: number;
  baseCalculoIcmsSt: number;
  valorIcmsSt: number;
}

export interface NFEData {
  fornecedor: NFEFornecedor;
  nota: NFENota;
  transportador: Transportador | null;
  financeiro: {
    formaPagamento: string;
    parcelas: Parcela[];
  };
  impostos: NFEImpostos;
  observacoes: {
    fiscal: string;
    complementar: string;
  };
  itens: NFEItem[];
}

// Tipos para CT-e
export interface CTEPessoa {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  endereco: string;
  cidade: string;
  uf: string;
}

export interface CTETomador extends CTEPessoa {
  tipo: string;
}

export interface CTEData {
  remetente: CTEPessoa;
  destinatario: CTEPessoa;
  tomador: CTETomador;
  valorTotal: number;
  valorServico: number;
  chaveNFe: string[];
  chaveCTe: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  cfop: string;
  modalidade: string;
}
