-- Remover coluna que não será usada
ALTER TABLE public.service_order_statuses 
DROP COLUMN IF EXISTS requires_completed_checkout;

ALTER TABLE public.sale_statuses 
DROP COLUMN IF EXISTS requires_completed_checkout;

-- Adicionar permissão para reverter checkout na tabela users
-- Usando JSONB para permissões flexíveis
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}';

COMMENT ON COLUMN public.users.permissions IS 'Permissões específicas do usuário: {"can_revert_checkout": true, "can_delete_financial": true}';