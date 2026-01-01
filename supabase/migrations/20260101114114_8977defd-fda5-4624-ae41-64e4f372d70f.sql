-- Tabela de log de auditoria para conciliações
CREATE TABLE IF NOT EXISTS public.reconciliation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'reversed', 'manual_match', 'rule_match'
  reconciliation_id UUID REFERENCES public.bank_reconciliations(id) ON DELETE SET NULL,
  bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_company ON public.reconciliation_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_event_type ON public.reconciliation_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_created_at ON public.reconciliation_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliation_audit_reconciliation ON public.reconciliation_audit_log(reconciliation_id);

-- Habilitar RLS
ALTER TABLE public.reconciliation_audit_log ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Usuários acessam reconciliation_audit_log da empresa"
ON public.reconciliation_audit_log
FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));