-- Remover índice condicional que não funciona com ON CONFLICT
DROP INDEX IF EXISTS equipments_company_field_unique;

-- Criar índice único SEM condição para suportar ON CONFLICT
CREATE UNIQUE INDEX equipments_company_field_equipment_id_unique 
ON public.equipments (company_id, field_equipment_id) 
WHERE field_equipment_id IS NOT NULL;