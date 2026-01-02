-- Tabela principal de alertas da WAI Observer AI
CREATE TABLE public.ai_observer_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação do evento
  event_type TEXT NOT NULL,
  event_source_id UUID,
  event_source_type TEXT,
  
  -- Classificação
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  mode TEXT NOT NULL CHECK (mode IN ('proactive_event', 'reactive_question', 'economic_analysis')),
  
  -- Análise econômica
  economic_reason TEXT NOT NULL,
  margin_before NUMERIC(10,2),
  margin_after NUMERIC(10,2),
  margin_change_percent NUMERIC(10,2),
  potential_loss NUMERIC(12,2),
  
  -- Entidades impactadas
  impacted_entities JSONB DEFAULT '[]'::jsonb,
  
  -- Recomendação
  recommendation TEXT,
  requires_human_decision BOOLEAN DEFAULT true,
  
  -- Status do alerta
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false,
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES public.users(id),
  action_taken TEXT,
  
  -- Hash para evitar alertas duplicados
  alert_hash TEXT NOT NULL,
  
  -- Metadados
  raw_ai_response JSONB,
  context_data JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ai_observer_alerts_company ON public.ai_observer_alerts(company_id);
CREATE INDEX idx_ai_observer_alerts_severity ON public.ai_observer_alerts(severity);
CREATE INDEX idx_ai_observer_alerts_mode ON public.ai_observer_alerts(mode);
CREATE INDEX idx_ai_observer_alerts_unread ON public.ai_observer_alerts(company_id, is_read, is_dismissed) WHERE NOT is_dismissed;
CREATE UNIQUE INDEX idx_ai_observer_alerts_hash ON public.ai_observer_alerts(company_id, alert_hash) WHERE NOT is_dismissed;

-- Trigger para updated_at
CREATE TRIGGER update_ai_observer_alerts_updated_at
  BEFORE UPDATE ON public.ai_observer_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.ai_observer_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view alerts from their companies"
  ON public.ai_observer_alerts
  FOR SELECT
  USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can update alerts from their companies"
  ON public.ai_observer_alerts
  FOR UPDATE
  USING (company_id IN (SELECT get_user_companies()));

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_observer_alerts;

-- Função RPC para buscar contexto econômico completo para a IA
CREATE OR REPLACE FUNCTION public.ai_get_economic_context(
  p_company_id UUID,
  p_event_type TEXT DEFAULT NULL,
  p_event_source_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'company_id', p_company_id,
    'event_type', p_event_type,
    'event_source_id', p_event_source_id,
    'timestamp', NOW(),
    
    -- Resumo financeiro
    'financial_summary', (
      SELECT json_build_object(
        'saldo_bancario', COALESCE(SUM(current_balance), 0),
        'a_pagar_total', (SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) FROM payables WHERE company_id = p_company_id AND is_paid = false),
        'a_receber_total', (SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) FROM accounts_receivable WHERE company_id = p_company_id AND is_paid = false),
        'vencidos_pagar', (SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) FROM payables WHERE company_id = p_company_id AND is_paid = false AND due_date < CURRENT_DATE),
        'vencidos_receber', (SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) FROM accounts_receivable WHERE company_id = p_company_id AND is_paid = false AND due_date < CURRENT_DATE)
      )
      FROM bank_accounts WHERE company_id = p_company_id AND is_active = true
    ),
    
    -- OS abertas com custo real
    'open_service_orders', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', so.id,
        'order_number', so.order_number,
        'client_name', p.razao_social,
        'total_amount', so.total_amount,
        'products_cost', (
          SELECT COALESCE(SUM(spi.quantity * pr.cost_price), 0)
          FROM service_order_product_items spi
          JOIN products pr ON pr.id = spi.product_id
          WHERE spi.service_order_id = so.id
        ),
        'services_cost', (
          SELECT COALESCE(SUM(ssi.quantity * s.cost), 0)
          FROM service_order_service_items ssi
          JOIN services s ON s.id = ssi.service_id
          WHERE ssi.service_order_id = so.id
        ),
        'created_at', so.created_at
      )), '[]'::json)
      FROM service_orders so
      LEFT JOIN pessoas p ON p.id = so.client_id
      WHERE so.company_id = p_company_id
      AND so.status_id IS NOT NULL
      LIMIT 50
    ),
    
    -- Vendas pendentes
    'pending_sales', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', s.id,
        'sale_number', s.sale_number,
        'client_name', p.razao_social,
        'total_amount', s.total_amount,
        'products_cost', (
          SELECT COALESCE(SUM(spi.quantity * pr.cost_price), 0)
          FROM sale_product_items spi
          JOIN products pr ON pr.id = spi.product_id
          WHERE spi.sale_id = s.id
        ),
        'created_at', s.created_at
      )), '[]'::json)
      FROM sales s
      LEFT JOIN pessoas p ON p.id = s.cliente_id
      WHERE s.company_id = p_company_id
      AND s.status IN ('draft', 'approved', 'pending')
      LIMIT 50
    ),
    
    -- Compras recentes com impacto de custo
    'recent_purchases', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', po.id,
        'order_number', po.order_number,
        'supplier_name', p.razao_social,
        'total_amount', po.total_amount,
        'items', (
          SELECT json_agg(json_build_object(
            'product_id', poi.product_id,
            'product_name', pr.name,
            'quantity', poi.quantity,
            'unit_price', poi.unit_price,
            'old_cost', pr.cost_price
          ))
          FROM purchase_order_items poi
          JOIN products pr ON pr.id = poi.product_id
          WHERE poi.purchase_order_id = po.id
        ),
        'created_at', po.created_at
      )), '[]'::json)
      FROM purchase_orders po
      LEFT JOIN pessoas p ON p.id = po.supplier_id
      WHERE po.company_id = p_company_id
      AND po.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY po.created_at DESC
      LIMIT 20
    ),
    
    -- Produtos críticos (estoque baixo ou alto custo)
    'critical_products', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', p.id,
        'name', p.name,
        'code', p.code,
        'current_stock', p.current_stock,
        'minimum_stock', p.minimum_stock,
        'cost_price', p.cost_price,
        'sale_price', p.sale_price,
        'margin_percent', CASE WHEN p.sale_price > 0 THEN ((p.sale_price - COALESCE(p.cost_price, 0)) / p.sale_price * 100) ELSE 0 END
      )), '[]'::json)
      FROM products p
      WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND (
        p.current_stock <= COALESCE(p.minimum_stock, 0)
        OR (p.sale_price > 0 AND ((p.sale_price - COALESCE(p.cost_price, 0)) / p.sale_price * 100) < 15)
      )
      LIMIT 30
    ),
    
    -- Configurações de margem mínima
    'settings', (
      SELECT json_build_object(
        'min_margin_threshold', COALESCE(min_margin_threshold, 15),
        'max_purchase_excess_percent', COALESCE(max_purchase_excess_percent, 20),
        'stock_alert_days_coverage', COALESCE(stock_alert_days_coverage, 30)
      )
      FROM ai_settings
      WHERE company_id = p_company_id
      LIMIT 1
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Função para verificar alerta duplicado
CREATE OR REPLACE FUNCTION public.ai_check_duplicate_alert(
  p_company_id UUID,
  p_alert_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ai_observer_alerts
    WHERE company_id = p_company_id
    AND alert_hash = p_alert_hash
    AND NOT is_dismissed
    AND created_at >= NOW() - INTERVAL '24 hours'
  );
$$;