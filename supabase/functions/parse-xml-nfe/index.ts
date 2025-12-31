import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.2";

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
    naturezaOperacao: string;
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

// Helper function to safely get a value from an object, returning empty string if undefined
function safeGet(obj: unknown, ...keys: string[]): string {
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current !== null && current !== undefined ? String(current) : '';
}

// Helper function to safely get a number from an object
function safeGetNumber(obj: unknown, ...keys: string[]): number {
  const value = safeGet(obj, ...keys);
  return parseFloat(value) || 0;
}

// Helper to ensure we always get an array (NFe can have single item or array)
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// Extract ICMS data from any ICMS variant (ICMS00, ICMS10, ICMS20, etc.)
function extractIcmsData(icmsObj: Record<string, unknown> | undefined): { cst: string; baseCalculo: number; aliquota: number; valor: number } {
  if (!icmsObj) return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
  
  // ICMS can be in ICMS00, ICMS10, ICMS20, ICMS40, ICMS51, ICMS60, ICMS70, ICMS90, ICMSSN101, etc.
  const icmsVariants = ['ICMS00', 'ICMS10', 'ICMS20', 'ICMS30', 'ICMS40', 'ICMS41', 'ICMS50', 'ICMS51', 'ICMS60', 'ICMS70', 'ICMS90', 
                        'ICMSSN101', 'ICMSSN102', 'ICMSSN201', 'ICMSSN202', 'ICMSSN500', 'ICMSSN900'];
  
  for (const variant of icmsVariants) {
    const icmsData = icmsObj[variant] as Record<string, unknown> | undefined;
    if (icmsData) {
      return {
        cst: safeGet(icmsData, 'CST') || safeGet(icmsData, 'CSOSN'),
        baseCalculo: safeGetNumber(icmsData, 'vBC'),
        aliquota: safeGetNumber(icmsData, 'pICMS'),
        valor: safeGetNumber(icmsData, 'vICMS'),
      };
    }
  }
  
  return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
}

// Extract IPI data from any IPI variant
function extractIpiData(ipiObj: Record<string, unknown> | undefined): { cst: string; baseCalculo: number; aliquota: number; valor: number } {
  if (!ipiObj) return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
  
  const ipiTrib = ipiObj.IPITrib as Record<string, unknown> | undefined;
  const ipiNt = ipiObj.IPINT as Record<string, unknown> | undefined;
  
  const ipiData = ipiTrib || ipiNt;
  if (!ipiData) return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
  
  return {
    cst: safeGet(ipiData, 'CST'),
    baseCalculo: safeGetNumber(ipiData, 'vBC'),
    aliquota: safeGetNumber(ipiData, 'pIPI'),
    valor: safeGetNumber(ipiData, 'vIPI'),
  };
}

// Extract PIS data from any PIS variant
function extractPisData(pisObj: Record<string, unknown> | undefined): { cst: string; baseCalculo: number; aliquota: number; valor: number } {
  if (!pisObj) return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
  
  const pisVariants = ['PISAliq', 'PISQtde', 'PISNT', 'PISOutr'];
  
  for (const variant of pisVariants) {
    const pisData = pisObj[variant] as Record<string, unknown> | undefined;
    if (pisData) {
      return {
        cst: safeGet(pisData, 'CST'),
        baseCalculo: safeGetNumber(pisData, 'vBC'),
        aliquota: safeGetNumber(pisData, 'pPIS'),
        valor: safeGetNumber(pisData, 'vPIS'),
      };
    }
  }
  
  return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
}

