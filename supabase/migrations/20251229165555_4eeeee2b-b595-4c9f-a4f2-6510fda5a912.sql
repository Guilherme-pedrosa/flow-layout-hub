-- Remover política antiga que verifica auth_id
DROP POLICY IF EXISTS "Acesso por company_id para bank_transactions" ON public.bank_transactions;

-- Criar política simples para acesso
CREATE POLICY "Acesso público para bank_transactions"
ON public.bank_transactions FOR ALL
USING (true)
WITH CHECK (true);