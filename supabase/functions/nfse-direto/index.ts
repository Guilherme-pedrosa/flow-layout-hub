import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs do webservice IssNet Anápolis (ABRASF 2.04)
const ISSNET_PRODUCAO = "https://abrasf.issnetonline.com.br/webserviceabrasf/anapolis/servicos.asmx";
const ISSNET_HOMOLOGACAO = "https://www.issnetonline.com.br/homologaabrasf/webservicenfse204/nfse.asmx";

// Namespace ABRASF
const NS_ABRASF = "http://www.abrasf.org.br/nfse.xsd";
const NS_TIPOS = "http://www.abrasf.org.br/tipos_complexos.xsd";

interface NFSeRequest {
  action: "emitir" | "consultar" | "cancelar" | "config";
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

// Função para gerar XML de RPS (Recibo Provisório de Serviço)
function gerarXmlRps(dados: any, config: any, empresa: any, numeroRps: number): string {
  const dataEmissao = dados.data_emissao || new Date().toISOString();
  const dataCompetencia = dataEmissao.substring(0, 10);
  
  // Limpar CNPJ/CPF
  const cnpjPrestador = (empresa.cnpj || "").replace(/\D/g, "");
  const cpfCnpjTomador = (dados.tomador?.cnpj || dados.tomador?.cpf || "").replace(/\D/g, "");
  
  // Determinar se é CPF ou CNPJ
  const tagDocTomador = cpfCnpjTomador.length === 11 ? "Cpf" : "Cnpj";
  
  // Valores
  const valorServicos = parseFloat(dados.servico?.valor_servicos || 0).toFixed(2);
  const aliquota = parseFloat(dados.servico?.aliquota || config.aliquota_iss || 2).toFixed(4);
  const valorIss = (parseFloat(valorServicos) * parseFloat(aliquota) / 100).toFixed(2);
  
  // ISS Retido
  const issRetido = dados.servico?.iss_retido ? "1" : "2"; // 1=Sim, 2=Não
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="${NS_ABRASF}">
  <LoteRps Id="lote${Date.now()}" versao="2.04">
    <NumeroLote>1</NumeroLote>
    <CpfCnpj>
      <Cnpj>${cnpjPrestador}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>${config.inscricao_municipal}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfDeclaracaoPrestacaoServico Id="rps${numeroRps}">
          <Rps>
            <IdentificacaoRps>
              <Numero>${numeroRps}</Numero>
              <Serie>${config.serie_nfse || 1}</Serie>
              <Tipo>1</Tipo>
            </IdentificacaoRps>
            <DataEmissao>${dataEmissao}</DataEmissao>
            <Status>1</Status>
          </Rps>
          <Competencia>${dataCompetencia}</Competencia>
          <Servico>
            <Valores>
              <ValorServicos>${valorServicos}</ValorServicos>
              <ValorDeducoes>${parseFloat(dados.servico?.valor_deducoes || 0).toFixed(2)}</ValorDeducoes>
              <ValorPis>${parseFloat(dados.servico?.valor_pis || 0).toFixed(2)}</ValorPis>
              <ValorCofins>${parseFloat(dados.servico?.valor_cofins || 0).toFixed(2)}</ValorCofins>
              <ValorInss>${parseFloat(dados.servico?.valor_inss || 0).toFixed(2)}</ValorInss>
              <ValorIr>${parseFloat(dados.servico?.valor_ir || 0).toFixed(2)}</ValorIr>
              <ValorCsll>${parseFloat(dados.servico?.valor_csll || 0).toFixed(2)}</ValorCsll>
              <IssRetido>${issRetido}</IssRetido>
              <ValorIss>${valorIss}</ValorIss>
              <Aliquota>${aliquota}</Aliquota>
            </Valores>
            <ItemListaServico>${dados.servico?.item_lista_servico || config.item_lista_servico}</ItemListaServico>
            <CodigoCnae>${dados.servico?.codigo_cnae || config.codigo_cnae}</CodigoCnae>
            <CodigoTributacaoMunicipio>${dados.servico?.codigo_tributario_municipio || config.codigo_tributario_municipio || config.codigo_cnae}</CodigoTributacaoMunicipio>
            <Discriminacao>${escapeXml(dados.servico?.discriminacao || "")}</Discriminacao>
            <CodigoMunicipio>${config.codigo_municipio || "5201108"}</CodigoMunicipio>
          </Servico>
          <Prestador>
            <CpfCnpj>
              <Cnpj>${cnpjPrestador}</Cnpj>
            </CpfCnpj>
            <InscricaoMunicipal>${config.inscricao_municipal}</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador>
              <CpfCnpj>
                <${tagDocTomador}>${cpfCnpjTomador}</${tagDocTomador}>
              </CpfCnpj>
            </IdentificacaoTomador>
            <RazaoSocial>${escapeXml(dados.tomador?.razao_social || "")}</RazaoSocial>
            <Endereco>
              <Endereco>${escapeXml(dados.tomador?.logradouro || "")}</Endereco>
              <Numero>${escapeXml(dados.tomador?.numero || "S/N")}</Numero>
              <Complemento>${escapeXml(dados.tomador?.complemento || "")}</Complemento>
              <Bairro>${escapeXml(dados.tomador?.bairro || "")}</Bairro>
              <CodigoMunicipio>${dados.tomador?.codigo_municipio || "5201108"}</CodigoMunicipio>
              <Uf>${dados.tomador?.uf || "GO"}</Uf>
              <Cep>${(dados.tomador?.cep || "").replace(/\D/g, "")}</Cep>
            </Endereco>
            ${dados.tomador?.email ? `<Contato><Email>${escapeXml(dados.tomador.email)}</Email></Contato>` : ""}
          </Tomador>
          <OptanteSimplesNacional>${config.optante_simples_nacional ? "1" : "2"}</OptanteSimplesNacional>
          <RegimeEspecialTributacao>${config.regime_especial_tributacao || 6}</RegimeEspecialTributacao>
          <IncentivoFiscal>2</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;

  return xml;
}

// Função para escapar caracteres especiais XML
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Função para enviar SOAP request
async function sendSoapRequest(url: string, soapAction: string, xmlBody: string): Promise<string> {
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="${NS_ABRASF}">
  <soap:Body>
    ${xmlBody}
  </soap:Body>
</soap:Envelope>`;

  console.log(`[NFS-e] Enviando para ${url}`);
  console.log(`[NFS-e] SOAPAction: ${soapAction}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": soapAction,
    },
    body: soapEnvelope,
  });

  const responseText = await response.text();
  console.log(`[NFS-e] Status: ${response.status}`);
  
  return responseText;
}

