import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface ConfigCustosUnidade {
  id: string;
  company_id: string;
  unit_id: string | null;
  custo_fixo_mensal_total: number;
  base_horas_produtivas_empresa_mes: number;
  metodo_rateio: 'por_hora' | 'por_os' | 'hibrido';
  peso_hora: number;
  peso_os: number;
  salario_medio_tecnico_mensal: number | null;
  custo_hora_tecnica_direto: number | null;
  encargos_percent: number;
  aproveitamento_percent: number;
  horas_mes_base: number;
  custo_por_km: number;
  custo_hora_deslocamento: number | null;
  taxa_capital_mensal_percent: number;
  iof_percent: number;
  prazo_recebimento_dias_padrao: number;
  aliquota_imposto_padrao_percent: number;
  margem_minima_alerta_percent: number;
  deslocamento_max_percent_receita: number;
  is_active: boolean;
}

export interface OsCusto {
  id: string;
  service_order_id: string;
  company_id: string;
  horas_tecnicas: number;
  km_total: number;
  tempo_deslocamento_horas: number;
  custo_pecas: number;
  custo_pecas_override: boolean;
  custo_pecas_motivo: string | null;
  servicos_externos: number;
  pedagio: number;
  estacionamento: number;
  diaria: number;
  refeicao: number;
  desconto_concedido: number;
  aliquota_imposto_override: number | null;
  aliquota_imposto_motivo: string | null;
  prazo_recebimento_dias: number | null;
  // Campos calculados
  custo_hora_tecnica_usado: number | null;
  custo_mao_obra_direta: number | null;
  custo_deslocamento: number | null;
  custo_fixo_alocado: number | null;
  impostos_estimados: number | null;
  custo_financeiro_recebimento: number | null;
  custo_total_real: number | null;
  receita_bruta: number | null;
  receita_liquida: number | null;
  lucro_real: number | null;
  margem_real_percent: number | null;
  config_snapshot: any;
  calculado_em: string | null;
}

export interface CustosCalculados {
  custo_hora_tecnica: number;
  custo_mao_obra_direta: number;
  custo_deslocamento: number;
  custo_fixo_por_hora: number;
  custo_fixo_alocado: number;
  custos_diretos_total: number;
  impostos_estimados: number;
  custo_financeiro_recebimento: number;
  custo_total_real: number;
  receita_bruta: number;
  receita_liquida: number;
  lucro_real: number;
  margem_real_percent: number;
  detalhamento: {
    despesas_viagem: number;
    custo_pecas: number;
    servicos_externos: number;
  };
}

export interface AlertaCusto {
  tipo: 'error' | 'warning' | 'info';
  mensagem: string;
  campo?: string;
}

// Função para calcular custo hora técnica
function calcularCustoHoraTecnica(config: ConfigCustosUnidade): number {
  if (config.custo_hora_tecnica_direto) {
    return config.custo_hora_tecnica_direto;
  }
  if (config.salario_medio_tecnico_mensal && config.horas_mes_base > 0 && config.aproveitamento_percent > 0) {
    const salarioComEncargos = config.salario_medio_tecnico_mensal * (1 + config.encargos_percent / 100);
    const horasAproveitadas = config.horas_mes_base * (config.aproveitamento_percent / 100);
    return salarioComEncargos / horasAproveitadas;
  }
  return 0;
}

