-- Permitir NULL em campos monetários para suportar "campo vazio"
-- Tabela: service_order_product_items

ALTER TABLE public.service_order_product_items 
  ALTER COLUMN unit_price DROP NOT NULL,
  ALTER COLUMN unit_price DROP DEFAULT;

ALTER TABLE public.service_order_product_items 
  ALTER COLUMN discount_value DROP DEFAULT;

-- Tabela: service_order_installments

ALTER TABLE public.service_order_installments 
  ALTER COLUMN amount DROP NOT NULL;