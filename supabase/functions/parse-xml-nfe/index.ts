import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NFEItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfopSaida: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  // Impostos do item
  impostos: {
    icms: { cst: string; baseCalculo: number; aliquota: number; valor: number };
    ipi: { cst: string; baseCalculo: number; aliquota: number; valor: number };
    pis: { cst: string; baseCalculo: number; aliquota: number; valor: number };
    cofins: { cst: string; baseCalculo: number; aliquota: number; valor: number };
  };
}

interface Parcela {
  numero: string;
  dataVencimento: string;
  valor: number;
}

interface Transportador {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  endereco: string;
  cidade: string;
  uf: string;
  modalidadeFrete: string;
}

interface NFEData {
  fornecedor: {
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
  };
  nota: {
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
  };
  transportador: Transportador | null;
  financeiro: {
    formaPagamento: string;
    parcelas: Parcela[];
  };
  impostos: {
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
    baseCalculoIcms: number;
    baseCalculoIcmsSt: number;
    valorIcmsSt: number;
  };
  observacoes: {
    fiscal: string;
    complementar: string;
  };
  itens: NFEItem[];
}

function extractTextContent(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractItemTaxes(detContent: string) {
  const impostoMatch = detContent.match(/<imposto>([\s\S]*?)<\/imposto>/i);
  const impostoContent = impostoMatch ? impostoMatch[1] : '';
  
  // ICMS
  const icmsMatch = impostoContent.match(/<ICMS>([\s\S]*?)<\/ICMS>/i);
  const icmsContent = icmsMatch ? icmsMatch[1] : '';
  const icmsCst = extractTextContent(icmsContent, 'CST') || extractTextContent(icmsContent, 'CSOSN') || '';
  const icmsBase = parseFloat(extractTextContent(icmsContent, 'vBC')) || 0;
  const icmsAliq = parseFloat(extractTextContent(icmsContent, 'pICMS')) || 0;
  const icmsValor = parseFloat(extractTextContent(icmsContent, 'vICMS')) || 0;

  // IPI
  const ipiMatch = impostoContent.match(/<IPI>([\s\S]*?)<\/IPI>/i);
  const ipiContent = ipiMatch ? ipiMatch[1] : '';
  const ipiCst = extractTextContent(ipiContent, 'CST') || '';
  const ipiBase = parseFloat(extractTextContent(ipiContent, 'vBC')) || 0;
  const ipiAliq = parseFloat(extractTextContent(ipiContent, 'pIPI')) || 0;
  const ipiValor = parseFloat(extractTextContent(ipiContent, 'vIPI')) || 0;

  // PIS
  const pisMatch = impostoContent.match(/<PIS>([\s\S]*?)<\/PIS>/i);
  const pisContent = pisMatch ? pisMatch[1] : '';
  const pisCst = extractTextContent(pisContent, 'CST') || '';
  const pisBase = parseFloat(extractTextContent(pisContent, 'vBC')) || 0;
  const pisAliq = parseFloat(extractTextContent(pisContent, 'pPIS')) || 0;
  const pisValor = parseFloat(extractTextContent(pisContent, 'vPIS')) || 0;

  // COFINS
  const cofinsMatch = impostoContent.match(/<COFINS>([\s\S]*?)<\/COFINS>/i);
  const cofinsContent = cofinsMatch ? cofinsMatch[1] : '';
  const cofinsCst = extractTextContent(cofinsContent, 'CST') || '';
  const cofinsBase = parseFloat(extractTextContent(cofinsContent, 'vBC')) || 0;
  const cofinsAliq = parseFloat(extractTextContent(cofinsContent, 'pCOFINS')) || 0;
  const cofinsValor = parseFloat(extractTextContent(cofinsContent, 'vCOFINS')) || 0;

  return {
    icms: { cst: icmsCst, baseCalculo: icmsBase, aliquota: icmsAliq, valor: icmsValor },
    ipi: { cst: ipiCst, baseCalculo: ipiBase, aliquota: ipiAliq, valor: ipiValor },
    pis: { cst: pisCst, baseCalculo: pisBase, aliquota: pisAliq, valor: pisValor },
    cofins: { cst: cofinsCst, baseCalculo: cofinsBase, aliquota: cofinsAliq, valor: cofinsValor },
  };
}

function extractAllItems(xml: string): NFEItem[] {
  const items: NFEItem[] = [];
  
  const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/gi;
  let detMatch;
  
  while ((detMatch = detRegex.exec(xml)) !== null) {
    const detContent = detMatch[1];
    
    const prodMatch = detContent.match(/<prod>([\s\S]*?)<\/prod>/i);
    if (prodMatch) {
      const prodContent = prodMatch[1];
      
      const item: NFEItem = {
        codigo: extractTextContent(prodContent, 'cProd'),
        descricao: extractTextContent(prodContent, 'xProd'),
        ncm: extractTextContent(prodContent, 'NCM'),
        cfopSaida: extractTextContent(prodContent, 'CFOP'),
        unidade: extractTextContent(prodContent, 'uCom'),
        quantidade: parseFloat(extractTextContent(prodContent, 'qCom')) || 0,
        valorUnitario: parseFloat(extractTextContent(prodContent, 'vUnCom')) || 0,
        valorTotal: parseFloat(extractTextContent(prodContent, 'vProd')) || 0,
        impostos: extractItemTaxes(detContent),
      };
      
      items.push(item);
    }
  }
  
  return items;
}

function extractParcelas(xml: string): Parcela[] {
  const parcelas: Parcela[] = [];
  
  // Try <cobr> (cobrança) first
  const cobrMatch = xml.match(/<cobr>([\s\S]*?)<\/cobr>/i);
  if (cobrMatch) {
    const dupRegex = /<dup>([\s\S]*?)<\/dup>/gi;
    let dupMatch;
    
    while ((dupMatch = dupRegex.exec(cobrMatch[1])) !== null) {
      const dupContent = dupMatch[1];
      parcelas.push({
        numero: extractTextContent(dupContent, 'nDup'),
        dataVencimento: extractTextContent(dupContent, 'dVenc'),
        valor: parseFloat(extractTextContent(dupContent, 'vDup')) || 0,
      });
    }
  }
  
  // Also try <pag> (pagamento) - newer format
  if (parcelas.length === 0) {
    const pagMatch = xml.match(/<pag>([\s\S]*?)<\/pag>/i);
    if (pagMatch) {
      const detPagRegex = /<detPag>([\s\S]*?)<\/detPag>/gi;
      let detPagMatch;
      let numero = 1;
      
      while ((detPagMatch = detPagRegex.exec(pagMatch[1])) !== null) {
        const detPagContent = detPagMatch[1];
        parcelas.push({
          numero: String(numero++),
          dataVencimento: extractTextContent(detPagContent, 'dPag') || '',
          valor: parseFloat(extractTextContent(detPagContent, 'vPag')) || 0,
        });
      }
    }
  }
  
  return parcelas;
}

function extractTransportador(xml: string): Transportador | null {
  const transpMatch = xml.match(/<transp>([\s\S]*?)<\/transp>/i);
  if (!transpMatch) return null;
  
  const transpContent = transpMatch[1];
  
  // Modalidade do frete
  const modFreteMap: Record<string, string> = {
    '0': 'Por conta do Emitente',
    '1': 'Por conta do Destinatário',
    '2': 'Por conta de Terceiros',
    '3': 'Próprio por conta do Remetente',
    '4': 'Próprio por conta do Destinatário',
    '9': 'Sem Frete',
  };
  const modFrete = extractTextContent(transpContent, 'modFrete');
  
  // Transportador
  const transportaMatch = transpContent.match(/<transporta>([\s\S]*?)<\/transporta>/i);
  if (!transportaMatch) {
    return {
      cnpj: '',
      razaoSocial: '',
      inscricaoEstadual: '',
      endereco: '',
      cidade: '',
      uf: '',
      modalidadeFrete: modFreteMap[modFrete] || modFrete,
    };
  }
  
  const transportaContent = transportaMatch[1];
  
  return {
    cnpj: extractTextContent(transportaContent, 'CNPJ') || extractTextContent(transportaContent, 'CPF'),
    razaoSocial: extractTextContent(transportaContent, 'xNome'),
    inscricaoEstadual: extractTextContent(transportaContent, 'IE'),
    endereco: extractTextContent(transportaContent, 'xEnder'),
    cidade: extractTextContent(transportaContent, 'xMun'),
    uf: extractTextContent(transportaContent, 'UF'),
    modalidadeFrete: modFreteMap[modFrete] || modFrete,
  };
}

function extractFormaPagamento(xml: string): string {
  const pagMatch = xml.match(/<pag>([\s\S]*?)<\/pag>/i);
  if (!pagMatch) return '';
  
  const tPagMap: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '14': 'Duplicata Mercantil',
    '15': 'Boleto Bancário',
    '16': 'Depósito Bancário',
    '17': 'PIX',
    '18': 'Transferência Bancária',
    '19': 'Programa de Fidelidade',
    '90': 'Sem pagamento',
    '99': 'Outros',
  };
  
  const tPag = extractTextContent(pagMatch[1], 'tPag');
  return tPagMap[tPag] || tPag;
}

