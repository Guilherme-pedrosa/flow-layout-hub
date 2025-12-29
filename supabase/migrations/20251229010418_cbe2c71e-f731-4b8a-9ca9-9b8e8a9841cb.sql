-- Remover política restritiva antiga
DROP POLICY IF EXISTS "Acesso público para purchase_order_statuses" ON public.purchase_order_statuses;

-- Criar política permissiva para acesso público
CREATE POLICY "Permitir leitura de status"
ON public.purchase_order_statuses
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de status"
ON public.purchase_order_statuses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização de status"
ON public.purchase_order_statuses
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusão de status"
ON public.purchase_order_statuses
FOR DELETE
USING (true);