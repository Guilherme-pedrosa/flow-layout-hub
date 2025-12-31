-- Adicionar coluna bank_transaction_id à tabela reconciliation_suggestions
ALTER TABLE public.reconciliation_suggestions 
ADD COLUMN IF NOT EXISTS bank_transaction_id uuid REFERENCES public.bank_transactions(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_suggestions_bank_transaction 
ON public.reconciliation_suggestions(bank_transaction_id);