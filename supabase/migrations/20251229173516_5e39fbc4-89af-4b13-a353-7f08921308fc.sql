-- Criar ENUM para status de pagamento
CREATE TYPE payment_status AS ENUM (
  'open',
  'ready_to_pay',
  'submitted_for_approval',
  'approved',
  'sent_to_bank',
  'paid',
  'failed',
  'cancelled'
);

-- Criar ENUM para método de pagamento
CREATE TYPE payment_method_type AS ENUM (
  'boleto',
  'pix',
  'transferencia',
  'outro'
);

-- Adicionar novos campos na tabela payables
ALTER TABLE payables
  ADD COLUMN IF NOT EXISTS payment_method_type payment_method_type DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS boleto_barcode text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pix_key text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pix_key_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scheduled_payment_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS inter_payment_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_transaction_id uuid REFERENCES bank_transactions(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recipient_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recipient_document text DEFAULT NULL;

-- Criar tabela de log de pagamentos para auditoria
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id uuid REFERENCES payables(id) NOT NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  user_id uuid REFERENCES users(id),
  user_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política de acesso para logs
CREATE POLICY "Acesso público para payment_audit_logs" 
ON payment_audit_logs FOR ALL 
USING (true) 
WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payables_payment_status ON payables(payment_status);
CREATE INDEX IF NOT EXISTS idx_payables_scheduled_payment_date ON payables(scheduled_payment_date);
CREATE INDEX IF NOT EXISTS idx_payables_payment_method_type ON payables(payment_method_type);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_payable_id ON payment_audit_logs(payable_id);