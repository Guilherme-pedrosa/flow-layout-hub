-- Add nfe_cfop_saida column to purchase_orders to store the CFOP from the imported XML
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS nfe_cfop_saida text;