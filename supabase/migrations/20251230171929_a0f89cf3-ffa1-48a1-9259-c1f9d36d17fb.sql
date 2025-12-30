-- Tabela para histórico de custo de produtos
CREATE TABLE public.product_cost_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo_movimentacao TEXT NOT NULL, -- 'Entrada NF-e', 'Ajuste Manual', 'Custo Inicial'
  custo_anterior NUMERIC NOT NULL DEFAULT 0,
  custo_novo NUMERIC NOT NULL DEFAULT 0,
  quantidade NUMERIC DEFAULT 0,
  estoque_anterior NUMERIC DEFAULT 0,
  estoque_novo NUMERIC DEFAULT 0,
  documento_referencia TEXT, -- Número da NF-e, etc.
  usuario_id UUID,
  usuario_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas por produto
CREATE INDEX idx_product_cost_history_product ON public.product_cost_history(product_id);
CREATE INDEX idx_product_cost_history_created ON public.product_cost_history(created_at DESC);

-- Adicionar colunas faltantes na tabela products para custo médio
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS average_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS brand_id UUID,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Tabela para categorias de produtos
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.product_categories(id),
  is_active BOOLEAN DEFAULT true,
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para marcas de produtos
CREATE TABLE IF NOT EXISTS public.product_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_cost_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Acesso público para product_cost_history" ON public.product_cost_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para product_categories" ON public.product_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para product_brands" ON public.product_brands FOR ALL USING (true) WITH CHECK (true);