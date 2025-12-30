-- Tabela para armazenar insights gerados pela IA
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('financial', 'stock', 'sales', 'fiscal', 'audit', 'opportunity')),
  mode TEXT NOT NULL CHECK (mode IN ('auditora', 'cfo_bot', 'especialista', 'executora')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT,
  action_url TEXT,
  action_data JSONB,
  context TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_by UUID REFERENCES public.users(id),
  dismissed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ai_insights_company_id ON public.ai_insights(company_id);
CREATE INDEX idx_ai_insights_is_read ON public.ai_insights(is_read);
CREATE INDEX idx_ai_insights_is_dismissed ON public.ai_insights(is_dismissed);
CREATE INDEX idx_ai_insights_category ON public.ai_insights(category);
CREATE INDEX idx_ai_insights_created_at ON public.ai_insights(created_at DESC);

-- RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights from their companies"
ON public.ai_insights
FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can update insights from their companies"
ON public.ai_insights
FOR UPDATE
USING (company_id IN (SELECT get_user_companies()));

-- Trigger para updated_at
CREATE TRIGGER update_ai_insights_updated_at
BEFORE UPDATE ON public.ai_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para configurações de IA por empresa
CREATE TABLE public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Modos de IA habilitados
  auditora_enabled BOOLEAN NOT NULL DEFAULT true,
  cfo_bot_enabled BOOLEAN NOT NULL DEFAULT true,
  especialista_enabled BOOLEAN NOT NULL DEFAULT true,
  executora_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Configurações de auditoria
  min_margin_threshold NUMERIC(5,2) DEFAULT 15.00,
  max_purchase_excess_percent NUMERIC(5,2) DEFAULT 20.00,
  -- Configurações de CFO
  cash_flow_alert_days INTEGER DEFAULT 7,
  cash_flow_critical_days INTEGER DEFAULT 3,
  -- Configurações de estoque
  stock_alert_days_coverage INTEGER DEFAULT 30,
  -- Notificações
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para ai_settings
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settings from their companies"
ON public.ai_settings
FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can update settings from their companies"
ON public.ai_settings
FOR UPDATE
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert settings for their companies"
ON public.ai_settings
FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Trigger para updated_at
CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para regras de conciliação automática
CREATE TABLE public.ai_reconciliation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description_pattern TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'contains', 'regex')),
  category TEXT,
  supplier_id UUID REFERENCES public.pessoas(id),
  chart_account_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para ai_reconciliation_rules
ALTER TABLE public.ai_reconciliation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rules from their companies"
ON public.ai_reconciliation_rules
FOR ALL
USING (company_id IN (SELECT get_user_companies()));

-- Trigger para updated_at
CREATE TRIGGER update_ai_reconciliation_rules_updated_at
BEFORE UPDATE ON public.ai_reconciliation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();