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
  cfop: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

interface NFEData {
  fornecedor: {
    cnpj: string;
    razaoSocial: string;
    endereco: string;
  };
  nota: {
    numero: string;
    serie: string;
    dataEmissao: string;
    valorTotal: number;
  };
  itens: NFEItem[];
}

function extractTextContent(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAllItems(xml: string): NFEItem[] {
  const items: NFEItem[] = [];
  
  // Find all <det> elements (items in NFe)
  const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/gi;
  let detMatch;
  
  while ((detMatch = detRegex.exec(xml)) !== null) {
    const detContent = detMatch[1];
    
    // Extract product info from <prod> tag
    const prodMatch = detContent.match(/<prod>([\s\S]*?)<\/prod>/i);
    if (prodMatch) {
      const prodContent = prodMatch[1];
      
      const item: NFEItem = {
        codigo: extractTextContent(prodContent, 'cProd'),
        descricao: extractTextContent(prodContent, 'xProd'),
        ncm: extractTextContent(prodContent, 'NCM'),
        cfop: extractTextContent(prodContent, 'CFOP'),
        quantidade: parseFloat(extractTextContent(prodContent, 'qCom')) || 0,
        valorUnitario: parseFloat(extractTextContent(prodContent, 'vUnCom')) || 0,
        valorTotal: parseFloat(extractTextContent(prodContent, 'vProd')) || 0,
      };
      
      items.push(item);
    }
  }
  
  return items;
}

function parseNFEXml(xmlContent: string): NFEData {
  // Extract supplier info from <emit> tag
  const emitMatch = xmlContent.match(/<emit>([\s\S]*?)<\/emit>/i);
  const emitContent = emitMatch ? emitMatch[1] : '';
  
  // Extract address from <enderEmit>
  const enderMatch = emitContent.match(/<enderEmit>([\s\S]*?)<\/enderEmit>/i);
  const enderContent = enderMatch ? enderMatch[1] : '';
  
  const logradouro = extractTextContent(enderContent, 'xLgr');
  const numero = extractTextContent(enderContent, 'nro');
  const bairro = extractTextContent(enderContent, 'xBairro');
  const cidade = extractTextContent(enderContent, 'xMun');
  const uf = extractTextContent(enderContent, 'UF');
  
  const endereco = [logradouro, numero, bairro, cidade, uf]
    .filter(Boolean)
    .join(', ');

  // Extract invoice info from <ide> tag
  const ideMatch = xmlContent.match(/<ide>([\s\S]*?)<\/ide>/i);
  const ideContent = ideMatch ? ideMatch[1] : '';
  
  // Extract total value from <ICMSTot>
  const icmsTotMatch = xmlContent.match(/<ICMSTot>([\s\S]*?)<\/ICMSTot>/i);
  const icmsTotContent = icmsTotMatch ? icmsTotMatch[1] : '';
  
  // Format date
  const dataEmissaoRaw = extractTextContent(ideContent, 'dhEmi') || extractTextContent(ideContent, 'dEmi');
  const dataEmissao = dataEmissaoRaw ? dataEmissaoRaw.split('T')[0] : '';

  const nfeData: NFEData = {
    fornecedor: {
      cnpj: extractTextContent(emitContent, 'CNPJ'),
      razaoSocial: extractTextContent(emitContent, 'xNome'),
      endereco: endereco,
    },
    nota: {
      numero: extractTextContent(ideContent, 'nNF'),
      serie: extractTextContent(ideContent, 'serie'),
      dataEmissao: dataEmissao,
      valorTotal: parseFloat(extractTextContent(icmsTotContent, 'vNF')) || 0,
    },
    itens: extractAllItems(xmlContent),
  };

  return nfeData;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
      nota: nfeData.nota.numero,
      itensCount: nfeData.itens.length,
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
