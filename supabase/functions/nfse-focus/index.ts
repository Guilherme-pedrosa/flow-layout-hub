import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs da Focus NFe
const FOCUS_HOMOLOGACAO = "https://homologacao.focusnfe.com.br";
const FOCUS_PRODUCAO = "https://api.focusnfe.com.br";

interface NFSeRequest {
  action: "emitir" | "consultar" | "cancelar" | "config";
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

    const { action, company_id, data, referencia }: NFSeRequest = await req.json();

    // Buscar configuração da empresa para NFS-e
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

    const baseUrl = config?.ambiente === "producao" ? FOCUS_PRODUCAO : FOCUS_HOMOLOGACAO;
    const token = config?.focus_token;

    // Função auxiliar para fazer requisições à Focus NFe
    async function focusRequest(method: string, endpoint: string, body?: any) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

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

      console.log(`[NFS-e Focus] ${method} ${baseUrl}${endpoint}`);
      
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
        // Salvar ou atualizar configuração de NFS-e
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
          result = { success: true, message: "Configuração de NFS-e atualizada" };
        } else {
          const { error } = await supabase
            .from("nfse_config")
            .insert({ company_id, ...data });

          if (error) throw error;
          result = { success: true, message: "Configuração de NFS-e criada" };
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
        const ref = referencia || `nfse_${company_id}_${Date.now()}`;

        // Buscar dados da empresa
        const { data: empresa } = await supabase
          .from("companies")
          .select("*")
          .eq("id", company_id)
          .single();

        // Montar payload da NFS-e para Anápolis/GO (ABRASF 2.04 via IssNet)
        // A Focus NFe abstrai a comunicação com o webservice da prefeitura
        const nfsePayload = {
          // Dados gerais
          data_emissao: data.data_emissao || new Date().toISOString(),
          natureza_operacao: data.natureza_operacao || 1, // 1 = Tributação no município
          optante_simples_nacional: config?.optante_simples_nacional ?? true,
          regime_especial_tributacao: config?.regime_especial_tributacao || 6, // 6 = Microempresa Municipal
          
          // Prestador (empresa)
          prestador: {
            cnpj: empresa?.cnpj?.replace(/\D/g, ""),
            inscricao_municipal: config?.inscricao_municipal?.replace(/\D/g, ""),
            codigo_municipio: config?.codigo_municipio || "5201108", // Anápolis/GO
          },
          
          // Tomador (cliente)
          tomador: {
            cpf: data.tomador?.cpf?.replace(/\D/g, ""),
            cnpj: data.tomador?.cnpj?.replace(/\D/g, ""),
            razao_social: data.tomador?.razao_social,
            email: data.tomador?.email,
            telefone: data.tomador?.telefone?.replace(/\D/g, ""),
            endereco: {
              logradouro: data.tomador?.logradouro,
              numero: data.tomador?.numero || "S/N",
              complemento: data.tomador?.complemento,
              bairro: data.tomador?.bairro,
              codigo_municipio: data.tomador?.codigo_municipio,
              uf: data.tomador?.uf,
              cep: data.tomador?.cep?.replace(/\D/g, ""),
            },
          },
          
          // Serviço
          servico: {
            discriminacao: data.servico?.discriminacao || data.descricao_servico,
            valor_servicos: data.servico?.valor_servicos || data.valor_total,
            aliquota: data.servico?.aliquota || config?.aliquota_iss || 2.0,
            item_lista_servico: data.servico?.item_lista_servico || config?.item_lista_servico,
            codigo_tributario_municipio: data.servico?.codigo_tributario_municipio || config?.codigo_tributario_municipio,
            codigo_cnae: data.servico?.codigo_cnae || config?.codigo_cnae,
            iss_retido: data.servico?.iss_retido ?? false,
            valor_deducoes: data.servico?.valor_deducoes || 0,
            valor_pis: data.servico?.valor_pis || 0,
            valor_cofins: data.servico?.valor_cofins || 0,
            valor_inss: data.servico?.valor_inss || 0,
            valor_ir: data.servico?.valor_ir || 0,
            valor_csll: data.servico?.valor_csll || 0,
          },
        };

        // Remover campos vazios do tomador
        if (!nfsePayload.tomador.cpf) delete nfsePayload.tomador.cpf;
        if (!nfsePayload.tomador.cnpj) delete nfsePayload.tomador.cnpj;

        console.log("[NFS-e] Payload:", JSON.stringify(nfsePayload, null, 2));

        // Criar registro no banco antes de enviar
        const { data: nfse, error: insertError } = await supabase
          .from("notas_fiscais")
          .insert({
            company_id,
            tipo: "nfse",
            referencia: ref,
            status: "processando",
            natureza_operacao: data.natureza_operacao_texto || "Prestação de serviços",
            data_emissao: data.data_emissao || new Date().toISOString(),
            destinatario_nome: data.tomador?.razao_social,
            destinatario_cpf_cnpj: data.tomador?.cnpj || data.tomador?.cpf,
            destinatario_email: data.tomador?.email,
            valor_total: data.servico?.valor_servicos || data.valor_total,
          })
          .select()
          .single();

        if (insertError) {
          console.error("[NFS-e] Erro ao criar registro:", insertError);
          throw insertError;
        }

        // Enviar para Focus NFe
        const focusResponse = await focusRequest("POST", `/v2/nfse?ref=${ref}`, nfsePayload);

        console.log("[NFS-e] Resposta Focus:", JSON.stringify(focusResponse.data, null, 2));

        // Atualizar status baseado na resposta
        if (focusResponse.status === 200 || focusResponse.status === 201) {
          const updateData: any = {
            status: "processando",
            updated_at: new Date().toISOString(),
          };

          // Se já veio autorizada
          if (focusResponse.data.status === "autorizado") {
            updateData.status = "autorizada";
            updateData.numero = focusResponse.data.numero;
            updateData.protocolo = focusResponse.data.codigo_verificacao;
            updateData.data_autorizacao = new Date().toISOString();
            updateData.xml_url = focusResponse.data.caminho_xml_nota_fiscal;
            updateData.danfe_url = focusResponse.data.url;
          }

          await supabase
            .from("notas_fiscais")
            .update(updateData)
            .eq("id", nfse.id);

          result = {
            success: true,
            nfse_id: nfse.id,
            referencia: ref,
            status: focusResponse.data.status,
            data: focusResponse.data,
          };
        } else {
          // Erro na emissão
          await supabase
            .from("notas_fiscais")
            .update({
              status: "erro",
              mensagem_sefaz: focusResponse.data.mensagem || JSON.stringify(focusResponse.data.erros),
              updated_at: new Date().toISOString(),
            })
            .eq("id", nfse.id);

          result = {
            success: false,
            nfse_id: nfse.id,
            referencia: ref,
            error: focusResponse.data.mensagem || "Erro na emissão",
            erros: focusResponse.data.erros,
          };
        }
        break;
      }

      case "consultar": {
        if (!referencia) {
          return new Response(
            JSON.stringify({ error: "Referência não informada" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const focusResponse = await focusRequest("GET", `/v2/nfse/${referencia}`);

        // Atualizar status no banco
        if (focusResponse.status === 200) {
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };

          if (focusResponse.data.status === "autorizado") {
            updateData.status = "autorizada";
            updateData.numero = focusResponse.data.numero;
            updateData.protocolo = focusResponse.data.codigo_verificacao;
            updateData.data_autorizacao = new Date().toISOString();
            updateData.xml_url = focusResponse.data.caminho_xml_nota_fiscal;
            updateData.danfe_url = focusResponse.data.url;
          } else if (focusResponse.data.status === "erro_autorizacao") {
            updateData.status = "erro";
            updateData.mensagem_sefaz = focusResponse.data.mensagem;
          }

          await supabase
            .from("notas_fiscais")
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

        const focusResponse = await focusRequest("DELETE", `/v2/nfse/${referencia}`, {
          justificativa: data.justificativa || "Cancelamento solicitado pelo emitente",
        });

        if (focusResponse.status === 200) {
          await supabase
            .from("notas_fiscais")
            .update({
              status: "cancelada",
              data_cancelamento: new Date().toISOString(),
              justificativa_cancelamento: data.justificativa,
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
    console.error("Erro na edge function nfse-focus:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
