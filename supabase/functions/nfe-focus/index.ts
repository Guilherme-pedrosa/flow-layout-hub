import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs da Focus NFe
const FOCUS_HOMOLOGACAO = "https://homologacao.focusnfe.com.br";
const FOCUS_PRODUCAO = "https://api.focusnfe.com.br";

interface NFERequest {
  action: "emitir" | "consultar" | "cancelar" | "carta_correcao" | "inutilizar" | "config";
  company_id: string;
  data?: any;
  referencia?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, company_id, data, referencia }: NFERequest = await req.json();

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

    const baseUrl = config?.ambiente === "producao" ? FOCUS_PRODUCAO : FOCUS_HOMOLOGACAO;
    const token = config?.focus_token;

    // Função auxiliar para fazer requisições à Focus NFe
    async function focusRequest(method: string, endpoint: string, body?: any) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Autenticação Basic com token
      if (token) {
        headers["Authorization"] = "Basic " + btoa(token + ":");
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${baseUrl}${endpoint}`, options);
      const responseData = await response.json();

      return {
        status: response.status,
        data: responseData,
      };
    }

    let result;

    switch (action) {
      case "config": {
        // Salvar ou atualizar configuração
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
          result = { success: true, message: "Configuração atualizada" };
        } else {
          const { error } = await supabase
            .from("nfe_config")
            .insert({ company_id, ...data });

          if (error) throw error;
          result = { success: true, message: "Configuração criada" };
        }
        break;
      }

      case "emitir": {
        if (!token) {
          return new Response(
            JSON.stringify({ error: "Token Focus NFe não configurado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Gerar referência única
        const ref = referencia || `nfe_${company_id}_${Date.now()}`;

        // Buscar dados da empresa
        const { data: empresa } = await supabase
          .from("companies")
          .select("*")
          .eq("id", company_id)
          .single();

        // Montar payload da NF-e
        const nfePayload = {
          natureza_operacao: data.natureza_operacao || config.natureza_operacao_padrao,
          data_emissao: data.data_emissao || new Date().toISOString(),
          tipo_documento: data.tipo_documento || 1, // 1 = Saída
          finalidade_emissao: data.finalidade_emissao || 1, // 1 = Normal
          consumidor_final: data.consumidor_final || 1, // 1 = Consumidor final
          presenca_comprador: data.presenca_comprador || 1, // 1 = Presencial
          
          // Emitente (empresa)
          cnpj_emitente: empresa?.cnpj?.replace(/\D/g, ""),
          nome_emitente: empresa?.razao_social || empresa?.name,
          nome_fantasia_emitente: empresa?.name,
          logradouro_emitente: empresa?.endereco,
          numero_emitente: empresa?.numero || "S/N",
          bairro_emitente: empresa?.bairro,
          municipio_emitente: empresa?.cidade,
          uf_emitente: empresa?.uf,
          cep_emitente: empresa?.cep?.replace(/\D/g, ""),
          inscricao_estadual_emitente: config?.inscricao_estadual?.replace(/\D/g, ""),
          regime_tributario_emitente: config?.regime_tributario === "simples_nacional" ? 1 : 3,
          
          // Destinatário
          cpf_destinatario: data.destinatario?.cpf?.replace(/\D/g, ""),
          cnpj_destinatario: data.destinatario?.cnpj?.replace(/\D/g, ""),
          nome_destinatario: data.destinatario?.nome,
          logradouro_destinatario: data.destinatario?.logradouro,
          numero_destinatario: data.destinatario?.numero || "S/N",
          bairro_destinatario: data.destinatario?.bairro,
          municipio_destinatario: data.destinatario?.municipio,
          uf_destinatario: data.destinatario?.uf,
          cep_destinatario: data.destinatario?.cep?.replace(/\D/g, ""),
          indicador_inscricao_estadual_destinatario: data.destinatario?.ie ? 1 : 9,
          inscricao_estadual_destinatario: data.destinatario?.ie?.replace(/\D/g, ""),
          
          // Itens
          items: data.itens?.map((item: any, index: number) => ({
            numero_item: index + 1,
            codigo_produto: item.codigo || item.id,
            descricao: item.descricao,
            cfop: item.cfop || config?.cfop_padrao || "5102",
            unidade_comercial: item.unidade || "UN",
            quantidade_comercial: item.quantidade,
            valor_unitario_comercial: item.valor_unitario,
            valor_bruto: item.valor_total,
            unidade_tributavel: item.unidade || "UN",
            quantidade_tributavel: item.quantidade,
            valor_unitario_tributavel: item.valor_unitario,
            origem: item.origem || "0", // 0 = Nacional
            ncm: item.ncm || "00000000",
            
            // ICMS - Simples Nacional
            icms_situacao_tributaria: config?.regime_tributario === "simples_nacional" ? "102" : "00",
            icms_aliquota: item.icms_aliquota || 0,
            icms_base_calculo: item.icms_base_calculo || 0,
            icms_valor: item.icms_valor || 0,
            
            // PIS
            pis_situacao_tributaria: "07", // Outras operações de saída
            pis_aliquota_porcentual: 0,
            
            // COFINS
            cofins_situacao_tributaria: "07", // Outras operações de saída
            cofins_aliquota_porcentual: 0,
          })),
          
          // Totais
          icms_base_calculo: data.icms_base_calculo || 0,
          icms_valor_total: data.icms_valor || 0,
          valor_produtos: data.valor_produtos,
          valor_frete: data.valor_frete || 0,
          valor_seguro: data.valor_seguro || 0,
          valor_desconto: data.valor_desconto || 0,
          valor_outras_despesas: data.valor_outras_despesas || 0,
          valor_total: data.valor_total,
          
          // Transporte
          modalidade_frete: data.modalidade_frete || 9, // 9 = Sem frete
          
          // Informações adicionais
          informacoes_complementares: data.informacoes_complementares,
        };

        // Enviar para Focus NFe
        const focusResponse = await focusRequest("POST", `/v2/nfe?ref=${ref}`, nfePayload);

        // Salvar no banco
        const nfeRecord = {
          company_id,
          referencia: ref,
          tipo: "nfe",
          status: focusResponse.status === 201 ? "processando" : "rejeitada",
          data_emissao: new Date().toISOString(),
          valor_total: data.valor_total,
          valor_produtos: data.valor_produtos,
          valor_frete: data.valor_frete || 0,
          natureza_operacao: nfePayload.natureza_operacao,
          cfop: config?.cfop_padrao,
          destinatario_nome: data.destinatario?.nome,
          destinatario_cpf_cnpj: data.destinatario?.cpf || data.destinatario?.cnpj,
          destinatario_id: data.destinatario_id,
          payload_envio: nfePayload,
          payload_retorno: focusResponse.data,
          mensagem_sefaz: focusResponse.data?.mensagem || focusResponse.data?.erros?.join(", "),
          sale_id: data.sale_id,
        };

        const { data: nfeInserted, error: insertError } = await supabase
          .from("nfe_emitidas")
          .insert(nfeRecord)
          .select()
          .single();

        if (insertError) throw insertError;

        // Salvar itens
        if (data.itens && nfeInserted) {
          const itensToInsert = data.itens.map((item: any, index: number) => ({
            nfe_id: nfeInserted.id,
            produto_id: item.produto_id,
            codigo: item.codigo,
            descricao: item.descricao,
            ncm: item.ncm,
            cfop: item.cfop || config?.cfop_padrao,
            unidade: item.unidade || "UN",
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            numero_item: index + 1,
          }));

          await supabase.from("nfe_itens").insert(itensToInsert);
        }

        result = {
          success: focusResponse.status === 201,
          nfe_id: nfeInserted?.id,
          referencia: ref,
          status: nfeRecord.status,
          focus_response: focusResponse.data,
        };
        break;
      }

      case "consultar": {
        if (!referencia) {
          return new Response(
            JSON.stringify({ error: "Referência não informada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const focusResponse = await focusRequest("GET", `/v2/nfe/${referencia}`);

        // Atualizar status no banco
        if (focusResponse.status === 200) {
          const updateData: any = {
            payload_retorno: focusResponse.data,
            updated_at: new Date().toISOString(),
          };

          if (focusResponse.data.status === "autorizado") {
            updateData.status = "autorizada";
            updateData.chave_acesso = focusResponse.data.chave_nfe;
            updateData.protocolo = focusResponse.data.protocolo;
            updateData.numero = focusResponse.data.numero;
            updateData.serie = focusResponse.data.serie;
            updateData.data_autorizacao = new Date().toISOString();
            updateData.xml_url = focusResponse.data.caminho_xml_nota_fiscal;
            updateData.pdf_url = focusResponse.data.caminho_danfe;
          } else if (focusResponse.data.status === "erro_autorizacao") {
            updateData.status = "rejeitada";
            updateData.status_sefaz = focusResponse.data.status_sefaz;
            updateData.mensagem_sefaz = focusResponse.data.mensagem_sefaz;
          }

          await supabase
            .from("nfe_emitidas")
            .update(updateData)
            .eq("company_id", company_id)
            .eq("referencia", referencia);
        }

        result = {
          success: true,
          data: focusResponse.data,
        };
        break;
      }

      case "cancelar": {
        if (!referencia) {
          return new Response(
            JSON.stringify({ error: "Referência não informada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const focusResponse = await focusRequest("DELETE", `/v2/nfe/${referencia}`, {
          justificativa: data.justificativa || "Erro na emissão",
        });

        if (focusResponse.status === 200) {
          await supabase
            .from("nfe_emitidas")
            .update({
              status: "cancelada",
              data_cancelamento: new Date().toISOString(),
              payload_retorno: focusResponse.data,
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", company_id)
            .eq("referencia", referencia);
        }

        result = {
          success: focusResponse.status === 200,
          data: focusResponse.data,
        };
        break;
      }

      case "carta_correcao": {
        if (!referencia) {
          return new Response(
            JSON.stringify({ error: "Referência não informada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const focusResponse = await focusRequest("POST", `/v2/nfe/${referencia}/carta_correcao`, {
          correcao: data.correcao,
        });

        if (focusResponse.status === 200) {
          // Buscar sequência atual
          const { data: nfeAtual } = await supabase
            .from("nfe_emitidas")
            .select("carta_correcao_sequencia")
            .eq("company_id", company_id)
            .eq("referencia", referencia)
            .single();

          await supabase
            .from("nfe_emitidas")
            .update({
              carta_correcao_texto: data.correcao,
              carta_correcao_sequencia: (nfeAtual?.carta_correcao_sequencia || 0) + 1,
              carta_correcao_data: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", company_id)
            .eq("referencia", referencia);
        }

        result = {
          success: focusResponse.status === 200,
          data: focusResponse.data,
        };
        break;
      }

      case "inutilizar": {
        const focusResponse = await focusRequest("POST", `/v2/nfe/inutilizacao`, {
          cnpj: data.cnpj,
          serie: data.serie,
          numero_inicial: data.numero_inicial,
          numero_final: data.numero_final,
          justificativa: data.justificativa,
        });

        result = {
          success: focusResponse.status === 200,
          data: focusResponse.data,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação não reconhecida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na edge function nfe-focus:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
