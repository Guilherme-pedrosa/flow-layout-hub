-- Tabela para armazenar pagamentos PIX enviados
CREATE TABLE public.inter_pix_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  payable_id UUID REFERENCES public.payables(id),
  
  -- Dados do favorecido
  recipient_name TEXT NOT NULL,
  recipient_document TEXT NOT NULL,
  pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatorio')),
  
  -- Dados do pagamento
  amount NUMERIC NOT NULL,
  description TEXT,
  
  -- Resposta do Banco Inter
  inter_end_to_end_id TEXT,
  inter_transaction_id TEXT,
  inter_status TEXT DEFAULT 'pending',
  inter_response JSONB,
  
  -- Controle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  created_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_inter_pix_payments_company_id ON public.inter_pix_payments(company_id);
CREATE INDEX idx_inter_pix_payments_status ON public.inter_pix_payments(status);
CREATE INDEX idx_inter_pix_payments_created_at ON public.inter_pix_payments(created_at DESC);

-- Enable RLS
ALTER TABLE public.inter_pix_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Acesso público para inter_pix_payments"
  ON public.inter_pix_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_inter_pix_payments_updated_at
  BEFORE UPDATE ON public.inter_pix_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();