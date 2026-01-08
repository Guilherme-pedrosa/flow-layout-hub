
-- Adicionar expiry_mode no document_types
ALTER TABLE public.document_types 
ADD COLUMN IF NOT EXISTS expiry_mode TEXT DEFAULT 'EXPIRES_AT' 
CHECK (expiry_mode IN ('NONE', 'EXPIRES_AT', 'ISSUE_PLUS_DAYS'));

-- Atualizar registros existentes baseado em requires_expiry
UPDATE public.document_types 
SET expiry_mode = CASE WHEN requires_expiry THEN 'EXPIRES_AT' ELSE 'NONE' END
WHERE expiry_mode IS NULL OR expiry_mode = 'EXPIRES_AT';

-- Adicionar issue_date nos documentos para suportar modo ISSUE_PLUS_DAYS
ALTER TABLE public.company_documents 
ADD COLUMN IF NOT EXISTS issue_date DATE;

ALTER TABLE public.technician_documents 
ADD COLUMN IF NOT EXISTS issue_date DATE;
