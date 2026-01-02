-- Adicionar coluna para controlar se o estoque já foi atualizado para cada item
ALTER TABLE public.purchase_order_receipt_items 
ADD COLUMN IF NOT EXISTS stock_updated BOOLEAN DEFAULT FALSE;