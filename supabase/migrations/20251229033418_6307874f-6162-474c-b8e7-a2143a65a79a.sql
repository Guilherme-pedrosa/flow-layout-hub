-- Adicionar campos de controle de status financeiro na tabela service_orders
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS financial_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS nfe_number text,
ADD COLUMN IF NOT EXISTS nfe_emitted_at timestamp with time zone;

-- Comentários explicativos
COMMENT ON COLUMN public.service_orders.financial_status IS 'Status financeiro: none, pending, partial, paid';
COMMENT ON COLUMN public.service_orders.nfe_number IS 'Número da NFe emitida';
COMMENT ON COLUMN public.service_orders.nfe_emitted_at IS 'Data/hora de emissão da NFe';

-- Adicionar coluna requires_completed_checkout na tabela de status
-- Isso permite marcar status que só podem ser selecionados após checkout completo
ALTER TABLE public.service_order_statuses 
ADD COLUMN IF NOT EXISTS requires_completed_checkout boolean DEFAULT false;

COMMENT ON COLUMN public.service_order_statuses.requires_completed_checkout IS 'Se true, este status só pode ser selecionado após checkout completo';

-- Fazer o mesmo para sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS financial_status text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS nfe_number text,
ADD COLUMN IF NOT EXISTS nfe_emitted_at timestamp with time zone;

ALTER TABLE public.sale_statuses 
ADD COLUMN IF NOT EXISTS requires_completed_checkout boolean DEFAULT false;