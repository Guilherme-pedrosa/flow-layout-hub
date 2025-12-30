-- Adicionar campo requires_receipt na tabela de status de pedidos de compra
ALTER TABLE public.purchase_order_statuses 
ADD COLUMN requires_receipt boolean NOT NULL DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN public.purchase_order_statuses.requires_receipt IS 'Indica se pedidos com este status devem aparecer na tela de recebimento/check-in';

-- Criar tabela para registrar os recebimentos (check-in) de pedidos de compra
CREATE TABLE public.purchase_order_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'partial', 'complete')),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES public.users(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela para registrar os itens conferidos no recebimento
CREATE TABLE public.purchase_order_receipt_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id uuid NOT NULL REFERENCES public.purchase_order_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id uuid NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  quantity_expected numeric NOT NULL DEFAULT 0,
  quantity_received numeric NOT NULL DEFAULT 0,
  quantity_pending numeric GENERATED ALWAYS AS (quantity_expected - quantity_received) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar tabela de logs/auditoria de recebimento
CREATE TABLE public.purchase_order_receipt_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id uuid NOT NULL REFERENCES public.purchase_order_receipts(id) ON DELETE CASCADE,
  receipt_item_id uuid REFERENCES public.purchase_order_receipt_items(id) ON DELETE CASCADE,
  action text NOT NULL,
  quantity numeric,
  barcode_scanned text,
  user_id uuid REFERENCES public.users(id),
  user_name text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.purchase_order_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_receipt_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Acesso público para purchase_order_receipts" 
ON public.purchase_order_receipts FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Acesso público para purchase_order_receipt_items" 
ON public.purchase_order_receipt_items FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Acesso público para purchase_order_receipt_logs" 
ON public.purchase_order_receipt_logs FOR ALL 
USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_purchase_order_receipts_updated_at
BEFORE UPDATE ON public.purchase_order_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_order_receipt_items_updated_at
BEFORE UPDATE ON public.purchase_order_receipt_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_purchase_order_receipts_order_id ON public.purchase_order_receipts(purchase_order_id);
CREATE INDEX idx_purchase_order_receipts_status ON public.purchase_order_receipts(status);
CREATE INDEX idx_purchase_order_receipt_items_receipt_id ON public.purchase_order_receipt_items(receipt_id);
CREATE INDEX idx_purchase_order_receipt_logs_receipt_id ON public.purchase_order_receipt_logs(receipt_id);
CREATE INDEX idx_purchase_order_receipt_logs_user_id ON public.purchase_order_receipt_logs(user_id);