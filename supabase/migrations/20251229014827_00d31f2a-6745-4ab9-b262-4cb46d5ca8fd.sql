-- Tabela de status de vendas (customizáveis)
CREATE TABLE public.sale_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  financial_behavior TEXT NOT NULL DEFAULT 'none' CHECK (financial_behavior IN ('none', 'forecast', 'effective')),
  stock_behavior TEXT NOT NULL DEFAULT 'none' CHECK (stock_behavior IN ('none', 'reserve', 'move')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela principal de vendas
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_number SERIAL,
  client_id UUID REFERENCES public.clientes(id),
  seller_id UUID REFERENCES public.users(id),
  status_id UUID REFERENCES public.sale_statuses(id),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  sales_channel TEXT DEFAULT 'presencial',
  cost_center_id UUID REFERENCES public.cost_centers(id),
  
  -- Campos extras
  quote_number TEXT,
  os_number TEXT,
  os_gc TEXT,
  extra_observation TEXT,
  
  -- Transporte
  freight_value NUMERIC DEFAULT 0,
  carrier TEXT,
  
  -- Endereço de entrega
  delivery_address JSONB,
  
  -- Totais
  products_total NUMERIC DEFAULT 0,
  services_total NUMERIC DEFAULT 0,
  discount_value NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  
  -- Pagamento
  payment_type TEXT DEFAULT 'avista' CHECK (payment_type IN ('avista', 'parcelado')),
  installments INTEGER DEFAULT 1,
  
  -- Observações
  observations TEXT,
  internal_observations TEXT,
  
  -- Link rastreável
  tracking_token UUID DEFAULT gen_random_uuid(),
  
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens de produto na venda
CREATE TABLE public.sale_product_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  details TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_value NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'value' CHECK (discount_type IN ('value', 'percent')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens de serviço na venda
CREATE TABLE public.sale_service_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  service_description TEXT NOT NULL,
  details TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_value NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'value' CHECK (discount_type IN ('value', 'percent')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Anexos da venda
CREATE TABLE public.sale_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rastreamento de visualizações do orçamento
CREATE TABLE public.sale_quote_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações de template de PDF
CREATE TABLE public.sale_pdf_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_product_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_quote_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_pdf_templates ENABLE ROW LEVEL SECURITY;

-- Policies (acesso público por enquanto, como as outras tabelas)
CREATE POLICY "Acesso público para sale_statuses" ON public.sale_statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para sale_product_items" ON public.sale_product_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para sale_service_items" ON public.sale_service_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para sale_attachments" ON public.sale_attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para sale_quote_views" ON public.sale_quote_views FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para sale_pdf_templates" ON public.sale_pdf_templates FOR ALL USING (true) WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_sale_statuses_updated_at BEFORE UPDATE ON public.sale_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sale_pdf_templates_updated_at BEFORE UPDATE ON public.sale_pdf_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para sales
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;