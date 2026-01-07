import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs dos webservices SEFAZ-GO (NF-e 4.00)
const SEFAZ_GO = {
  producao: {
    autorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    retAutorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4",
    consulta: "https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4",
    status: "https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    evento: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    inutilizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
  },
  homologacao: {
    autorizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    retAutorizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4",
    consulta: "https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4",
    status: "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    evento: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    inutilizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
  }
};

// Código UF Goiás
const UF_GO = "52";

interface NFeRequest {
  action: "emitir" | "consultar" | "cancelar" | "carta_correcao" | "status" | "config";
  company_id: string;
  data?: any;
  referencia?: string;
}

// Função para assinar XML usando a Edge Function xml-signer
async function signXml(supabase: any, xml: string, pfxBase64: string, password: string, tagToSign: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("xml-signer", {
    body: {
      action: "sign",
      xml,
      pfxBase64,
      password,
      tagToSign
    }
  });

  if (error || !data?.success) {
    throw new Error(data?.error || "Erro ao assinar XML");
  }

  return data.signedXml;
}

// Função para gerar chave de acesso da NF-e (44 dígitos)
function gerarChaveAcesso(
  uf: string,
  aamm: string,
  cnpj: string,
  mod: string,
  serie: string,
  numero: string,
  tpEmis: string,
  cNF: string
): string {
  const chave = `${uf}${aamm}${cnpj.padStart(14, "0")}${mod}${serie.padStart(3, "0")}${numero.padStart(9, "0")}${tpEmis}${cNF.padStart(8, "0")}`;
  
  // Calcular dígito verificador (módulo 11)
  let soma = 0;
  let peso = 2;
  for (let i = chave.length - 1; i >= 0; i--) {
    soma += parseInt(chave[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  
  return chave + dv;
}

// Função para escapar caracteres especiais XML
function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Função para gerar XML da NF-e
function gerarXmlNFe(dados: any, config: any, empresa: any, numero: number, serie: number): { xml: string; chave: string } {
  const dataEmissao = dados.data_emissao || new Date().toISOString();
  const dataAtual = new Date();
  const aamm = `${dataAtual.getFullYear().toString().slice(2)}${(dataAtual.getMonth() + 1).toString().padStart(2, "0")}`;
  
  // Limpar CNPJ
  const cnpjEmitente = (empresa.cnpj || "").replace(/\D/g, "");
  const cpfCnpjDest = (dados.destinatario?.cnpj || dados.destinatario?.cpf || "").replace(/\D/g, "");
  
  // Gerar código numérico aleatório (8 dígitos)
  const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
  
  // Gerar chave de acesso
  const chave = gerarChaveAcesso(UF_GO, aamm, cnpjEmitente, "55", String(serie), String(numero), "1", cNF);
  
  // Determinar tag do documento do destinatário
  const tagDocDest = cpfCnpjDest.length === 11 ? "CPF" : "CNPJ";
  
  // Regime tributário: 1=Simples Nacional, 2=Simples Nacional excesso, 3=Regime Normal
  const regimeTributario = config.regime_tributario === "simples_nacional" ? "1" : "3";
  
  // Montar itens
  let itensXml = "";
  let valorTotalProdutos = 0;
  let valorTotalIcms = 0;
  
  (dados.itens || []).forEach((item: any, index: number) => {
    const valorBruto = parseFloat(item.valor_bruto || item.valor_total || 0);
    valorTotalProdutos += valorBruto;
    
    itensXml += `
    <det nItem="${index + 1}">
      <prod>
        <cProd>${escapeXml(item.codigo_produto || item.codigo || String(index + 1))}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${escapeXml(item.descricao)}</xProd>
        <NCM>${(item.ncm || "00000000").replace(/\D/g, "")}</NCM>
        <CFOP>${item.cfop || config.cfop_padrao || "5102"}</CFOP>
        <uCom>${escapeXml(item.unidade_comercial || "UN")}</uCom>
        <qCom>${parseFloat(item.quantidade_comercial || 1).toFixed(4)}</qCom>
        <vUnCom>${parseFloat(item.valor_unitario_comercial || item.valor_unitario || 0).toFixed(10)}</vUnCom>
        <vProd>${valorBruto.toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${escapeXml(item.unidade_comercial || "UN")}</uTrib>
        <qTrib>${parseFloat(item.quantidade_comercial || 1).toFixed(4)}</qTrib>
        <vUnTrib>${parseFloat(item.valor_unitario_comercial || item.valor_unitario || 0).toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMS${item.icms_situacao_tributaria || "00"}>
            <orig>${item.icms_origem || "0"}</orig>
            <CST>${item.icms_situacao_tributaria || "00"}</CST>
            <modBC>3</modBC>
            <vBC>${parseFloat(item.icms_base_calculo || valorBruto).toFixed(2)}</vBC>
            <pICMS>${parseFloat(item.icms_aliquota || 0).toFixed(2)}</pICMS>
            <vICMS>${parseFloat(item.icms_valor || 0).toFixed(2)}</vICMS>
          </ICMS${item.icms_situacao_tributaria || "00"}>
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>${item.pis_situacao_tributaria || "99"}</CST>
            <vBC>0.00</vBC>
            <pPIS>0.00</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>${item.cofins_situacao_tributaria || "99"}</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.00</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>
    </det>`;
  });
  
  const valorTotal = parseFloat(dados.valor_total || valorTotalProdutos);
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chave}" versao="4.00">
    <ide>
      <cUF>${UF_GO}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>${escapeXml(dados.natureza_operacao || config.natureza_operacao_padrao || "Venda")}</natOp>
      <mod>55</mod>
      <serie>${serie}</serie>
      <nNF>${numero}</nNF>
      <dhEmi>${dataEmissao}</dhEmi>
      <dhSaiEnt>${dataEmissao}</dhSaiEnt>
      <tpNF>${dados.tipo_documento || 1}</tpNF>
      <idDest>1</idDest>
      <cMunFG>${empresa.codigo_municipio || "5201108"}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${chave.slice(-1)}</cDV>
      <tpAmb>${config.ambiente === "producao" ? "1" : "2"}</tpAmb>
      <finNFe>${dados.finalidade_emissao || 1}</finNFe>
      <indFinal>${dados.consumidor_final || 1}</indFinal>
      <indPres>${dados.presenca_comprador || 1}</indPres>
      <procEmi>0</procEmi>
      <verProc>WAI-ERP-1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${cnpjEmitente}</CNPJ>
      <xNome>${escapeXml(empresa.razao_social || empresa.name)}</xNome>
      <xFant>${escapeXml(empresa.name)}</xFant>
      <enderEmit>
        <xLgr>${escapeXml(empresa.endereco || empresa.logradouro || "")}</xLgr>
        <nro>${escapeXml(empresa.numero || "S/N")}</nro>
        <xBairro>${escapeXml(empresa.bairro || "Centro")}</xBairro>
        <cMun>${empresa.codigo_municipio || "5201108"}</cMun>
        <xMun>${escapeXml(empresa.cidade || "Anápolis")}</xMun>
        <UF>${empresa.uf || empresa.estado || "GO"}</UF>
        <CEP>${(empresa.cep || "").replace(/\D/g, "")}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
        ${empresa.telefone ? `<fone>${empresa.telefone.replace(/\D/g, "")}</fone>` : ""}
      </enderEmit>
      <IE>${(config.inscricao_estadual || "").replace(/\D/g, "")}</IE>
      <CRT>${regimeTributario}</CRT>
    </emit>
    <dest>
      <${tagDocDest}>${cpfCnpjDest}</${tagDocDest}>
      <xNome>${escapeXml(dados.destinatario?.nome || dados.destinatario?.razao_social || "")}</xNome>
      <enderDest>
        <xLgr>${escapeXml(dados.destinatario?.logradouro || "")}</xLgr>
        <nro>${escapeXml(dados.destinatario?.numero || "S/N")}</nro>
        ${dados.destinatario?.complemento ? `<xCpl>${escapeXml(dados.destinatario.complemento)}</xCpl>` : ""}
        <xBairro>${escapeXml(dados.destinatario?.bairro || "")}</xBairro>
        <cMun>${dados.destinatario?.codigo_municipio || "5201108"}</cMun>
        <xMun>${escapeXml(dados.destinatario?.municipio || "")}</xMun>
        <UF>${dados.destinatario?.uf || "GO"}</UF>
        <CEP>${(dados.destinatario?.cep || "").replace(/\D/g, "")}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
        ${dados.destinatario?.telefone ? `<fone>${dados.destinatario.telefone.replace(/\D/g, "")}</fone>` : ""}
      </enderDest>
      <indIEDest>${dados.destinatario?.indicador_ie || 9}</indIEDest>
      ${dados.destinatario?.email ? `<email>${escapeXml(dados.destinatario.email)}</email>` : ""}
    </dest>
    ${itensXml}
    <total>
      <ICMSTot>
        <vBC>${valorTotalIcms.toFixed(2)}</vBC>
        <vICMS>${valorTotalIcms.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCPUFDest>0.00</vFCPUFDest>
        <vICMSUFDest>0.00</vICMSUFDest>
        <vICMSUFRemet>0.00</vICMSUFRemet>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${valorTotalProdutos.toFixed(2)}</vProd>
        <vFrete>${parseFloat(dados.valor_frete || 0).toFixed(2)}</vFrete>
        <vSeg>${parseFloat(dados.valor_seguro || 0).toFixed(2)}</vSeg>
        <vDesc>${parseFloat(dados.valor_desconto || 0).toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>${parseFloat(dados.valor_outras_despesas || 0).toFixed(2)}</vOutro>
        <vNF>${valorTotal.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>${dados.modalidade_frete || 9}</modFrete>
    </transp>
    <pag>
      <detPag>
        <indPag>0</indPag>
        <tPag>01</tPag>
        <vPag>${valorTotal.toFixed(2)}</vPag>
      </detPag>
    </pag>
    ${dados.informacoes_complementares ? `<infAdic><infCpl>${escapeXml(dados.informacoes_complementares)}</infCpl></infAdic>` : ""}
  </infNFe>
</NFe>`;

  return { xml, chave };
}

// Função para enviar SOAP request para SEFAZ
async function sendSoapSefaz(url: string, xmlBody: string, soapAction: string): Promise<string> {
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
  <soap:Body>
    ${xmlBody}
  </soap:Body>
</soap:Envelope>`;

  console.log(`[NF-e] Enviando para ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/soap+xml; charset=utf-8",
      "SOAPAction": soapAction,
    },
    body: soapEnvelope,
  });

  const responseText = await response.text();
  console.log(`[NF-e] Status: ${response.status}`);
  
  return responseText;
}

// Função para extrair dados da resposta da SEFAZ
function parseSefazResponse(xml: string): any {
  // Extrair cStat (código de status)
  const cStatMatch = xml.match(/<cStat>(\d+)<\/cStat>/);
  const xMotivoMatch = xml.match(/<xMotivo>([^<]+)<\/xMotivo>/);
  const chNFeMatch = xml.match(/<chNFe>(\d{44})<\/chNFe>/);
  const nProtMatch = xml.match(/<nProt>(\d+)<\/nProt>/);
  const nRecMatch = xml.match(/<nRec>(\d+)<\/nRec>/);
  
  const cStat = cStatMatch?.[1] || "";
  const xMotivo = xMotivoMatch?.[1] || "";
  
  // Status 100 = Autorizado, 104 = Lote processado
  if (cStat === "100" || cStat === "104") {
    return {
      success: true,
      status: "autorizada",
      cStat,
      xMotivo,
      chave: chNFeMatch?.[1],
      protocolo: nProtMatch?.[1],
    };
  }
  
  // Status 103 = Lote recebido com sucesso (aguardando processamento)
  if (cStat === "103") {
    return {
      success: true,
      status: "processando",
      cStat,
      xMotivo,
      recibo: nRecMatch?.[1],
    };
  }
  
  return {
    success: false,
    cStat,
    xMotivo,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, company_id, data, referencia }: NFeRequest = await req.json();

    // Buscar configuração da empresa
    const { data: config, error: configError } = await supabase
      .from("nfe_config")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (configError && action !== "config") {
      return new Response(
        JSON.stringify({ error: "Configuração de NF-e não encontrada. Configure primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados da empresa
    const { data: empresa } = await supabase
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .single();

    const ambiente = config?.ambiente === "producao" ? "producao" : "homologacao";
    const urls = SEFAZ_GO[ambiente];

    let result;

    switch (action) {
      case "config": {
        const { data: existingConfig } = await supabase
          .from("nfe_config")
          .select("id")
          .eq("company_id", company_id)
          .single();

        if (existingConfig) {
          const { error } = await supabase
            .from("nfe_config")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("company_id", company_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("nfe_config")
            .insert({ company_id, ...data });
          if (error) throw error;
        }
        result = { success: true, message: "Configuração salva" };
        break;
      }

      case "status": {
        // Consultar status do serviço SEFAZ
        const xmlStatus = `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
          <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
            <tpAmb>${ambiente === "producao" ? "1" : "2"}</tpAmb>
            <cUF>${UF_GO}</cUF>
            <xServ>STATUS</xServ>
          </consStatServ>
        </nfeDadosMsg>`;

        const responseXml = await sendSoapSefaz(urls.status, xmlStatus, "nfeStatusServicoNF");
        const cStatMatch = responseXml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = responseXml.match(/<xMotivo>([^<]+)<\/xMotivo>/);

        result = {
          success: cStatMatch?.[1] === "107",
          online: cStatMatch?.[1] === "107",
          cStat: cStatMatch?.[1],
          xMotivo: xMotivoMatch?.[1],
        };
        break;
      }

      case "emitir": {
        if (!config?.certificado_base64 || !config?.certificado_senha) {
          throw new Error("Certificado digital não configurado");
        }

        // Buscar próximo número
        const proximoNumero = (config.proximo_numero || 0) + 1;
        const serie = config.serie_nfe || 1;
        const ref = referencia || `nfe_${company_id}_${Date.now()}`;

        // Gerar XML da NF-e
        const { xml: xmlNFe, chave } = gerarXmlNFe(data, config, empresa, proximoNumero, serie);

        console.log("[NF-e] Chave gerada:", chave);

        // Assinar XML
        const xmlAssinado = await signXml(
          supabase,
          xmlNFe,
          config.certificado_base64,
          config.certificado_senha,
          "infNFe"
        );

        // Criar registro no banco
        const { data: nfe, error: insertError } = await supabase
          .from("notas_fiscais")
          .insert({
            company_id,
            tipo: "nfe",
            referencia: ref,
            status: "processando",
            chave_nfe: chave,
            numero: String(proximoNumero),
            serie: String(serie),
            natureza_operacao: data?.natureza_operacao || config.natureza_operacao_padrao,
            data_emissao: data?.data_emissao || new Date().toISOString(),
            destinatario_nome: data?.destinatario?.nome || data?.destinatario?.razao_social,
            destinatario_cpf_cnpj: data?.destinatario?.cnpj || data?.destinatario?.cpf,
            destinatario_email: data?.destinatario?.email,
            valor_total: data?.valor_total,
            valor_produtos: data?.valor_produtos,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Montar lote para envio
        const xmlLote = `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
          <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
            <idLote>${Date.now()}</idLote>
            <indSinc>1</indSinc>
            ${xmlAssinado}
          </enviNFe>
        </nfeDadosMsg>`;

        // Enviar para SEFAZ
        const responseXml = await sendSoapSefaz(urls.autorizacao, xmlLote, "nfeAutorizacaoLote");
        const parsedResponse = parseSefazResponse(responseXml);

        // Atualizar registro
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (parsedResponse.success) {
          if (parsedResponse.status === "autorizada") {
            updateData.status = "autorizada";
            updateData.protocolo = parsedResponse.protocolo;
            updateData.status_sefaz = parsedResponse.cStat;
            updateData.mensagem_sefaz = parsedResponse.xMotivo;
            updateData.data_autorizacao = new Date().toISOString();
          } else {
            updateData.status = "processando";
            updateData.protocolo = parsedResponse.recibo;
          }
        } else {
          updateData.status = "rejeitada";
          updateData.status_sefaz = parsedResponse.cStat;
          updateData.mensagem_sefaz = parsedResponse.xMotivo;
        }

        await supabase
          .from("notas_fiscais")
          .update(updateData)
          .eq("id", nfe.id);

        // Atualizar último número
        if (parsedResponse.success) {
          await supabase
            .from("nfe_config")
            .update({ ultimo_numero_nfe: proximoNumero })
            .eq("company_id", company_id);
        }

        result = {
          success: parsedResponse.success,
          nfe_id: nfe.id,
          referencia: ref,
          chave: chave,
          numero: proximoNumero,
          serie,
          protocolo: parsedResponse.protocolo || parsedResponse.recibo,
          status: parsedResponse.status,
          cStat: parsedResponse.cStat,
          xMotivo: parsedResponse.xMotivo,
        };
        break;
      }

      case "consultar": {
        if (!referencia) {
          throw new Error("Referência não informada");
        }

        const { data: nfe } = await supabase
          .from("notas_fiscais")
          .select("*")
          .eq("company_id", company_id)
          .eq("referencia", referencia)
          .single();

        if (!nfe) {
          throw new Error("NF-e não encontrada");
        }

        if (nfe.status === "autorizada") {
          result = {
            success: true,
            status: "autorizada",
            chave: nfe.chave_nfe,
            protocolo: nfe.protocolo,
          };
          break;
        }

        // Consultar na SEFAZ
        const xmlConsulta = `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
          <consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
            <tpAmb>${ambiente === "producao" ? "1" : "2"}</tpAmb>
            <xServ>CONSULTAR</xServ>
            <chNFe>${nfe.chave_nfe}</chNFe>
          </consSitNFe>
        </nfeDadosMsg>`;

        const responseXml = await sendSoapSefaz(urls.consulta, xmlConsulta, "nfeConsultaNF");
        const parsedResponse = parseSefazResponse(responseXml);

        if (parsedResponse.success && parsedResponse.status === "autorizada") {
          await supabase
            .from("notas_fiscais")
            .update({
              status: "autorizada",
              protocolo: parsedResponse.protocolo,
              data_autorizacao: new Date().toISOString(),
            })
            .eq("id", nfe.id);
        }

        result = parsedResponse;
        break;
      }

      case "cancelar": {
        if (!referencia) {
          throw new Error("Referência não informada");
        }

        const { data: nfe } = await supabase
          .from("notas_fiscais")
          .select("*")
          .eq("company_id", company_id)
          .eq("referencia", referencia)
          .single();

        if (!nfe) {
          throw new Error("NF-e não encontrada");
        }

        if (nfe.status !== "autorizada") {
          throw new Error("Apenas NF-e autorizadas podem ser canceladas");
        }

        const justificativa = data?.justificativa || "Cancelamento solicitado pelo emitente";
        if (justificativa.length < 15) {
          throw new Error("Justificativa deve ter no mínimo 15 caracteres");
        }

        // Gerar XML do evento de cancelamento
        const seqEvento = "1";
        const tpEvento = "110111"; // Cancelamento
        const idEvento = `ID${tpEvento}${nfe.chave_nfe}${seqEvento.padStart(2, "0")}`;

        let xmlEvento = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
          <infEvento Id="${idEvento}">
            <cOrgao>${UF_GO}</cOrgao>
            <tpAmb>${ambiente === "producao" ? "1" : "2"}</tpAmb>
            <CNPJ>${empresa?.cnpj?.replace(/\D/g, "")}</CNPJ>
            <chNFe>${nfe.chave_nfe}</chNFe>
            <dhEvento>${new Date().toISOString()}</dhEvento>
            <tpEvento>${tpEvento}</tpEvento>
            <nSeqEvento>${seqEvento}</nSeqEvento>
            <verEvento>1.00</verEvento>
            <detEvento versao="1.00">
              <descEvento>Cancelamento</descEvento>
              <nProt>${nfe.protocolo}</nProt>
              <xJust>${escapeXml(justificativa)}</xJust>
            </detEvento>
          </infEvento>
        </evento>`;

        // Assinar evento
        const xmlEventoAssinado = await signXml(
          supabase,
          xmlEvento,
          config.certificado_base64,
          config.certificado_senha,
          "infEvento"
        );

        // Enviar evento
        const xmlEnvEvento = `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
          <envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
            <idLote>${Date.now()}</idLote>
            ${xmlEventoAssinado}
          </envEvento>
        </nfeDadosMsg>`;

        const responseXml = await sendSoapSefaz(urls.evento, xmlEnvEvento, "nfeRecepcaoEvento");
        const cStatMatch = responseXml.match(/<cStat>(\d+)<\/cStat>/);

        if (cStatMatch?.[1] === "135" || cStatMatch?.[1] === "155") {
          await supabase
            .from("notas_fiscais")
            .update({
              status: "cancelada",
              data_cancelamento: new Date().toISOString(),
              justificativa_cancelamento: justificativa,
            })
            .eq("id", nfe.id);

          result = { success: true, message: "NF-e cancelada com sucesso" };
        } else {
          const xMotivoMatch = responseXml.match(/<xMotivo>([^<]+)<\/xMotivo>/);
          result = {
            success: false,
            cStat: cStatMatch?.[1],
            xMotivo: xMotivoMatch?.[1],
          };
        }
        break;
      }

      case "carta_correcao": {
        if (!referencia) {
          throw new Error("Referência não informada");
        }

        const { data: nfe } = await supabase
          .from("notas_fiscais")
          .select("*")
          .eq("company_id", company_id)
          .eq("referencia", referencia)
          .single();

        if (!nfe || nfe.status !== "autorizada") {
          throw new Error("NF-e não encontrada ou não autorizada");
        }

        const correcao = data?.correcao;
        if (!correcao || correcao.length < 15) {
          throw new Error("Correção deve ter no mínimo 15 caracteres");
        }

        // Buscar sequência atual
        const { data: ultimaCCe } = await supabase
          .from("notas_fiscais")
          .select("carta_correcao_sequencia")
          .eq("id", nfe.id)
          .single();

        const seqEvento = String((ultimaCCe?.carta_correcao_sequencia || 0) + 1);
        const tpEvento = "110110"; // Carta de Correção
        const idEvento = `ID${tpEvento}${nfe.chave_nfe}${seqEvento.padStart(2, "0")}`;

        let xmlEvento = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
          <infEvento Id="${idEvento}">
            <cOrgao>${UF_GO}</cOrgao>
            <tpAmb>${ambiente === "producao" ? "1" : "2"}</tpAmb>
            <CNPJ>${empresa?.cnpj?.replace(/\D/g, "")}</CNPJ>
            <chNFe>${nfe.chave_nfe}</chNFe>
            <dhEvento>${new Date().toISOString()}</dhEvento>
            <tpEvento>${tpEvento}</tpEvento>
            <nSeqEvento>${seqEvento}</nSeqEvento>
            <verEvento>1.00</verEvento>
            <detEvento versao="1.00">
              <descEvento>Carta de Correcao</descEvento>
              <xCorrecao>${escapeXml(correcao)}</xCorrecao>
              <xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.</xCondUso>
            </detEvento>
          </infEvento>
        </evento>`;

        const xmlEventoAssinado = await signXml(
          supabase,
          xmlEvento,
          config.certificado_base64,
          config.certificado_senha,
          "infEvento"
        );

        const xmlEnvEvento = `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
          <envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
            <idLote>${Date.now()}</idLote>
            ${xmlEventoAssinado}
          </envEvento>
        </nfeDadosMsg>`;

        const responseXml = await sendSoapSefaz(urls.evento, xmlEnvEvento, "nfeRecepcaoEvento");
        const cStatMatch = responseXml.match(/<cStat>(\d+)<\/cStat>/);

        if (cStatMatch?.[1] === "135") {
          await supabase
            .from("notas_fiscais")
            .update({
              carta_correcao_texto: correcao,
              carta_correcao_sequencia: parseInt(seqEvento),
              carta_correcao_data: new Date().toISOString(),
            })
            .eq("id", nfe.id);

          result = { success: true, message: "Carta de correção registrada" };
        } else {
          const xMotivoMatch = responseXml.match(/<xMotivo>([^<]+)<\/xMotivo>/);
          result = {
            success: false,
            cStat: cStatMatch?.[1],
            xMotivo: xMotivoMatch?.[1],
          };
        }
        break;
      }

      default:
        throw new Error("Ação não reconhecida");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na edge function nfe-direto:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
