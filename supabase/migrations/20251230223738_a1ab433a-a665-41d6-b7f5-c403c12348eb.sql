-- Criar tabela de parcelas de pedidos de compra
CREATE TABLE public.purchase_order_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  source TEXT DEFAULT 'manual', -- 'nfe' (veio da nota) ou 'manual' (criado pelo usuário)
  nfe_original_date DATE, -- Data original da NF-e (para auditoria)
  nfe_original_amount NUMERIC(15, 2), -- Valor original da NF-e (para auditoria)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.purchase_order_installments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura de parcelas"
ON public.purchase_order_installments
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de parcelas"
ON public.purchase_order_installments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de parcelas"
ON public.purchase_order_installments
FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão de parcelas"
ON public.purchase_order_installments
FOR DELETE
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_purchase_order_installments_updated_at
BEFORE UPDATE ON public.purchase_order_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_purchase_order_installments_order_id ON public.purchase_order_installments(purchase_order_id);
CREATE INDEX idx_purchase_order_installments_due_date ON public.purchase_order_installments(due_date);