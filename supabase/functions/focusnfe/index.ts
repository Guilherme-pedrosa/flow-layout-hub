import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tipos
interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

interface Destinatario {
  cpf?: string;
  cnpj?: string;
  nome: string;
  telefone?: string;
  email?: string;
  inscricao_estadual?: string;
  endereco: Endereco;
}

interface ItemNFe {
  numero_item: number;
  codigo_produto: string;
  descricao: string;
  cfop: string;
  ncm?: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_unitario_tributavel: number;
  unidade_tributavel: string;
  quantidade_tributavel: number;
  valor_bruto: number;
  icms_situacao_tributaria: string;
  icms_origem: string;
  pis_situacao_tributaria: string;
  cofins_situacao_tributaria: string;
}

interface DadosNFe {
  data_emissao: string;
  natureza_operacao: string;
  tipo_documento: string;
  finalidade_emissao: string;
  forma_pagamento: string;
  cnpj_emitente: string;
  destinatario: Destinatario;
  itens: ItemNFe[];
  icms_base_calculo: number;
  icms_valor_total: number;
  valor_total: number;
  valor_produtos: number;
  valor_frete?: number;
  valor_desconto?: number;
  informacoes_complementares?: string;
}

// Cliente Focus NFe
class FocusNFeClient {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly timeout: number;

  constructor(token: string, ambiente: 'homologacao' | 'producao', timeout = 30000) {
    this.token = token;
    this.timeout = timeout;
    this.baseURL = ambiente === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';
  }

  private async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Base64 encode for Basic Auth
    const credentials = btoa(`${this.token}:`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`
    };

    console.log(`[FocusNFe] ${method} ${endpoint}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.error('[FocusNFe] Error:', response.status, data);
        throw {
          codigo: response.status.toString(),
          mensagem: data.mensagem || 'Erro na requisição',
          erros: data.erros
        };
      }

