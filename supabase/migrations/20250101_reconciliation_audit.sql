-- =====================================================
-- CONCILIADOR BANCÁRIO MAX - Tabelas de Auditoria
-- =====================================================

-- Tabela principal de conciliações
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_transaction_id UUID NOT NULL REFERENCES bank_transactions(id) ON DELETE CASCADE,
  
  -- Valores
  total_reconciled_amount DECIMAL(15,2) NOT NULL,
  difference DECIMAL(15,2) DEFAULT 0,
  
  -- Metadados
  method VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, suggested, auto_rule
  confidence_score INTEGER, -- 0-100
  match_type VARCHAR(50), -- exact_1_1, aggregation_1_n, split_n_1, rule, nosso_numero
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, reversed
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  reverse_reason TEXT,
  
  UNIQUE(bank_transaction_id)
);

-- Itens da conciliação (títulos vinculados)
CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  
  -- Título financeiro
  financial_id UUID NOT NULL,
  financial_type VARCHAR(20) NOT NULL, -- receivable, payable
  
  -- Valores
  amount_used DECIMAL(15,2) NOT NULL, -- valor usado deste título na conciliação
  original_amount DECIMAL(15,2) NOT NULL, -- valor original do título
  
  -- Metadados
  entity_name VARCHAR(255),
  due_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de auditoria (imutável)
CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Evento
  event_type VARCHAR(50) NOT NULL, -- created, reversed, modified
  reconciliation_id UUID REFERENCES bank_reconciliations(id),
  bank_transaction_id UUID,
  
  -- Dados do evento
  event_data JSONB NOT NULL, -- snapshot completo do estado
  
  -- Auditoria
  user_id UUID REFERENCES auth.users(id),
  user_email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações de conciliação por empresa
CREATE TABLE IF NOT EXISTS reconciliation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Tolerâncias
  date_tolerance_days INTEGER DEFAULT 5, -- janela de tolerância de data
  value_tolerance_percent DECIMAL(5,2) DEFAULT 0, -- tolerância de valor (0 = exato)
  
  -- Comportamento
  auto_confirm_high_confidence BOOLEAN DEFAULT false, -- confirmar automaticamente alta confiança
  high_confidence_threshold INTEGER DEFAULT 95, -- threshold para alta confiança
  
  -- Regras
  allow_partial_reconciliation BOOLEAN DEFAULT true, -- permitir conciliação parcial
  require_zero_difference BOOLEAN DEFAULT true, -- exigir diferença zero
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reconciliations_company ON bank_reconciliations(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_transaction ON bank_reconciliations(bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_status ON bank_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_reconciliation ON bank_reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_items_financial ON bank_reconciliation_items(financial_id, financial_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON reconciliation_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_reconciliation ON reconciliation_audit_log(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON reconciliation_audit_log(created_at);

-- RLS Policies
ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_settings ENABLE ROW LEVEL SECURITY;

-- Policies para bank_reconciliations
CREATE POLICY "Users can view reconciliations of their company"
  ON bank_reconciliations FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert reconciliations for their company"
  ON bank_reconciliations FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update reconciliations of their company"
  ON bank_reconciliations FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

-- Policies para bank_reconciliation_items
CREATE POLICY "Users can view reconciliation items"
  ON bank_reconciliation_items FOR SELECT
  USING (reconciliation_id IN (
    SELECT id FROM bank_reconciliations WHERE company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert reconciliation items"
  ON bank_reconciliation_items FOR INSERT
  WITH CHECK (reconciliation_id IN (
    SELECT id FROM bank_reconciliations WHERE company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  ));

-- Policies para reconciliation_audit_log (somente leitura para usuários)
CREATE POLICY "Users can view audit logs of their company"
  ON reconciliation_audit_log FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

-- Policies para reconciliation_settings
CREATE POLICY "Users can view settings of their company"
  ON reconciliation_settings FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage settings of their company"
  ON reconciliation_settings FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

-- Função para criar log de auditoria automaticamente
CREATE OR REPLACE FUNCTION log_reconciliation_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reconciliation_audit_log (
      company_id,
      event_type,
      reconciliation_id,
      bank_transaction_id,
      event_data,
      user_id
    ) VALUES (
      NEW.company_id,
      'created',
      NEW.id,
      NEW.bank_transaction_id,
      to_jsonb(NEW),
      NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'reversed' THEN
      INSERT INTO reconciliation_audit_log (
        company_id,
        event_type,
        reconciliation_id,
        bank_transaction_id,
        event_data,
        user_id
      ) VALUES (
        NEW.company_id,
        'reversed',
        NEW.id,
        NEW.bank_transaction_id,
        jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
        NEW.reversed_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para log automático
DROP TRIGGER IF EXISTS trigger_log_reconciliation ON bank_reconciliations;
CREATE TRIGGER trigger_log_reconciliation
  AFTER INSERT OR UPDATE ON bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION log_reconciliation_event();

-- Função para estornar conciliação
CREATE OR REPLACE FUNCTION reverse_reconciliation(
  p_reconciliation_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reconciliation RECORD;
  v_item RECORD;
BEGIN
  -- Buscar conciliação
  SELECT * INTO v_reconciliation 
  FROM bank_reconciliations 
  WHERE id = p_reconciliation_id AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conciliação não encontrada ou já estornada';
  END IF;
  
  -- Marcar conciliação como estornada
  UPDATE bank_reconciliations SET
    status = 'reversed',
    reversed_at = NOW(),
    reversed_by = p_user_id,
    reverse_reason = p_reason
  WHERE id = p_reconciliation_id;
  
  -- Desmarcar transação bancária
  UPDATE bank_transactions SET
    is_reconciled = false,
    reconciled_at = NULL
  WHERE id = v_reconciliation.bank_transaction_id;
  
  -- Desmarcar títulos financeiros
  FOR v_item IN SELECT * FROM bank_reconciliation_items WHERE reconciliation_id = p_reconciliation_id
  LOOP
    IF v_item.financial_type = 'receivable' THEN
      UPDATE accounts_receivable SET
        is_paid = false,
        paid_at = NULL,
        reconciliation_id = NULL
      WHERE id = v_item.financial_id;
    ELSE
      UPDATE payables SET
        is_paid = false,
        paid_at = NULL,
        reconciliation_id = NULL
      WHERE id = v_item.financial_id;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
