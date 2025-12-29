
-- Adicionar novos campos à tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS product_group TEXT,
ADD COLUMN IF NOT EXISTS controls_stock BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_variations BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_composition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS width NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS height NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS length NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS description_long TEXT,
ADD COLUMN IF NOT EXISTS is_sold_separately BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_pdv_available BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accessory_expenses NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS benefit_code TEXT,
ADD COLUMN IF NOT EXISTS cest TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS net_weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_weight NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fci_number TEXT,
ADD COLUMN IF NOT EXISTS specific_product TEXT,
ADD COLUMN IF NOT EXISTS max_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_fields JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS unit_conversions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ncm_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ncm_description TEXT;

-- Criar tabela para imagens de produtos
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_main BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para product_images
CREATE POLICY "Permitir leitura de imagens"
ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de imagens"
ON public.product_images FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de imagens"
ON public.product_images FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusão de imagens"
ON public.product_images FOR DELETE USING (true);

-- Criar tabela para fornecedores de produtos
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_cnpj TEXT,
  supplier_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para product_suppliers
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para product_suppliers
CREATE POLICY "Permitir leitura de fornecedores"
ON public.product_suppliers FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de fornecedores"
ON public.product_suppliers FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de fornecedores"
ON public.product_suppliers FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir exclusão de fornecedores"
ON public.product_suppliers FOR DELETE USING (true);

-- Criar bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para product-images
CREATE POLICY "Imagens de produtos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Permitir upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Permitir deletar imagens"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');
