-- Criar tabela de grupos de produtos
CREATE TABLE public.product_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Criar tabela de subgrupos de produtos
CREATE TABLE public.product_subgroups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, name)
);

-- Adicionar colunas na tabela products para referenciar grupo e subgrupo
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.product_groups(id),
ADD COLUMN IF NOT EXISTS subgroup_id UUID REFERENCES public.product_subgroups(id);

-- Enable RLS
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_subgroups ENABLE ROW LEVEL SECURITY;

-- RLS policies para product_groups
CREATE POLICY "Users can view product groups from their companies"
ON public.product_groups FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert product groups in their companies"
ON public.product_groups FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can update product groups in their companies"
ON public.product_groups FOR UPDATE
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can delete product groups in their companies"
ON public.product_groups FOR DELETE
USING (company_id IN (SELECT get_user_companies()));

-- RLS policies para product_subgroups
CREATE POLICY "Users can view product subgroups from their companies"
ON public.product_subgroups FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert product subgroups in their companies"
ON public.product_subgroups FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can update product subgroups in their companies"
ON public.product_subgroups FOR UPDATE
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can delete product subgroups in their companies"
ON public.product_subgroups FOR DELETE
USING (company_id IN (SELECT get_user_companies()));

-- Triggers para updated_at
CREATE TRIGGER update_product_groups_updated_at
BEFORE UPDATE ON public.product_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_subgroups_updated_at
BEFORE UPDATE ON public.product_subgroups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_product_groups_company ON public.product_groups(company_id);
CREATE INDEX idx_product_subgroups_company ON public.product_subgroups(company_id);
CREATE INDEX idx_product_subgroups_group ON public.product_subgroups(group_id);
CREATE INDEX idx_products_group ON public.products(group_id);
CREATE INDEX idx_products_subgroup ON public.products(subgroup_id);