-- Adiciona coluna para armazenar a natureza da operação da NF-e
-- Essa informação é crucial para sugerir o CFOP correto (remessa, venda, garantia, etc)
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS nfe_natureza_operacao TEXT;