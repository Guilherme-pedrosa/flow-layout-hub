-- Add purpose column to purchase_order_limits table
ALTER TABLE public.purchase_order_limits 
ADD COLUMN purpose text NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.purchase_order_limits.purpose IS 'Tipo de pedido: estoque, os, ativo_fixo, uso_consumo, etc. NULL = todos os tipos';