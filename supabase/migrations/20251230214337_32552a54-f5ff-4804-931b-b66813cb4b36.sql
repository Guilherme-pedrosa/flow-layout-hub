-- Adicionar campos para armazenar o fornecedor ORIGINAL da NF-e importada
-- Isso permite detectar quando o usuário seleciona um fornecedor diferente do da NF-e

ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS nfe_supplier_cnpj text,
ADD COLUMN IF NOT EXISTS nfe_supplier_name text;

-- Comentário explicativo
COMMENT ON COLUMN public.purchase_orders.nfe_supplier_cnpj IS 'CNPJ do fornecedor original da NF-e importada';
COMMENT ON COLUMN public.purchase_orders.nfe_supplier_name IS 'Razão social do fornecedor original da NF-e importada';