// Extract COFINS data from any COFINS variant
function extractCofinsData(cofinsObj: Record<string, unknown> | undefined): { cst: string; baseCalculo: number; aliquota: number; valor: number } {
  if (!cofinsObj) return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
  
  const cofinsVariants = ['COFINSAliq', 'COFINSQtde', 'COFINSNT', 'COFINSOutr'];
  
  for (const variant of cofinsVariants) {
    const cofinsData = cofinsObj[variant] as Record<string, unknown> | undefined;
    if (cofinsData) {
      return {
        cst: safeGet(cofinsData, 'CST'),
        baseCalculo: safeGetNumber(cofinsData, 'vBC'),
        aliquota: safeGetNumber(cofinsData, 'pCOFINS'),
        valor: safeGetNumber(cofinsData, 'vCOFINS'),
      };
    }
  }
  
  return { cst: '', baseCalculo: 0, aliquota: 0, valor: 0 };
}

function parseNFEXml(xmlContent: string): NFEData {
  // Configure the XML parser
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: false,
    parseTagValue: true,
    trimValues: true,
    isArray: (name: string) => {
      // Force these tags to always be arrays
      return ['det', 'dup', 'detPag', 'vol'].includes(name);
    }
  });

  const jsonObj = parser.parse(xmlContent);
  
  // NFe can be wrapped in nfeProc (when authorized) or just NFe
  const nfe = jsonObj.nfeProc?.NFe || jsonObj.NFe;
  if (!nfe) {
    throw new Error("Estrutura de NFe não encontrada no XML");
  }
  
  const infNFe = nfe.infNFe;
  if (!infNFe) {
    throw new Error("Tag infNFe não encontrada no XML");
  }
  
  // Extract chave de acesso from the Id attribute
  const chaveAcesso = (infNFe["@_Id"] || '').replace('NFe', '');
  
  // Emit (fornecedor) data
  const emit = infNFe.emit || {};
  const enderEmit = emit.enderEmit || {};
  
  // Ide (identification) data
  const ide = infNFe.ide || {};
  
  // ICMSTot (totals) data
  const icmsTot = infNFe.total?.ICMSTot || {};
  
  // Transport data
  const transp = infNFe.transp || {};
  const transporta = transp.transporta || {};
  
  const modFreteMap: Record<string, string> = {
    '0': 'Por conta do Emitente',
    '1': 'Por conta do Destinatário',
    '2': 'Por conta de Terceiros',
    '3': 'Próprio por conta do Remetente',
    '4': 'Próprio por conta do Destinatário',
    '9': 'Sem Frete',
  };
  
  // Payment data
  const pag = infNFe.pag || {};
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
  
  // Extract parcelas from cobr (cobrança)
  const cobr = infNFe.cobr || {};
  const dupArray = ensureArray(cobr.dup);
  const parcelas: Parcela[] = dupArray.map((dup: Record<string, unknown>) => ({
    numero: safeGet(dup, 'nDup'),
    dataVencimento: safeGet(dup, 'dVenc'),
    valor: safeGetNumber(dup, 'vDup'),
  }));
  
  // If no parcelas in cobr, try detPag
  if (parcelas.length === 0) {
    const detPagArray = ensureArray(pag.detPag);
    let numero = 1;
    for (const detPag of detPagArray) {
      parcelas.push({
        numero: String(numero++),
        dataVencimento: safeGet(detPag as Record<string, unknown>, 'dPag'),
        valor: safeGetNumber(detPag as Record<string, unknown>, 'vPag'),
      });
    }
  }
  
  // Fallback: Extract parcelas from infCpl (observações complementares) using regex
  // Run fallback if no parcelas OR if all parcelas have empty dataVencimento
  const allParcelasMissingDate = parcelas.length > 0 && parcelas.every(p => !p.dataVencimento);
  
  if (parcelas.length === 0 || allParcelasMissingDate) {
    const infAdic = infNFe.infAdic || {};
    const infCpl = safeGet(infAdic, 'infCpl');
    
    if (infCpl) {
      const regex = /PARC\.?(\w+)\.?\s*VENC?T?O?\s*(\d{2}\/\d{2}\/\d{2,4})\s*R\$\s*([\d.,]+)/gi;
      let match: RegExpExecArray | null;
      const regexParcelas: Parcela[] = [];
      
      let parcelaIndex = 0;
      while ((match = regex.exec(infCpl)) !== null) {
        parcelaIndex++;
        const numeroParcelaRaw = match[1];
        const dataRaw = match[2];
        const valorRaw = match[3];
        
        // Convert letter parcela (A, B, C...) to number (1, 2, 3...)
        // Also handles numeric strings like "01", "02"
        let numeroParcela: string;
        if (/^[A-Za-z]$/.test(numeroParcelaRaw)) {
          // Single letter: A=1, B=2, C=3, etc.
          numeroParcela = String(numeroParcelaRaw.toUpperCase().charCodeAt(0) - 64);
        } else if (/^\d+$/.test(numeroParcelaRaw)) {
          // Already numeric
          numeroParcela = String(parseInt(numeroParcelaRaw, 10));
        } else {
          // Fallback to sequential index
          numeroParcela = String(parcelaIndex);
        }
        
        // Convert date from DD/MM/YY or DD/MM/YYYY to YYYY-MM-DD
        const dateParts = dataRaw.split('/');
        let year = dateParts[2];
        if (year.length === 2) {
          year = parseInt(year) > 50 ? '19' + year : '20' + year;
        }
        const dataVencimento = `${year}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        
        // Convert value: remove dots (thousands) and replace comma with dot (decimal)
        const valor = parseFloat(valorRaw.replace(/\./g, '').replace(',', '.')) || 0;
        
        regexParcelas.push({
          numero: numeroParcela,
          dataVencimento,
          valor,
        });
      }
      
      // If regex found parcelas with dates, replace the existing ones
      if (regexParcelas.length > 0) {
        parcelas.length = 0; // Clear existing parcelas without dates
        parcelas.push(...regexParcelas);
        console.log(`[parse-xml-nfe] Extracted ${parcelas.length} parcelas from infCpl using regex fallback`);
      }
    }
  }
  
  // Extract forma de pagamento
  const detPagFirst = ensureArray(pag.detPag)[0] as Record<string, unknown> | undefined;
  const tPag = safeGet(detPagFirst, 'tPag');
  const formaPagamento = tPagMap[tPag] || tPag;
  
  // Extract items
  const detArray = ensureArray(infNFe.det);
  const itens: NFEItem[] = detArray.map((det: Record<string, unknown>) => {
    const prod = det.prod as Record<string, unknown> || {};
    const imposto = det.imposto as Record<string, unknown> || {};
    
    return {
      codigo: safeGet(prod, 'cProd'),
      descricao: safeGet(prod, 'xProd'),
      ncm: safeGet(prod, 'NCM'),
      cfopSaida: safeGet(prod, 'CFOP'),
      unidade: safeGet(prod, 'uCom'),
      quantidade: safeGetNumber(prod, 'qCom'),
      valorUnitario: safeGetNumber(prod, 'vUnCom'),
      valorTotal: safeGetNumber(prod, 'vProd'),
      impostos: {
        icms: extractIcmsData(imposto.ICMS as Record<string, unknown> | undefined),
        ipi: extractIpiData(imposto.IPI as Record<string, unknown> | undefined),
        pis: extractPisData(imposto.PIS as Record<string, unknown> | undefined),
        cofins: extractCofinsData(imposto.COFINS as Record<string, unknown> | undefined),
      },
    };
  });
  
  // Additional info
  const infAdic = infNFe.infAdic || {};
  
  // Format date
  const dataEmissaoRaw = safeGet(ide, 'dhEmi') || safeGet(ide, 'dEmi');
  const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.split('T')[0] : '';
  
  // Build endereco string
  const logradouro = safeGet(enderEmit, 'xLgr');
  const numero = safeGet(enderEmit, 'nro');
  const endereco = [logradouro, numero].filter(Boolean).join(', ');
  
  // Build transportador object
  const modFrete = safeGet(transp, 'modFrete');
  const transportador: Transportador | null = {
    cnpj: safeGet(transporta, 'CNPJ') || safeGet(transporta, 'CPF'),
    razaoSocial: safeGet(transporta, 'xNome'),
    inscricaoEstadual: safeGet(transporta, 'IE'),
    endereco: safeGet(transporta, 'xEnder'),
    cidade: safeGet(transporta, 'xMun'),
    uf: safeGet(transporta, 'UF'),
    modalidadeFrete: modFreteMap[modFrete] || modFrete,
  };

  const nfeData: NFEData = {
    fornecedor: {
      cnpj: safeGet(emit, 'CNPJ'),
      razaoSocial: safeGet(emit, 'xNome'),
      nomeFantasia: safeGet(emit, 'xFant'),
      inscricaoEstadual: safeGet(emit, 'IE'),
      endereco: endereco,
      bairro: safeGet(enderEmit, 'xBairro'),
      cidade: safeGet(enderEmit, 'xMun'),
      uf: safeGet(enderEmit, 'UF'),
      cep: safeGet(enderEmit, 'CEP'),
      telefone: safeGet(emit, 'fone'),
      email: safeGet(emit, 'email'),
    },
    nota: {
      numero: safeGet(ide, 'nNF'),
      serie: safeGet(ide, 'serie'),
      dataEmissao: dataEmissao,
      valorTotal: safeGetNumber(icmsTot, 'vNF'),
      valorProdutos: safeGetNumber(icmsTot, 'vProd'),
      valorFrete: safeGetNumber(icmsTot, 'vFrete'),
      valorSeguro: safeGetNumber(icmsTot, 'vSeg'),
      valorDesconto: safeGetNumber(icmsTot, 'vDesc'),
      valorOutros: safeGetNumber(icmsTot, 'vOutro'),
      chaveAcesso: chaveAcesso,
      naturezaOperacao: safeGet(ide, 'natOp'),
    },
    transportador: transportador,
    financeiro: {
      formaPagamento: formaPagamento,
      parcelas: parcelas,
    },
    impostos: {
      icms: safeGetNumber(icmsTot, 'vICMS'),
      ipi: safeGetNumber(icmsTot, 'vIPI'),
      pis: safeGetNumber(icmsTot, 'vPIS'),
      cofins: safeGetNumber(icmsTot, 'vCOFINS'),
      baseCalculoIcms: safeGetNumber(icmsTot, 'vBC'),
      baseCalculoIcmsSt: safeGetNumber(icmsTot, 'vBCST'),
      valorIcmsSt: safeGetNumber(icmsTot, 'vST'),
    },
    observacoes: {
      fiscal: safeGet(infAdic, 'infAdFisco'),
      complementar: safeGet(infAdic, 'infCpl'),
    },
    itens: itens,
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
      console.error('[parse-xml-nfe] XML content is missing');
      return new Response(
        JSON.stringify({ error: 'XML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[parse-xml-nfe] Parsing XML NFe with fast-xml-parser...');
    console.log('[parse-xml-nfe] XML length:', xmlContent.length);
    
    const nfeData = parseNFEXml(xmlContent);
    
    console.log('[parse-xml-nfe] Parsed NFe data:', {
      fornecedor: nfeData.fornecedor.razaoSocial,
      fornecedorCNPJ: nfeData.fornecedor.cnpj,
      fornecedorUF: nfeData.fornecedor.uf,
      fornecedorCidade: nfeData.fornecedor.cidade,
      nota: nfeData.nota.numero,
      naturezaOperacao: nfeData.nota.naturezaOperacao,
      itensCount: nfeData.itens.length,
      parcelasCount: nfeData.financeiro.parcelas.length,
      transportador: nfeData.transportador?.razaoSocial || 'N/A',
    });

    return new Response(
      JSON.stringify({ success: true, data: nfeData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[parse-xml-nfe] Error parsing XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar XML';
    return new Response(
      JSON.stringify({ error: `XML inválido ou malformado: ${errorMessage}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