// Função para extrair dados da resposta XML
function parseResponse(xml: string): any {
  // Extrair número da NFS-e
  const numeroMatch = xml.match(/<Numero>(\d+)<\/Numero>/);
  const codigoVerificacaoMatch = xml.match(/<CodigoVerificacao>([^<]+)<\/CodigoVerificacao>/);
  const dataEmissaoMatch = xml.match(/<DataEmissao>([^<]+)<\/DataEmissao>/);
  
  // Verificar erros
  const erroMatch = xml.match(/<MensagemRetorno>[\s\S]*?<Codigo>([^<]+)<\/Codigo>[\s\S]*?<Mensagem>([^<]+)<\/Mensagem>/);
  
  if (erroMatch) {
    return {
      success: false,
      codigo_erro: erroMatch[1],
      mensagem_erro: erroMatch[2],
    };
  }
  
  if (numeroMatch) {
    return {
      success: true,
      numero: numeroMatch[1],
      codigo_verificacao: codigoVerificacaoMatch?.[1] || "",
      data_emissao: dataEmissaoMatch?.[1] || "",
    };
  }
  
  // Verificar se está processando
  const protocoloMatch = xml.match(/<Protocolo>([^<]+)<\/Protocolo>/);
  if (protocoloMatch) {
    return {
      success: true,
      status: "processando",
      protocolo: protocoloMatch[1],
    };
  }
  
  return {
    success: false,
    mensagem_erro: "Resposta não reconhecida",
    xml_resposta: xml,
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

    const { action, company_id, data, referencia }: NFSeRequest = await req.json();

    // Buscar configuração da empresa
    const { data: config, error: configError } = await supabase
      .from("nfse_config")
      .select("*")
      .eq("company_id", company_id)
      .single();

    if (configError && action !== "config") {
      return new Response(
        JSON.stringify({ error: "Configuração de NFS-e não encontrada. Configure primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados da empresa
    const { data: empresa } = await supabase
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .single();

    const baseUrl = config?.ambiente === "producao" ? ISSNET_PRODUCAO : ISSNET_HOMOLOGACAO;

    let result;

    switch (action) {
      case "config": {
        // Salvar configuração
        const { data: existingConfig } = await supabase
          .from("nfse_config")
          .select("id")
          .eq("company_id", company_id)
          .single();

        if (existingConfig) {
          const { error } = await supabase
            .from("nfse_config")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("company_id", company_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("nfse_config")
            .insert({ company_id, ...data });
          if (error) throw error;
        }
        result = { success: true, message: "Configuração salva" };
        break;
      }

      case "emitir": {
        // Verificar certificado
        if (!config?.certificado_base64 || !config?.certificado_senha) {
          throw new Error("Certificado digital não configurado");
        }

        // Buscar próximo número RPS
        const { data: ultimoRps } = await supabase
          .from("notas_fiscais")
          .select("numero")
          .eq("company_id", company_id)
          .eq("tipo", "nfse")
          .order("numero", { ascending: false })
          .limit(1)
          .maybeSingle();

        const proximoRps = (parseInt(ultimoRps?.numero || "0") || config.ultimo_numero_rps || 0) + 1;
        const ref = referencia || `nfse_${company_id}_${Date.now()}`;

        // Gerar XML do RPS
        let xmlRps = gerarXmlRps(data, config, empresa, proximoRps);
        
        console.log("[NFS-e] XML gerado:", xmlRps);

        // Assinar XML
        const xmlAssinado = await signXml(
          supabase,
          xmlRps,
          config.certificado_base64,
          config.certificado_senha,
          "InfDeclaracaoPrestacaoServico"
        );

        console.log("[NFS-e] XML assinado");

        // Criar registro no banco
        const { data: nfse, error: insertError } = await supabase
          .from("notas_fiscais")
          .insert({
            company_id,
            tipo: "nfse",
            referencia: ref,
            status: "processando",
            natureza_operacao: "Prestação de serviços",
            data_emissao: data.data_emissao || new Date().toISOString(),
            destinatario_nome: data.tomador?.razao_social,
            destinatario_cpf_cnpj: data.tomador?.cnpj || data.tomador?.cpf,
            destinatario_email: data.tomador?.email,
            valor_total: data.servico?.valor_servicos,
            numero: String(proximoRps),
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Enviar para webservice
        const soapAction = "http://nfse.abrasf.org.br/RecepcionarLoteRps";
        const responseXml = await sendSoapRequest(baseUrl, soapAction, xmlAssinado);

        console.log("[NFS-e] Resposta:", responseXml);

        // Processar resposta
        const parsedResponse = parseResponse(responseXml);

        // Atualizar registro
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (parsedResponse.success) {
          if (parsedResponse.numero) {
            updateData.status = "autorizada";
            updateData.numero = parsedResponse.numero;
            updateData.protocolo = parsedResponse.codigo_verificacao;
            updateData.data_autorizacao = new Date().toISOString();
          } else if (parsedResponse.protocolo) {
            updateData.status = "processando";
            updateData.protocolo = parsedResponse.protocolo;
          }
        } else {
          updateData.status = "erro";
          updateData.mensagem_sefaz = parsedResponse.mensagem_erro;
        }

        await supabase
          .from("notas_fiscais")
          .update(updateData)
          .eq("id", nfse.id);

        // Atualizar último número RPS
        await supabase
          .from("nfse_config")
          .update({ ultimo_numero_rps: proximoRps })
          .eq("company_id", company_id);

        result = {
          success: parsedResponse.success,
          nfse_id: nfse.id,
          referencia: ref,
          numero: parsedResponse.numero,
          codigo_verificacao: parsedResponse.codigo_verificacao,
          protocolo: parsedResponse.protocolo,
          error: parsedResponse.mensagem_erro,
        };
        break;
      }

      case "consultar": {
        if (!referencia) {
          throw new Error("Referência não informada");
        }

        // Buscar NFS-e no banco
        const { data: nfse } = await supabase
          .from("notas_fiscais")
          .select("*")
          .eq("company_id", company_id)
          .eq("referencia", referencia)
          .single();

        if (!nfse) {
          throw new Error("NFS-e não encontrada");
        }

        // Se já está autorizada, retornar dados
        if (nfse.status === "autorizada") {
          result = {
            success: true,
            status: "autorizada",
            numero: nfse.numero,
            codigo_verificacao: nfse.protocolo,
          };
          break;
        }

        // Consultar no webservice
        const xmlConsulta = `<ConsultarLoteRpsEnvio xmlns="${NS_ABRASF}">
          <Prestador>
            <CpfCnpj><Cnpj>${empresa?.cnpj?.replace(/\D/g, "")}</Cnpj></CpfCnpj>
            <InscricaoMunicipal>${config.inscricao_municipal}</InscricaoMunicipal>
          </Prestador>
          <Protocolo>${nfse.protocolo}</Protocolo>
        </ConsultarLoteRpsEnvio>`;

        const soapAction = "http://nfse.abrasf.org.br/ConsultarLoteRps";
        const responseXml = await sendSoapRequest(baseUrl, soapAction, xmlConsulta);
        const parsedResponse = parseResponse(responseXml);

        if (parsedResponse.success && parsedResponse.numero) {
          await supabase
            .from("notas_fiscais")
            .update({
              status: "autorizada",
              numero: parsedResponse.numero,
              protocolo: parsedResponse.codigo_verificacao,
              data_autorizacao: new Date().toISOString(),
            })
            .eq("id", nfse.id);
        }

        result = parsedResponse;
        break;
      }

      case "cancelar": {
        if (!referencia) {
          throw new Error("Referência não informada");
        }

        const { data: nfse } = await supabase
          .from("notas_fiscais")
          .select("*")
          .eq("company_id", company_id)
          .eq("referencia", referencia)
          .single();

        if (!nfse) {
          throw new Error("NFS-e não encontrada");
        }

        if (nfse.status !== "autorizada") {
          throw new Error("Apenas NFS-e autorizadas podem ser canceladas");
        }

        // Gerar XML de cancelamento
        let xmlCancelamento = `<CancelarNfseEnvio xmlns="${NS_ABRASF}">
          <Pedido>
            <InfPedidoCancelamento Id="cancel${nfse.numero}">
              <IdentificacaoNfse>
                <Numero>${nfse.numero}</Numero>
                <CpfCnpj><Cnpj>${empresa?.cnpj?.replace(/\D/g, "")}</Cnpj></CpfCnpj>
                <InscricaoMunicipal>${config.inscricao_municipal}</InscricaoMunicipal>
                <CodigoMunicipio>${config.codigo_municipio || "5201108"}</CodigoMunicipio>
              </IdentificacaoNfse>
              <CodigoCancelamento>1</CodigoCancelamento>
            </InfPedidoCancelamento>
          </Pedido>
        </CancelarNfseEnvio>`;

        // Assinar XML de cancelamento
        const xmlCancelamentoAssinado = await signXml(
          supabase,
          xmlCancelamento,
          config.certificado_base64,
          config.certificado_senha,
          "InfPedidoCancelamento"
        );

        const soapAction = "http://nfse.abrasf.org.br/CancelarNfse";
        const responseXml = await sendSoapRequest(baseUrl, soapAction, xmlCancelamentoAssinado);
        const parsedResponse = parseResponse(responseXml);

        if (parsedResponse.success) {
          await supabase
            .from("notas_fiscais")
            .update({
              status: "cancelada",
              data_cancelamento: new Date().toISOString(),
              justificativa_cancelamento: data?.justificativa,
            })
            .eq("id", nfse.id);
        }

        result = parsedResponse;
        break;
      }

      default:
        throw new Error("Ação não reconhecida");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na edge function nfse-direto:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
