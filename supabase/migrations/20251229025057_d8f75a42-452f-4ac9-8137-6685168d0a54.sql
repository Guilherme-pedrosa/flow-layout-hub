
-- Tabela de itens conferidos no checkout de OS
CREATE TABLE public.service_order_checkout_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_product_item_id UUID NOT NULL REFERENCES public.service_order_product_items(id) ON DELETE CASCADE,
  quantity_checked NUMERIC NOT NULL DEFAULT 0,
  quantity_pending NUMERIC NOT NULL DEFAULT 0,
  barcode_scanned TEXT,
  checked_by UUID REFERENCES public.users(id),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_order_checkout_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Acesso público para service_order_checkout_items"
ON public.service_order_checkout_items
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_service_order_checkout_items_updated_at
BEFORE UPDATE ON public.service_order_checkout_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
