import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CTEData {
  emit: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    endereco: string;
    cidade: string;
    uf: string;
  };
  remetente: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    endereco: string;
    cidade: string;
    uf: string;
  };
  destinatario: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    endereco: string;
    cidade: string;
    uf: string;
  };
  tomador: {
    cnpj: string;
    razaoSocial: string;
    inscricaoEstadual: string;
    endereco: string;
    cidade: string;
    uf: string;
    tipo: string; // 0=Remetente, 1=Expedidor, 2=Recebedor, 3=Destinatário
  };
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

// Helper function to safely get a value from an object
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

// Helper to ensure we always get an array
function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function parseCTEXml(xmlContent: string): CTEData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: false,
    parseTagValue: true,
    trimValues: true,
    isArray: (name: string) => {
      return ['infNFe', 'infCTe', 'infDoc', 'emiDocAnt'].includes(name);
    }
  });

  const jsonObj = parser.parse(xmlContent);
  
  // CTe pode estar em cteProc (autorizado) ou apenas CTe
  const cte = jsonObj.cteProc?.CTe || jsonObj.CTe;
  if (!cte) {
    throw new Error("Estrutura de CT-e não encontrada no XML");
  }
  
  const infCte = cte.infCte;
  if (!infCte) {
    throw new Error("Tag infCte não encontrada no XML");
  }
  
  // Extrair chave de acesso do Id
  const chaveCTe = (infCte["@_Id"] || '').replace('CTe', '');
  
  // Ide (identificação)
  const ide = infCte.ide || {};
  
  // Mapeamento de modalidades
  const modalMap: Record<string, string> = {
    '01': 'Rodoviário',
    '02': 'Aéreo',
    '03': 'Aquaviário',
    '04': 'Ferroviário',
    '05': 'Dutoviário',
    '06': 'Multimodal',
  };
  
  // Mapeamento de tipos de tomador
  const tomaMap: Record<string, string> = {
    '0': 'Remetente',
    '1': 'Expedidor',
    '2': 'Recebedor',
    '3': 'Destinatário',
    '4': 'Outro',
  };
  
  // Emitente (transportadora)
  const emit = infCte.emit || {};
  const enderEmit = emit.enderEmit || {};
  
  // Remetente
  const rem = infCte.rem || {};
  const enderRem = rem.enderReme || {};
  
  // Destinatário
  const dest = infCte.dest || {};
  const enderDest = dest.enderDest || {};
  
  // Tomador (quem paga o frete)
  const toma = ide.toma3 || ide.toma4 || ide.toma || {};
  const tomaType = safeGet(ide, 'toma3', 'toma') || safeGet(ide, 'toma4', 'toma') || safeGet(toma, 'toma') || '0';
  
  // Determinar dados do tomador baseado no tipo
  let tomadorData = {
    cnpj: '',
    razaoSocial: '',
    inscricaoEstadual: '',
    endereco: '',
    cidade: '',
    uf: '',
    tipo: tomaMap[tomaType] || tomaType,
  };
  
  // Se toma4, os dados estão dentro da própria tag
  if (ide.toma4) {
    const enderToma = ide.toma4.enderToma || {};
    tomadorData = {
      cnpj: safeGet(ide.toma4, 'CNPJ') || safeGet(ide.toma4, 'CPF'),
      razaoSocial: safeGet(ide.toma4, 'xNome'),
      inscricaoEstadual: safeGet(ide.toma4, 'IE'),
      endereco: [safeGet(enderToma, 'xLgr'), safeGet(enderToma, 'nro')].filter(Boolean).join(', '),
      cidade: safeGet(enderToma, 'xMun'),
      uf: safeGet(enderToma, 'UF'),
      tipo: tomaMap[tomaType] || 'Outro',
    };
  } else if (tomaType === '0') {
    // Tomador é o Remetente
    tomadorData = {
      cnpj: safeGet(rem, 'CNPJ') || safeGet(rem, 'CPF'),
      razaoSocial: safeGet(rem, 'xNome'),
      inscricaoEstadual: safeGet(rem, 'IE'),
      endereco: [safeGet(enderRem, 'xLgr'), safeGet(enderRem, 'nro')].filter(Boolean).join(', '),
      cidade: safeGet(enderRem, 'xMun'),
      uf: safeGet(enderRem, 'UF'),
      tipo: 'Remetente',
    };
  } else if (tomaType === '3') {
    // Tomador é o Destinatário
    tomadorData = {
      cnpj: safeGet(dest, 'CNPJ') || safeGet(dest, 'CPF'),
      razaoSocial: safeGet(dest, 'xNome'),
      inscricaoEstadual: safeGet(dest, 'IE'),
      endereco: [safeGet(enderDest, 'xLgr'), safeGet(enderDest, 'nro')].filter(Boolean).join(', '),
      cidade: safeGet(enderDest, 'xMun'),
      uf: safeGet(enderDest, 'UF'),
      tipo: 'Destinatário',
    };
  }
  
  // Valores do serviço
  const vPrest = infCte.vPrest || {};
  
  // Extrair chaves das NFe relacionadas
  const infDoc = infCte.infCTeNorm?.infDoc || {};
  const infNFeArray = ensureArray(infDoc.infNFe);
  const chavesNFe: string[] = infNFeArray.map((nfe: Record<string, unknown>) => safeGet(nfe, 'chave'));
  
  // Também verificar em infDocRef (documentos anteriores)
  const infDocRef = infCte.infCTeNorm?.docAnt?.emiDocAnt || [];
  const docAntArray = ensureArray(infDocRef);
  for (const docAnt of docAntArray) {
    const idDocAnt = ensureArray((docAnt as Record<string, unknown>).idDocAnt);
    for (const doc of idDocAnt) {
      const chave = safeGet(doc as Record<string, unknown>, 'chCTe') || safeGet(doc as Record<string, unknown>, 'chave');
      if (chave) chavesNFe.push(chave);
    }
  }
  
  // Data de emissão
  const dataEmissaoRaw = safeGet(ide, 'dhEmi') || safeGet(ide, 'dEmi');
  const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.split('T')[0] : '';

  const cteData: CTEData = {
    emit: {
      cnpj: safeGet(emit, 'CNPJ') || safeGet(emit, 'CPF'),
      razaoSocial: safeGet(emit, 'xNome'),
      inscricaoEstadual: safeGet(emit, 'IE'),
      endereco: [safeGet(enderEmit, 'xLgr'), safeGet(enderEmit, 'nro')].filter(Boolean).join(', '),
      cidade: safeGet(enderEmit, 'xMun'),
      uf: safeGet(enderEmit, 'UF'),
    },
    remetente: {
      cnpj: safeGet(rem, 'CNPJ') || safeGet(rem, 'CPF'),
      razaoSocial: safeGet(rem, 'xNome'),
      inscricaoEstadual: safeGet(rem, 'IE'),
      endereco: [safeGet(enderRem, 'xLgr'), safeGet(enderRem, 'nro')].filter(Boolean).join(', '),
      cidade: safeGet(enderRem, 'xMun'),
      uf: safeGet(enderRem, 'UF'),
    },
    destinatario: {
      cnpj: safeGet(dest, 'CNPJ') || safeGet(dest, 'CPF'),
      razaoSocial: safeGet(dest, 'xNome'),
      inscricaoEstadual: safeGet(dest, 'IE'),
      endereco: [safeGet(enderDest, 'xLgr'), safeGet(enderDest, 'nro')].filter(Boolean).join(', '),
      cidade: safeGet(enderDest, 'xMun'),
      uf: safeGet(enderDest, 'UF'),
    },
    tomador: tomadorData,
    valorTotal: safeGetNumber(vPrest, 'vTPrest'),
    valorServico: safeGetNumber(vPrest, 'vRec'),
    chaveNFe: chavesNFe.filter(Boolean),
    chaveCTe: chaveCTe,
    numero: safeGet(ide, 'nCT'),
    serie: safeGet(ide, 'serie'),
    dataEmissao: dataEmissao,
    naturezaOperacao: safeGet(ide, 'natOp'),
    cfop: safeGet(ide, 'CFOP'),
    modalidade: modalMap[safeGet(ide, 'modal')] || safeGet(ide, 'modal'),
  };

  return cteData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { xmlContent } = await req.json();
    
    if (!xmlContent) {
      console.error('[parse-cte-xml] XML content is missing');
      return new Response(
        JSON.stringify({ error: 'XML content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[parse-cte-xml] Parsing XML CTe with fast-xml-parser...');
    console.log('[parse-cte-xml] XML length:', xmlContent.length);
    
    const cteData = parseCTEXml(xmlContent);
    
    console.log('[parse-cte-xml] Parsed CTe data:', {
      remetente: cteData.remetente.razaoSocial,
      destinatario: cteData.destinatario.razaoSocial,
      tomador: cteData.tomador.razaoSocial,
      tomadorTipo: cteData.tomador.tipo,
      valorTotal: cteData.valorTotal,
      chaveCTe: cteData.chaveCTe,
      chavesNFeCount: cteData.chaveNFe.length,
    });

    return new Response(
      JSON.stringify({ success: true, data: cteData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[parse-cte-xml] Error parsing XML:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao processar XML';
    return new Response(
      JSON.stringify({ error: `XML de CT-e inválido ou malformado: ${errorMessage}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
