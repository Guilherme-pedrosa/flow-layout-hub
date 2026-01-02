-- Aumentar o tamanho do field_equipment_id para acomodar IDs longos do Field Control
ALTER TABLE equipments 
  ALTER COLUMN field_equipment_id TYPE varchar(255);