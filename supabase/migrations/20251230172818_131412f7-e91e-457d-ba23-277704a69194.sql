
-- Tabela de localizações físicas de estoque (endereços do armazém)
CREATE TABLE public.stock_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  zone TEXT,
  aisle TEXT,
  shelf TEXT,
  level TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de estoque por localização (produto pode estar em múltiplas localizações)
CREATE TABLE public.product_stock_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.stock_locations(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  min_quantity NUMERIC DEFAULT 0,
  max_quantity NUMERIC,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

-- Adicionar coluna de localização padrão no produto (referência rápida)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES public.stock_locations(id);

-- RLS policies
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para stock_locations" ON public.stock_locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para product_stock_locations" ON public.product_stock_locations FOR ALL USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_stock_locations_company ON public.stock_locations(company_id);
CREATE INDEX idx_stock_locations_code ON public.stock_locations(code);
CREATE INDEX idx_product_stock_locations_product ON public.product_stock_locations(product_id);
CREATE INDEX idx_product_stock_locations_location ON public.product_stock_locations(location_id);

-- Trigger para updated_at
CREATE TRIGGER update_stock_locations_updated_at BEFORE UPDATE ON public.stock_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_stock_locations_updated_at BEFORE UPDATE ON public.product_stock_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
