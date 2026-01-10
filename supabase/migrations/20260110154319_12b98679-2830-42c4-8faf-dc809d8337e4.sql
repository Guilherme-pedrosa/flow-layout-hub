-- Tabela de configuração de custos por empresa/unidade
CREATE TABLE public.config_custos_unidade (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.client_units(id) ON DELETE SET NULL,
  
  -- Custos fixos
  custo_fixo_mensal_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  base_horas_produtivas_empresa_mes NUMERIC(8,2) NOT NULL DEFAULT 176,
  metodo_rateio TEXT NOT NULL DEFAULT 'por_hora' CHECK (metodo_rateio IN ('por_hora', 'por_os', 'hibrido')),
  peso_hora NUMERIC(5,2) DEFAULT 0.7,
  peso_os NUMERIC(5,2) DEFAULT 0.3,
  
  -- Custos de mão de obra
  salario_medio_tecnico_mensal NUMERIC(14,2),
  custo_hora_tecnica_direto NUMERIC(10,2),
  encargos_percent NUMERIC(5,2) NOT NULL DEFAULT 80,
  aproveitamento_percent NUMERIC(5,2) NOT NULL DEFAULT 75,
  horas_mes_base NUMERIC(6,2) NOT NULL DEFAULT 220,
  
  -- Custos de deslocamento
  custo_por_km NUMERIC(6,2) NOT NULL DEFAULT 1.50,
  custo_hora_deslocamento NUMERIC(10,2),
  
  -- Custos financeiros
  taxa_capital_mensal_percent NUMERIC(5,2) NOT NULL DEFAULT 2,
  iof_percent NUMERIC(5,4) NOT NULL DEFAULT 0.38,
  prazo_recebimento_dias_padrao INTEGER NOT NULL DEFAULT 30,
  
  -- Impostos
  aliquota_imposto_padrao_percent NUMERIC(5,2) NOT NULL DEFAULT 15,
  
  -- Alertas
  margem_minima_alerta_percent NUMERIC(5,2) NOT NULL DEFAULT 15,
  deslocamento_max_percent_receita NUMERIC(5,2) NOT NULL DEFAULT 20,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, unit_id)
);

-- Tabela de custos por OS
CREATE TABLE public.os_custos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Campos editáveis
  horas_tecnicas NUMERIC(8,2) NOT NULL DEFAULT 0,
  km_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  tempo_deslocamento_horas NUMERIC(8,2) NOT NULL DEFAULT 0,
  custo_pecas NUMERIC(14,2) NOT NULL DEFAULT 0,
  custo_pecas_override BOOLEAN NOT NULL DEFAULT false,
  custo_pecas_motivo TEXT,
  servicos_externos NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  -- Despesas de viagem
  pedagio NUMERIC(10,2) NOT NULL DEFAULT 0,
  estacionamento NUMERIC(10,2) NOT NULL DEFAULT 0,
  diaria NUMERIC(10,2) NOT NULL DEFAULT 0,
  refeicao NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  desconto_concedido NUMERIC(14,2) NOT NULL DEFAULT 0,
  aliquota_imposto_override NUMERIC(5,2),
  aliquota_imposto_motivo TEXT,
  prazo_recebimento_dias INTEGER,
  
  -- Campos calculados (armazenados para histórico)
  custo_hora_tecnica_usado NUMERIC(10,2),
  custo_mao_obra_direta NUMERIC(14,2),
  custo_deslocamento NUMERIC(14,2),
  custo_fixo_alocado NUMERIC(14,2),
  impostos_estimados NUMERIC(14,2),
  custo_financeiro_recebimento NUMERIC(14,2),
  custo_total_real NUMERIC(14,2),
  
  receita_bruta NUMERIC(14,2),
  receita_liquida NUMERIC(14,2),
  lucro_real NUMERIC(14,2),
  margem_real_percent NUMERIC(6,2),
  
  -- Metadata de cálculo
  config_snapshot JSONB,
  calculado_em TIMESTAMPTZ,
  calculado_por UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(service_order_id)
);

-- Tabela de auditoria para overrides
CREATE TABLE public.audit_log_os_custos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_custo_id UUID NOT NULL REFERENCES public.os_custos(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  motivo TEXT NOT NULL,
  
  alterado_por UUID REFERENCES auth.users(id),
  alterado_por_nome TEXT,
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_custos_unidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log_os_custos ENABLE ROW LEVEL SECURITY;

-- Policies for config_custos_unidade
CREATE POLICY "Users can view their company cost config"
ON public.config_custos_unidade FOR SELECT
USING (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

CREATE POLICY "Users can insert cost config for their companies"
ON public.config_custos_unidade FOR INSERT
WITH CHECK (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

CREATE POLICY "Users can update their company cost config"
ON public.config_custos_unidade FOR UPDATE
USING (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

-- Policies for os_custos
CREATE POLICY "Users can view their company OS costs"
ON public.os_custos FOR SELECT
USING (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

CREATE POLICY "Users can insert OS costs for their companies"
ON public.os_custos FOR INSERT
WITH CHECK (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

CREATE POLICY "Users can update their company OS costs"
ON public.os_custos FOR UPDATE
USING (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

CREATE POLICY "Users can delete their company OS costs"
ON public.os_custos FOR DELETE
USING (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

-- Policies for audit_log_os_custos
CREATE POLICY "Users can view their company audit logs"
ON public.audit_log_os_custos FOR SELECT
USING (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

CREATE POLICY "Users can insert audit logs for their companies"
ON public.audit_log_os_custos FOR INSERT
WITH CHECK (company_id IN (
  SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_config_custos_company ON public.config_custos_unidade(company_id);
CREATE INDEX idx_os_custos_service_order ON public.os_custos(service_order_id);
CREATE INDEX idx_os_custos_company ON public.os_custos(company_id);
CREATE INDEX idx_audit_os_custos_order ON public.audit_log_os_custos(service_order_id);

-- Trigger para updated_at
CREATE TRIGGER update_config_custos_unidade_updated_at
BEFORE UPDATE ON public.config_custos_unidade
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_os_custos_updated_at
BEFORE UPDATE ON public.os_custos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();