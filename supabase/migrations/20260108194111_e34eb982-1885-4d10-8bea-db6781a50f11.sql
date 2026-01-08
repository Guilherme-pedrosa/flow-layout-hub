
-- Remover triggers temporariamente
DROP TRIGGER IF EXISTS trigger_sync_equipment ON public.equipments;
DROP TRIGGER IF EXISTS trigger_sync_equipment_insert ON public.equipments;
DROP TRIGGER IF EXISTS trigger_sync_equipment_update ON public.equipments;

-- Expandir colunas para acomodar dados do Field Control
ALTER TABLE public.equipments 
  ALTER COLUMN serial_number TYPE varchar(255),
  ALTER COLUMN model TYPE varchar(255),
  ALTER COLUMN brand TYPE varchar(255),
  ALTER COLUMN equipment_type TYPE varchar(255),
  ALTER COLUMN location_description TYPE text,
  ALTER COLUMN sector TYPE varchar(255),
  ALTER COLUMN environment TYPE varchar(255),
  ALTER COLUMN qr_code TYPE varchar(500);

-- Recriar triggers
CREATE TRIGGER trigger_sync_equipment 
  BEFORE INSERT OR UPDATE OF serial_number, model, brand, equipment_type, client_id 
  ON public.equipments 
  FOR EACH ROW 
  EXECUTE FUNCTION create_sync_job_on_equipment_change();

CREATE TRIGGER trigger_sync_equipment_insert 
  BEFORE INSERT 
  ON public.equipments 
  FOR EACH ROW 
  EXECUTE FUNCTION trigger_sync_equipment();

CREATE TRIGGER trigger_sync_equipment_update 
  BEFORE UPDATE 
  ON public.equipments 
  FOR EACH ROW 
  WHEN (
    (old.serial_number)::text IS DISTINCT FROM (new.serial_number)::text 
    OR (old.brand)::text IS DISTINCT FROM (new.brand)::text 
    OR (old.model)::text IS DISTINCT FROM (new.model)::text 
    OR old.client_id IS DISTINCT FROM new.client_id
  )
  EXECUTE FUNCTION trigger_sync_equipment();
