-- Drop old FK that references suppliers
ALTER TABLE public.payables DROP CONSTRAINT IF EXISTS payables_supplier_id_fkey;

-- Add new FK that references pessoas (unified entity table)
ALTER TABLE public.payables 
ADD CONSTRAINT payables_supplier_id_fkey 
FOREIGN KEY (supplier_id) REFERENCES public.pessoas(id);