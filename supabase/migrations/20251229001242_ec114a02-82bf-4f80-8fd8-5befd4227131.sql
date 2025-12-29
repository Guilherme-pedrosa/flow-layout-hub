-- Tabela de Produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  ncm TEXT,
  unit TEXT DEFAULT 'UN',
  purchase_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Movimentações de Estoque
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- ENTRADA_COMPRA, SAIDA_VENDA, AJUSTE_ENTRADA, AJUSTE_SAIDA, ESTORNO
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  reason TEXT,
  reference_type TEXT, -- purchase_order, sale, adjustment
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabela de Pedidos de Compra (Notas Fiscais)
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_cnpj TEXT,
  supplier_name TEXT,
  supplier_address TEXT,
  invoice_number TEXT,
  invoice_series TEXT,
  invoice_date DATE,
  total_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pendente', -- pendente, conferido, finalizado
  xml_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabela de Itens do Pedido de Compra
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  xml_code TEXT,
  xml_description TEXT,
  ncm TEXT,
  cfop TEXT,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (público para MVP)
CREATE POLICY "Acesso público para products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para purchase_order_items" ON public.purchase_order_items FOR ALL USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();