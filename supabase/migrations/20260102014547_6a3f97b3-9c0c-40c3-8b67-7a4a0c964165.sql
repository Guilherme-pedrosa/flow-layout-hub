-- Adicionar coluna scheduled_date na tabela service_orders (se não existir)
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS scheduled_date date;