-- Adicionar field_customer_id à tabela clientes (master key do Field Control)
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS field_customer_id VARCHAR(100);

-- Criar índice único por company_id + field_customer_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_field_customer_id_unique 
ON public.clientes(company_id, field_customer_id) 
WHERE field_customer_id IS NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.clientes.field_customer_id IS 'ID do cliente no Field Control - master key para integração';