-- Create services table (serviços cadastrados)
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT DEFAULT 'SV',
  sale_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para services" ON public.services
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create price_tables table (tabelas de preço)
CREATE TABLE public.price_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.price_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para price_tables" ON public.price_tables
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_price_tables_updated_at
  BEFORE UPDATE ON public.price_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create price_table_items table (itens das tabelas de preço)
CREATE TABLE public.price_table_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT price_table_items_product_or_service CHECK (
    (product_id IS NOT NULL AND service_id IS NULL) OR 
    (product_id IS NULL AND service_id IS NOT NULL)
  )
);

ALTER TABLE public.price_table_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para price_table_items" ON public.price_table_items
  FOR ALL USING (true) WITH CHECK (true);

-- Add seller_id and technician_id to sales table (reference to users)
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES public.users(id);

-- Add service_id to sale_service_items for referencing services table
ALTER TABLE public.sale_service_items 
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id);

-- Add price_table_id to sale_product_items for referencing price tables
ALTER TABLE public.sale_product_items 
  ADD COLUMN IF NOT EXISTS price_table_id UUID REFERENCES public.price_tables(id);

-- Create sale_installments table for payment installments
CREATE TABLE public.sale_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para sale_installments" ON public.sale_installments
  FOR ALL USING (true) WITH CHECK (true);