function parseNFEXml(xmlContent: string): NFEData {
  // Extract supplier info from <emit> tag
  const emitMatch = xmlContent.match(/<emit>([\s\S]*?)<\/emit>/i);
  const emitContent = emitMatch ? emitMatch[1] : '';
  
  const enderMatch = emitContent.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/i);
  const enderContent = enderMatch ? enderMatch[1] : '';
  
  const logradouro = extractTextContent(enderContent, 'xLgr');
  const numero = extractTextContent(enderContent, 'nro');
  const endereco = [logradouro, numero].filter(Boolean).join(', ');

  // Extract invoice info from <ide> tag
  const ideMatch = xmlContent.match(/<ide>([\s\S]*?)<\/ide>/i);
  const ideContent = ideMatch ? ideMatch[1] : '';
  
  // Extract chave de acesso
  const infNFeMatch = xmlContent.match(/<infNFe[^>]*Id="NFe(\d+)"[^>]*>/i);
  const chaveAcesso = infNFeMatch ? infNFeMatch[1] : '';
  
  // Extract totals from <ICMSTot>
  const icmsTotMatch = xmlContent.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i);
  const icmsTotContent = icmsTotMatch ? icmsTotMatch[1] : '';
  
  // Format date
  const dataEmissaoRaw = extractTextContent(ideContent, 'dhEmi') || extractTextContent(ideContent, 'dEmi');
  const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.split('T')[0] : '';
  
  // Extract observations
  const infAdicMatch = xmlContent.match(/<infAdic>([\s\S]*?)<\/infAdic>/i);
  const infAdicContent = infAdicMatch ? infAdicMatch[1] : '';
  const infAdFisco = extractTextContent(infAdicContent, 'infAdFisco');
  const infCpl = extractTextContent(infAdicContent, 'infCpl');

  const nfeData: NFEData = {
    fornecedor: {
      cnpj: extractTextContent(emitContent, 'CNPJ'),
      razaoSocial: extractTextContent(emitContent, 'xNome'),
      nomeFantasia: extractTextContent(emitContent, 'xFant'),
      inscricaoEstadual: extractTextContent(emitContent, 'IE'),
      endereco: endereco,
      bairro: extractTextContent(enderContent, 'xBairro'),
      cidade: extractTextContent(enderContent, 'xMun'),
      uf: extractTextContent(enderContent, 'UF'),
      cep: extractTextContent(enderContent, 'CEP'),
      telefone: extractTextContent(emitContent, 'fone'),
      email: extractTextContent(emitContent, 'email'),
    },
    nota: {
      numero: extractTextContent(ideContent, 'nNF'),
      serie: extractTextContent(ideContent, 'serie'),
      dataEmissao: dataEmissao,
      valorTotal: parseFloat(extractTextContent(icmsTotContent, 'vNF')) || 0,
      valorProdutos: parseFloat(extractTextContent(icmsTotContent, 'vProd')) || 0,
      valorFrete: parseFloat(extractTextContent(icmsTotContent, 'vFrete')) || 0,
      valorSeguro: parseFloat(extractTextContent(icmsTotContent, 'vSeg')) || 0,
      valorDesconto: parseFloat(extractTextContent(icmsTotContent, 'vDesc')) || 0,
      valorOutros: parseFloat(extractTextContent(icmsTotContent, 'vOutro')) || 0,
      chaveAcesso: chaveAcesso,
    },
    transportador: extractTransportador(xmlContent),
    financeiro: {
      formaPagamento: extractFormaPagamento(xmlContent),
      parcelas: extractParcelas(xmlContent),
    },
    impostos: {
      icms: parseFloat(extractTextContent(icmsTotContent, 'vICMS')) || 0,
      ipi: parseFloat(extractTextContent(icmsTotContent, 'vIPI')) || 0,
      pis: parseFloat(extractTextContent(icmsTotContent, 'vPIS')) || 0,
      cofins: parseFloat(extractTextContent(icmsTotContent, 'vCOFINS')) || 0,
      baseCalculoIcms: parseFloat(extractTextContent(icmsTotContent, 'vBC')) || 0,
      baseCalculoIcmsSt: parseFloat(extractTextContent(icmsTotContent, 'vBCST')) || 0,
      valorIcmsSt: parseFloat(extractTextContent(icmsTotContent, 'vST')) || 0,
    },
    observacoes: {
      fiscal: infAdFisco,
      complementar: infCpl,
    },
    itens: extractAllItems(xmlContent),
  };

  return nfeData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { xmlContent } = await req.json();
    
    if (!xmlContent) {
      console.error('XML content is missing');
      return new Response(
        JSON.stringify({ error: 'XML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing XML NFe...');
    console.log('XML length:', xmlContent.length);
    
    const nfeData = parseNFEXml(xmlContent);
    
    console.log('Parsed NFe data:', {
      fornecedor: nfeData.fornecedor.razaoSocial,
      fornecedorCNPJ: nfeData.fornecedor.cnpj,
      fornecedorUF: nfeData.fornecedor.uf,
      fornecedorCidade: nfeData.fornecedor.cidade,
      nota: nfeData.nota.numero,
      itensCount: nfeData.itens.length,
      parcelasCount: nfeData.financeiro.parcelas.length,
      transportador: nfeData.transportador?.razaoSocial || 'N/A',
    });

    return new Response(
      JSON.stringify({ success: true, data: nfeData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error parsing XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