      console.log('[FocusNFe] Success:', data.status);
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw { codigo: 'TIMEOUT', mensagem: 'Timeout na requisição à API Focus NFe' };
      }
      throw error;
    }
  }

  async emitirNFe(referencia: string, dados: DadosNFe): Promise<any> {
    return this.request('POST', `/v2/nfe?ref=${referencia}`, dados);
  }

  async consultarNFe(referencia: string): Promise<any> {
    return this.request('GET', `/v2/nfe/${referencia}`);
  }

  async cancelarNFe(referencia: string, justificativa: string): Promise<any> {
    return this.request('DELETE', `/v2/nfe/${referencia}`, { justificativa });
  }

  async aguardarProcessamento(referencia: string, intervalo = 3000, tentativasMaximas = 40): Promise<any> {
    let tentativas = 0;
    
    while (tentativas < tentativasMaximas) {
      const resultado = await this.consultarNFe(referencia);
      
      if (resultado.status !== 'processando_autorizacao') {
        return resultado;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalo));
      tentativas++;
    }
    
    throw new Error('Timeout: NFe ainda está sendo processada');
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FOCUS_NFE_TOKEN = Deno.env.get('FOCUS_NFE_TOKEN');
    if (!FOCUS_NFE_TOKEN) {
      throw new Error('FOCUS_NFE_TOKEN não configurado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();
    console.log(`[FocusNFe] Action: ${action}`);

    // Usar ambiente de homologação por padrão, mudar para produção quando necessário
    const ambiente = Deno.env.get('FOCUS_NFE_AMBIENTE') as 'homologacao' | 'producao' || 'homologacao';
    const focusNFe = new FocusNFeClient(FOCUS_NFE_TOKEN, ambiente);

    switch (action) {
      case 'emitir': {
        const { saleId, companyId } = params;
        
        // Buscar dados da venda
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .select(`
            *,
            cliente:client_id(*)
          `)
          .eq('id', saleId)
          .single();

        if (saleError || !sale) {
          throw new Error('Venda não encontrada');
        }

        // Buscar itens da venda
        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select(`
            *,
            product:product_id(*)
          `)
          .eq('sale_id', saleId);

        if (itemsError) {
          throw new Error('Erro ao buscar itens da venda');
        }

        // Buscar dados da empresa
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyError || !company) {
          throw new Error('Empresa não encontrada');
        }

        // Gerar referência única
        const referencia = `VENDA-${saleId.substring(0, 8)}-${Date.now()}`;

        // Montar dados da NFe
        const cliente = sale.cliente || {};
        const dadosNFe: DadosNFe = {
          data_emissao: new Date().toISOString(),
          natureza_operacao: 'Venda de Mercadoria',
          tipo_documento: '1',
          finalidade_emissao: '1',
          forma_pagamento: '0',
          cnpj_emitente: company.cnpj?.replace(/\D/g, '') || '',
          destinatario: {
            nome: cliente.razao_social || cliente.nome_fantasia || 'Consumidor Final',
            cpf: cliente.tipo_pessoa === 'fisica' ? cliente.cpf_cnpj?.replace(/\D/g, '') : undefined,
            cnpj: cliente.tipo_pessoa === 'juridica' ? cliente.cpf_cnpj?.replace(/\D/g, '') : undefined,
            email: cliente.email,
            telefone: cliente.telefone?.replace(/\D/g, ''),
            inscricao_estadual: cliente.inscricao_estadual || 'ISENTO',
            endereco: {
              logradouro: cliente.logradouro || 'Não informado',
              numero: cliente.numero || 'S/N',
              complemento: cliente.complemento,
              bairro: cliente.bairro || 'Centro',
              municipio: cliente.cidade || 'São Paulo',
              uf: cliente.estado || 'SP',
              cep: (cliente.cep || '00000000').replace(/\D/g, '')
            }
          },
          itens: (items || []).map((item: any, index: number) => ({
            numero_item: index + 1,
            codigo_produto: item.product?.code || `PROD-${index + 1}`,
            descricao: item.description || item.product?.description || 'Produto',
            cfop: item.product?.cfop || '5102',
            ncm: item.product?.ncm || '00000000',
            unidade_comercial: item.unit || item.product?.unit || 'UN',
            quantidade_comercial: item.quantity || 1,
            valor_unitario_comercial: item.unit_price || 0,
            unidade_tributavel: item.unit || item.product?.unit || 'UN',
            quantidade_tributavel: item.quantity || 1,
            valor_unitario_tributavel: item.unit_price || 0,
            valor_bruto: (item.quantity || 1) * (item.unit_price || 0),
            icms_situacao_tributaria: '102', // Simples Nacional
            icms_origem: '0',
            pis_situacao_tributaria: '07',
            cofins_situacao_tributaria: '07'
          })),
          icms_base_calculo: 0,
          icms_valor_total: 0,
          valor_produtos: sale.total_value || 0,
          valor_total: sale.total_value || 0,
          valor_frete: 0,
          valor_desconto: sale.discount_value || 0,
          informacoes_complementares: sale.observations || ''
        };

        // Criar registro da NFe no banco
        const { data: nfe, error: nfeError } = await supabase
          .from('notas_fiscais')
          .insert({
            company_id: companyId,
            sale_id: saleId,
            referencia,
            tipo: 'NFe',
            status: 'processando',
            valor_total: sale.total_value,
            valor_produtos: sale.total_value,
            destinatario_nome: dadosNFe.destinatario.nome,
            destinatario_cpf_cnpj: dadosNFe.destinatario.cpf || dadosNFe.destinatario.cnpj,
            destinatario_email: dadosNFe.destinatario.email,
            natureza_operacao: dadosNFe.natureza_operacao,
            data_emissao: new Date().toISOString()
          })
          .select()
          .single();

        if (nfeError) {
          console.error('[FocusNFe] Error creating NFe record:', nfeError);
          throw new Error('Erro ao criar registro da NFe');
        }

        // Registrar log de tentativa
        await supabase.from('nfe_logs').insert({
          nota_fiscal_id: nfe.id,
          referencia,
          tipo: 'emissao',
          status: 'iniciado',
          request_data: dadosNFe
        });

        try {
          // Emitir NFe via Focus NFe
          const resultadoEmissao = await focusNFe.emitirNFe(referencia, dadosNFe);
          console.log('[FocusNFe] Emissão iniciada:', resultadoEmissao);

          // Aguardar processamento
          const resultado = await focusNFe.aguardarProcessamento(referencia);
          console.log('[FocusNFe] Resultado final:', resultado);

          if (resultado.status === 'autorizado') {
            // Atualizar NFe com dados da autorização
            await supabase
              .from('notas_fiscais')
              .update({
                status: 'autorizado',
                status_sefaz: resultado.status_sefaz,
                mensagem_sefaz: resultado.mensagem_sefaz,
                chave_nfe: resultado.chave_nfe,
                numero: resultado.numero,
                serie: resultado.serie,
                protocolo: resultado.protocolo,
                xml_url: resultado.caminho_xml_nota_fiscal,
                danfe_url: resultado.caminho_danfe,
                data_autorizacao: new Date().toISOString()
              })
              .eq('id', nfe.id);

            // Salvar itens
            const nfeItens = dadosNFe.itens.map((item, index) => ({
              nota_fiscal_id: nfe.id,
              numero_item: item.numero_item,
              product_id: items?.[index]?.product_id,
              codigo_produto: item.codigo_produto,
              descricao: item.descricao,
              ncm: item.ncm,
              cfop: item.cfop,
              unidade_comercial: item.unidade_comercial,
              quantidade_comercial: item.quantidade_comercial,
              valor_unitario: item.valor_unitario_comercial,
              valor_bruto: item.valor_bruto,
              icms_situacao_tributaria: item.icms_situacao_tributaria,
              icms_origem: item.icms_origem,
              pis_situacao_tributaria: item.pis_situacao_tributaria,
              cofins_situacao_tributaria: item.cofins_situacao_tributaria
            }));

            await supabase.from('nfe_itens').insert(nfeItens);

            // Atualizar venda com status da NFe
            await supabase
              .from('sales')
              .update({
                nfe_status: 'autorizado',
                nfe_chave: resultado.chave_nfe
              })
              .eq('id', saleId);

            // Registrar log de sucesso
            await supabase.from('nfe_logs').insert({
              nota_fiscal_id: nfe.id,
              referencia,
              tipo: 'emissao',
              status: 'autorizado',
              response_data: resultado
            });

            return new Response(JSON.stringify({
              success: true,
              nfe_id: nfe.id,
              chave: resultado.chave_nfe,
              numero: resultado.numero,
              serie: resultado.serie,
              danfe_url: resultado.caminho_danfe,
              xml_url: resultado.caminho_xml_nota_fiscal
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            // Erro na autorização
            await supabase
              .from('notas_fiscais')
              .update({
                status: 'erro',
                status_sefaz: resultado.status_sefaz,
                mensagem_sefaz: resultado.mensagem_sefaz
              })
              .eq('id', nfe.id);

            await supabase.from('nfe_logs').insert({
              nota_fiscal_id: nfe.id,
              referencia,
              tipo: 'emissao',
              status: 'erro',
              mensagem: resultado.mensagem_sefaz,
              response_data: resultado
            });

            throw new Error(`Erro na autorização: ${resultado.mensagem_sefaz}`);
          }
        } catch (error: any) {
          // Atualizar status para erro
          await supabase
            .from('notas_fiscais')
            .update({
              status: 'erro',
              mensagem_sefaz: error.mensagem || error.message
            })
            .eq('id', nfe.id);

          await supabase.from('nfe_logs').insert({
            nota_fiscal_id: nfe.id,
            referencia,
            tipo: 'emissao',
            status: 'erro',
            mensagem: error.mensagem || error.message,
            response_data: error
          });

          throw error;
        }
      }

      case 'consultar': {
        const { referencia } = params;
        const resultado = await focusNFe.consultarNFe(referencia);
        
        return new Response(JSON.stringify(resultado), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'cancelar': {
        const { nfeId, justificativa } = params;
        
        if (!justificativa || justificativa.length < 15) {
          throw new Error('Justificativa deve ter no mínimo 15 caracteres');
        }

        // Buscar NFe
        const { data: nfe, error: nfeError } = await supabase
          .from('notas_fiscais')
          .select('*')
          .eq('id', nfeId)
          .single();

        if (nfeError || !nfe) {
          throw new Error('NFe não encontrada');
        }

        if (nfe.status !== 'autorizado') {
          throw new Error('Apenas NFes autorizadas podem ser canceladas');
        }

        // Cancelar via Focus NFe
        const resultado = await focusNFe.cancelarNFe(nfe.referencia, justificativa);

        // Atualizar status
        await supabase
          .from('notas_fiscais')
          .update({
            status: 'cancelado',
            status_sefaz: resultado.status_sefaz,
            mensagem_sefaz: resultado.mensagem_sefaz,
            data_cancelamento: new Date().toISOString(),
            justificativa_cancelamento: justificativa
          })
          .eq('id', nfeId);

        // Registrar log
        await supabase.from('nfe_logs').insert({
          nota_fiscal_id: nfeId,
          referencia: nfe.referencia,
          tipo: 'cancelamento',
          status: resultado.status,
          mensagem: resultado.mensagem_sefaz,
          response_data: resultado
        });

        return new Response(JSON.stringify({
          success: true,
          ...resultado
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'listar': {
        const { companyId, status, page = 1, limit = 20 } = params;
        
        let query = supabase
          .from('notas_fiscais')
          .select('*, sale:sale_id(document_number, client_id)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error, count } = await query;

        if (error) {
          throw new Error('Erro ao listar NFes');
        }

        return new Response(JSON.stringify({
          data,
          total: count,
          page,
          limit
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }
  } catch (error: any) {
    console.error('[FocusNFe] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.mensagem || error.message || 'Erro interno',
      erros: error.erros
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
