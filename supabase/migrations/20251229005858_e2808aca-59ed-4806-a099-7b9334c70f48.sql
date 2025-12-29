-- Tabela de status de pedidos de compra parametrizáveis
CREATE TABLE public.purchase_order_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  is_default BOOLEAN DEFAULT false,
  -- Comportamento do estoque
  stock_behavior TEXT NOT NULL DEFAULT 'none' CHECK (stock_behavior IN ('none', 'entry', 'forecast')),
  -- Comportamento do financeiro
  financial_behavior TEXT NOT NULL DEFAULT 'none' CHECK (financial_behavior IN ('none', 'payable', 'forecast')),
  -- Ordem de exibição
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para company_id
CREATE INDEX idx_purchase_order_statuses_company ON public.purchase_order_statuses(company_id);

-- Habilitar RLS
ALTER TABLE public.purchase_order_statuses ENABLE ROW LEVEL SECURITY;

-- Política de acesso público (temporária, ajustar quando tiver auth)
CREATE POLICY "Acesso público para purchase_order_statuses"
ON public.purchase_order_statuses
AS RESTRICTIVE
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_purchase_order_statuses_updated_at
BEFORE UPDATE ON public.purchase_order_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna status_id na tabela purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN status_id UUID REFERENCES public.purchase_order_statuses(id);

-- Adicionar campos financeiros no purchase_orders
ALTER TABLE public.purchase_orders
ADD COLUMN payment_method TEXT,
ADD COLUMN chart_account_id UUID REFERENCES public.chart_of_accounts(id),
ADD COLUMN cost_center_id UUID REFERENCES public.cost_centers(id),
ADD COLUMN financial_notes TEXT;