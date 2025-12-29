-- Remove a foreign key antiga que aponta para suppliers
ALTER TABLE public.purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;

-- Adiciona nova foreign key apontando para pessoas
ALTER TABLE public.purchase_orders 
ADD CONSTRAINT purchase_orders_supplier_id_fkey 
FOREIGN KEY (supplier_id) REFERENCES public.pessoas(id);