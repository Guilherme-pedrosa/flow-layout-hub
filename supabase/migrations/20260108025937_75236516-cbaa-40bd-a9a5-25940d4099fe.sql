-- Adicionar coluna field_task_type_id para armazenar o ID correto do Field Control
ALTER TABLE public.service_types 
ADD COLUMN IF NOT EXISTS field_task_type_id text;

-- Copiar dados existentes de field_service_id para field_task_type_id (se houver)
UPDATE public.service_types 
SET field_task_type_id = field_service_id 
WHERE field_task_type_id IS NULL AND field_service_id IS NOT NULL;

-- Criar índice para busca eficiente
CREATE INDEX IF NOT EXISTS idx_service_types_field_task_type_id 
ON public.service_types(company_id, field_task_type_id);