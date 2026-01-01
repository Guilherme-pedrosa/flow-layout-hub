-- Adicionar coluna para armazenar técnicos do Field Control (JSON array com id, nome)
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS field_technicians JSONB DEFAULT '[]'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.service_orders.field_technicians IS 'Array de técnicos do Field Control atribuídos a esta OS. Formato: [{id, name, email}]';