-- Criar índice único para permitir upsert por company_id + field_equipment_id
CREATE UNIQUE INDEX IF NOT EXISTS equipments_company_field_unique 
ON public.equipments (company_id, field_equipment_id) 
WHERE field_equipment_id IS NOT NULL;