-- Tabela de conciliações bancárias (cabeçalho)
CREATE TABLE public.bank_reconciliations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  bank_transaction_id UUID NOT NULL REFERENCES public.bank_transactions(id),
  total_reconciled_amount NUMERIC NOT NULL,
  reconciled_by UUID REFERENCES public.users(id),
  reconciled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  method TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'suggested'
  notes TEXT,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  reversed_at TIMESTAMP WITH TIME ZONE,
  reversed_by UUID REFERENCES public.users(id),
  reversal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens da conciliação (vínculos com financeiro)
CREATE TABLE public.bank_reconciliation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID NOT NULL REFERENCES public.bank_reconciliations(id) ON DELETE CASCADE,
  financial_id UUID NOT NULL,
  financial_type TEXT NOT NULL, -- 'receivable' | 'payable'
  amount_used NUMERIC NOT NULL, -- valor utilizado (para suportar parcial no futuro)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliation_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Acesso público para bank_reconciliations"
ON public.bank_reconciliations FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Acesso público para bank_reconciliation_items"
ON public.bank_reconciliation_items FOR ALL
USING (true)
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_bank_reconciliations_company ON public.bank_reconciliations(company_id);
CREATE INDEX idx_bank_reconciliations_transaction ON public.bank_reconciliations(bank_transaction_id);
CREATE INDEX idx_bank_reconciliation_items_reconciliation ON public.bank_reconciliation_items(reconciliation_id);
CREATE INDEX idx_bank_reconciliation_items_financial ON public.bank_reconciliation_items(financial_id, financial_type);

-- Adicionar coluna reconciled_via na accounts_receivable se não existir
ALTER TABLE public.accounts_receivable 
ADD COLUMN IF NOT EXISTS reconciliation_id UUID REFERENCES public.bank_reconciliations(id);

-- Adicionar coluna reconciled_via na payables se não existir
ALTER TABLE public.payables 
ADD COLUMN IF NOT EXISTS reconciliation_id UUID REFERENCES public.bank_reconciliations(id);