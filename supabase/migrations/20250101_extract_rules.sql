-- Tabela de Regras de Extrato para Conciliação Automática
-- Baseado na lógica da Kamino

CREATE TABLE IF NOT EXISTS extract_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Texto a ser buscado na descrição do extrato
  search_text TEXT NOT NULL,
  
  -- Categorização automática
  supplier_id UUID REFERENCES pessoas(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  
  -- Descrição personalizada para o lançamento
  description TEXT,
  
  -- Tipo de transação (entrada/saída)
  transaction_type VARCHAR(10) CHECK (transaction_type IN ('CREDIT', 'DEBIT', 'BOTH')) DEFAULT 'BOTH',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Contadores
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Índices únicos
  UNIQUE(company_id, search_text)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_extract_rules_company ON extract_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_extract_rules_active ON extract_rules(company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_extract_rules_search ON extract_rules(company_id, search_text);

-- RLS
ALTER TABLE extract_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company extract rules"
  ON extract_rules FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert extract rules for their company"
  ON extract_rules FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their company extract rules"
  ON extract_rules FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their company extract rules"
  ON extract_rules FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  ));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_extract_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_extract_rules_updated_at
  BEFORE UPDATE ON extract_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_extract_rules_updated_at();

-- Comentários
COMMENT ON TABLE extract_rules IS 'Regras de extrato para conciliação automática (estilo Kamino)';
COMMENT ON COLUMN extract_rules.search_text IS 'Texto a ser buscado na descrição do extrato bancário';
COMMENT ON COLUMN extract_rules.supplier_id IS 'Fornecedor/cliente a ser associado quando a regra casar';
COMMENT ON COLUMN extract_rules.category_id IS 'Categoria financeira a ser associada';
COMMENT ON COLUMN extract_rules.times_used IS 'Quantas vezes esta regra foi utilizada';
