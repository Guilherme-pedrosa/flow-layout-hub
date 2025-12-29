-- Criar tabela de contas a receber (boletos e títulos)
CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  client_id UUID REFERENCES public.clientes(id),
  sale_id UUID REFERENCES public.sales(id),
  
  -- Dados do título
  document_number TEXT,
  document_type TEXT DEFAULT 'boleto',
  description TEXT,
  
  -- Valores
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  
  -- Datas
  due_date DATE NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_paid BOOLEAN DEFAULT false,
  payment_method TEXT,
  
  -- Conciliação bancária
  bank_transaction_id UUID REFERENCES public.bank_transactions(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  
  -- Dados do boleto (Banco Inter)
  inter_boleto_id TEXT,
  inter_nosso_numero TEXT,
  inter_linha_digitavel TEXT,
  inter_codigo_barras TEXT,
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Acesso público para accounts_receivable"
ON public.accounts_receivable FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_accounts_receivable_company ON public.accounts_receivable(company_id);
CREATE INDEX idx_accounts_receivable_client ON public.accounts_receivable(client_id);
CREATE INDEX idx_accounts_receivable_due_date ON public.accounts_receivable(due_date);
CREATE INDEX idx_accounts_receivable_is_paid ON public.accounts_receivable(is_paid);
CREATE INDEX idx_accounts_receivable_bank_transaction ON public.accounts_receivable(bank_transaction_id);