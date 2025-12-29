-- Remove FK antiga para clientes e adiciona nova para pessoas
ALTER TABLE public.service_orders
DROP CONSTRAINT service_orders_client_id_fkey;

ALTER TABLE public.service_orders
ADD CONSTRAINT service_orders_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.pessoas(id) ON DELETE SET NULL;