// Função para calcular todos os custos
export function calcularCustos(
  dados: Partial<OsCusto>,
  config: ConfigCustosUnidade,
  receitaBruta: number
): CustosCalculados {
  // Custo hora técnica
  const custoHoraTecnica = calcularCustoHoraTecnica(config);
  
  // Custo mão de obra direta
  const custoMaoObraDireta = (dados.horas_tecnicas || 0) * custoHoraTecnica;
  
  // Despesas de viagem
  const despesasViagem = (dados.pedagio || 0) + (dados.estacionamento || 0) + (dados.diaria || 0) + (dados.refeicao || 0);
  
  // Custo hora deslocamento (usa mesmo custo de técnico se não especificado)
  const custoHoraDeslocamento = config.custo_hora_deslocamento || custoHoraTecnica;
  
  // Custo deslocamento
  const custoDeslocamento = 
    ((dados.km_total || 0) * config.custo_por_km) + 
    ((dados.tempo_deslocamento_horas || 0) * custoHoraDeslocamento) + 
    despesasViagem;
  
  // Custo fixo por hora e alocado
  const custoFixoPorHora = config.base_horas_produtivas_empresa_mes > 0 
    ? config.custo_fixo_mensal_total / config.base_horas_produtivas_empresa_mes 
    : 0;
  
  let custoFixoAlocado = 0;
  if (config.metodo_rateio === 'por_hora') {
    custoFixoAlocado = (dados.horas_tecnicas || 0) * custoFixoPorHora;
  } else if (config.metodo_rateio === 'por_os') {
    // Distribui por OS (assume 1 OS = proporção do custo fixo baseado em OS médias por mês)
    custoFixoAlocado = custoFixoPorHora * 4; // Assume 4h média por OS
  } else {
    // Híbrido
    const pesoHora = config.peso_hora || 0.7;
    const pesoOs = config.peso_os || 0.3;
    custoFixoAlocado = 
      ((dados.horas_tecnicas || 0) * custoFixoPorHora * pesoHora) + 
      (custoFixoPorHora * 4 * pesoOs);
  }
  
  // Custos diretos total
  const custoDiretoTotal = custoMaoObraDireta + custoDeslocamento + (dados.custo_pecas || 0) + (dados.servicos_externos || 0);
  
  // Receita líquida (após desconto)
  const desconto = dados.desconto_concedido || 0;
  const receitaLiquida = receitaBruta - desconto;
  
  // Impostos
  const aliquotaImposto = dados.aliquota_imposto_override ?? config.aliquota_imposto_padrao_percent;
  const impostosEstimados = receitaLiquida * (aliquotaImposto / 100);
  
  // Custo financeiro de recebimento
  const prazoRecebimento = dados.prazo_recebimento_dias ?? config.prazo_recebimento_dias_padrao;
  const custoFinanceiro = 
    (receitaLiquida * (config.taxa_capital_mensal_percent / 100) * (prazoRecebimento / 30)) + 
    (receitaLiquida * (config.iof_percent / 100));
  
  // Custo total real
  const custoTotalReal = custoDiretoTotal + custoFixoAlocado + impostosEstimados + custoFinanceiro;
  
  // Lucro e margem
  const lucroReal = receitaLiquida - custoTotalReal;
  const margemRealPercent = receitaLiquida > 0 ? (lucroReal / receitaLiquida) * 100 : 0;
  
  return {
    custo_hora_tecnica: custoHoraTecnica,
    custo_mao_obra_direta: custoMaoObraDireta,
    custo_deslocamento: custoDeslocamento,
    custo_fixo_por_hora: custoFixoPorHora,
    custo_fixo_alocado: custoFixoAlocado,
    custos_diretos_total: custoDiretoTotal,
    impostos_estimados: impostosEstimados,
    custo_financeiro_recebimento: custoFinanceiro,
    custo_total_real: custoTotalReal,
    receita_bruta: receitaBruta,
    receita_liquida: receitaLiquida,
    lucro_real: lucroReal,
    margem_real_percent: margemRealPercent,
    detalhamento: {
      despesas_viagem: despesasViagem,
      custo_pecas: dados.custo_pecas || 0,
      servicos_externos: dados.servicos_externos || 0,
    }
  };
}

// Função para gerar alertas
export function gerarAlertas(
  custos: CustosCalculados,
  config: ConfigCustosUnidade
): AlertaCusto[] {
  const alertas: AlertaCusto[] = [];
  
  // Config inválida
  if (config.base_horas_produtivas_empresa_mes <= 0) {
    alertas.push({
      tipo: 'error',
      mensagem: 'Configuração inválida: Base de horas produtivas deve ser maior que zero',
      campo: 'base_horas_produtivas_empresa_mes'
    });
  }
  
  // Margem negativa
  if (custos.margem_real_percent < 0) {
    alertas.push({
      tipo: 'error',
      mensagem: `Margem negativa: ${custos.margem_real_percent.toFixed(1)}%. Esta OS está gerando prejuízo.`
    });
  } else if (custos.margem_real_percent < config.margem_minima_alerta_percent) {
    // Margem abaixo do mínimo
    alertas.push({
      tipo: 'warning',
      mensagem: `Margem abaixo do mínimo: ${custos.margem_real_percent.toFixed(1)}% (mínimo: ${config.margem_minima_alerta_percent}%)`
    });
  }
  
  // Deslocamento acima do limite
  if (custos.receita_liquida > 0) {
    const percentDeslocamento = (custos.custo_deslocamento / custos.receita_liquida) * 100;
    if (percentDeslocamento > config.deslocamento_max_percent_receita) {
      alertas.push({
        tipo: 'warning',
        mensagem: `Custo de deslocamento alto: ${percentDeslocamento.toFixed(1)}% da receita (máximo: ${config.deslocamento_max_percent_receita}%)`
      });
    }
  }
  
  // Custo hora técnica zero
  if (custos.custo_hora_tecnica <= 0) {
    alertas.push({
      tipo: 'warning',
      mensagem: 'Custo/hora técnica não configurado. Configure o salário médio ou custo/hora direto.'
    });
  }
  
  return alertas;
}

