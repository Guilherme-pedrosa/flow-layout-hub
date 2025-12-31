-- Remover a foreign key antiga que aponta para 'suppliers' (tabela errada)
ALTER TABLE public.purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_cte_carrier_id_fkey;

-- Adicionar nova foreign key apontando para 'pessoas' (tabela correta)
ALTER TABLE public.purchase_orders
ADD CONSTRAINT purchase_orders_cte_carrier_id_fkey 
FOREIGN KEY (cte_carrier_id) REFERENCES public.pessoas(id) ON DELETE SET NULL;