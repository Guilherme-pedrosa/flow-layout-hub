-- Remover política restritiva de INSERT
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

-- Nova política para INSERT: permitir inserção para todos (trigger associa ao usuário)
CREATE POLICY "Anyone can create companies"
ON public.companies
FOR INSERT
WITH CHECK (true);