export function useOsCustos(serviceOrderId?: string) {
  const { toast } = useToast();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  // Buscar configuração de custos da empresa
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['config-custos', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('config_custos_unidade')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .is('unit_id', null)
        .maybeSingle();
      
      if (error) throw error;
      return data as ConfigCustosUnidade | null;
    },
    enabled: !!currentCompany?.id,
  });

  // Buscar custos da OS específica
  const { data: osCusto, isLoading: isLoadingOsCusto } = useQuery({
    queryKey: ['os-custo', serviceOrderId],
    queryFn: async () => {
      if (!serviceOrderId) return null;
      
      const { data, error } = await supabase
        .from('os_custos')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .maybeSingle();
      
      if (error) throw error;
      return data as OsCusto | null;
    },
    enabled: !!serviceOrderId,
  });

  // Salvar ou criar configuração
  const saveConfig = useMutation({
    mutationFn: async (configData: Partial<ConfigCustosUnidade>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const dataToSave = {
        ...configData,
        company_id: currentCompany.id,
      };
      
      if (config?.id) {
        const { data, error } = await supabase
          .from('config_custos_unidade')
          .update(dataToSave)
          .eq('id', config.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('config_custos_unidade')
          .insert(dataToSave)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-custos'] });
      toast({ title: 'Configuração salva com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar configuração', description: error.message, variant: 'destructive' });
    }
  });

  // Salvar custos da OS
  const saveOsCusto = useMutation({
    mutationFn: async (custoData: Partial<OsCusto> & { receitaBruta: number }) => {
      if (!currentCompany?.id || !serviceOrderId) throw new Error('Dados incompletos');
      if (!config) throw new Error('Configuração de custos não encontrada');
      
      const { receitaBruta, ...dadosCusto } = custoData;
      
      // Calcular custos
      const custosCalculados = calcularCustos(dadosCusto, config, receitaBruta);
      
      const dataToSave = {
        ...dadosCusto,
        service_order_id: serviceOrderId,
        company_id: currentCompany.id,
        custo_hora_tecnica_usado: custosCalculados.custo_hora_tecnica,
        custo_mao_obra_direta: custosCalculados.custo_mao_obra_direta,
        custo_deslocamento: custosCalculados.custo_deslocamento,
        custo_fixo_alocado: custosCalculados.custo_fixo_alocado,
        impostos_estimados: custosCalculados.impostos_estimados,
        custo_financeiro_recebimento: custosCalculados.custo_financeiro_recebimento,
        custo_total_real: custosCalculados.custo_total_real,
        receita_bruta: receitaBruta,
        receita_liquida: custosCalculados.receita_liquida,
        lucro_real: custosCalculados.lucro_real,
        margem_real_percent: custosCalculados.margem_real_percent,
        config_snapshot: JSON.parse(JSON.stringify(config)),
        calculado_em: new Date().toISOString(),
      };
      
      if (osCusto?.id) {
        const { data, error } = await supabase
          .from('os_custos')
          .update(dataToSave as any)
          .eq('id', osCusto.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('os_custos')
          .insert(dataToSave as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-custo', serviceOrderId] });
      toast({ title: 'Custos salvos com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar custos', description: error.message, variant: 'destructive' });
    }
  });

  // Registrar override no audit log
  const registrarOverride = useMutation({
    mutationFn: async (data: {
      osCustoId: string;
      campo: string;
      valorAnterior: string;
      valorNovo: string;
      motivo: string;
    }) => {
      if (!currentCompany?.id || !serviceOrderId) throw new Error('Dados incompletos');
      
      const { error } = await supabase
        .from('audit_log_os_custos')
        .insert({
          os_custo_id: data.osCustoId,
          service_order_id: serviceOrderId,
          company_id: currentCompany.id,
          campo_alterado: data.campo,
          valor_anterior: data.valorAnterior,
          valor_novo: data.valorNovo,
          motivo: data.motivo,
        });
      
      if (error) throw error;
    },
  });

  // Configuração padrão
  const configPadrao: ConfigCustosUnidade = {
    id: '',
    company_id: currentCompany?.id || '',
    unit_id: null,
    custo_fixo_mensal_total: 50000,
    base_horas_produtivas_empresa_mes: 176,
    metodo_rateio: 'por_hora',
    peso_hora: 0.7,
    peso_os: 0.3,
    salario_medio_tecnico_mensal: 3500,
    custo_hora_tecnica_direto: null,
    encargos_percent: 80,
    aproveitamento_percent: 75,
    horas_mes_base: 220,
    custo_por_km: 1.50,
    custo_hora_deslocamento: null,
    taxa_capital_mensal_percent: 2,
    iof_percent: 0.38,
    prazo_recebimento_dias_padrao: 30,
    aliquota_imposto_padrao_percent: 15,
    margem_minima_alerta_percent: 15,
    deslocamento_max_percent_receita: 20,
    is_active: true,
  };

  return {
    config: config || configPadrao,
    osCusto,
    isLoading: isLoadingConfig || isLoadingOsCusto,
    hasConfig: !!config,
    saveConfig,
    saveOsCusto,
    registrarOverride,
    calcularCustos,
    gerarAlertas,
  };
}
