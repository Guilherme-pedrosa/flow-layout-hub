-- Tabela para alertas de impacto na margem
CREATE TABLE public.margin_impact_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  product_id UUID REFERENCES public.products(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  reference_type TEXT NOT NULL, -- 'sale', 'service_order'
  reference_id UUID NOT NULL,
  reference_number TEXT, -- Número da venda/OS
  old_margin_percent NUMERIC,
  new_margin_percent NUMERIC,
  old_cost NUMERIC,
  new_cost NUMERIC,
  sale_price NUMERIC,
  quantity NUMERIC,
  potential_loss NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'adjusted'
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.margin_impact_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Usuários acessam margin_impact_alerts da empresa"
ON public.margin_impact_alerts
FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Tabela para alertas do CFO vigilante
CREATE TABLE public.cfo_vigilant_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  alert_type TEXT NOT NULL, -- 'profitability', 'cost_increase', 'efficiency'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  context_data JSONB,
  reference_type TEXT, -- 'sale', 'service_order', 'payable', etc.
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID REFERENCES public.users(id),
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cfo_vigilant_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Usuários acessam cfo_vigilant_alerts da empresa"
ON public.cfo_vigilant_alerts
FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Índices para performance
CREATE INDEX idx_margin_impact_alerts_company ON public.margin_impact_alerts(company_id);
CREATE INDEX idx_margin_impact_alerts_status ON public.margin_impact_alerts(status);
CREATE INDEX idx_margin_impact_alerts_product ON public.margin_impact_alerts(product_id);

CREATE INDEX idx_cfo_vigilant_alerts_company ON public.cfo_vigilant_alerts(company_id);
CREATE INDEX idx_cfo_vigilant_alerts_type ON public.cfo_vigilant_alerts(alert_type);
CREATE INDEX idx_cfo_vigilant_alerts_created ON public.cfo_vigilant_alerts(created_at DESC);

-- Trigger para updated_at na margin_impact_alerts
CREATE TRIGGER update_margin_impact_alerts_updated_at
BEFORE UPDATE ON public.margin_impact_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();