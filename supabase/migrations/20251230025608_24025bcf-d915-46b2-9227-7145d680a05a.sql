-- Tabela para armazenar sugestões de conciliação
CREATE TABLE IF NOT EXISTS reconciliation_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  payable_id UUID REFERENCES payables(id),
  
  -- Dados do extrato bancário
  extrato_data DATE,
  extrato_valor DECIMAL(10,2),
  extrato_descricao TEXT,
  extrato_cpf_cnpj VARCHAR(14),
  extrato_nome VARCHAR(255),
  extrato_chave_pix VARCHAR(255),
  
  -- Score de confiança (0-100)
  confidence_score INTEGER,
  match_reason TEXT,
  
  -- Status: pending, approved, rejected
  status VARCHAR(20) DEFAULT 'pending',
  
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_reconciliation_company ON reconciliation_suggestions(company_id);
CREATE INDEX idx_reconciliation_status ON reconciliation_suggestions(status);
CREATE INDEX idx_reconciliation_payable ON reconciliation_suggestions(payable_id);

-- Habilitar RLS
ALTER TABLE reconciliation_suggestions ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (para o sistema)
CREATE POLICY "Allow read reconciliation_suggestions"
ON reconciliation_suggestions FOR SELECT
USING (true);

-- Política para permitir inserção/atualização
CREATE POLICY "Allow insert reconciliation_suggestions"
ON reconciliation_suggestions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update reconciliation_suggestions"
ON reconciliation_suggestions FOR UPDATE
USING (true);

-- Adicionar coluna reconciliation_source em payables se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payables' AND column_name = 'reconciliation_source'
  ) THEN
    ALTER TABLE payables ADD COLUMN reconciliation_source VARCHAR(20);
  END IF;
END $$;