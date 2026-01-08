-- Corrigir constraint: code deve ser único por empresa, não globalmente
ALTER TABLE public.document_types DROP CONSTRAINT IF EXISTS document_types_code_key;
ALTER TABLE public.document_types ADD CONSTRAINT document_types_code_company_unique UNIQUE (code, company_id);