-- Drop existing RLS policy
DROP POLICY IF EXISTS "Users can manage financial situations from their companies" ON public.financial_situations;

-- Create public access policy (same pattern as other tables in this project)
CREATE POLICY "Acesso público para financial_situations"
ON public.financial_situations
FOR ALL
USING (true)
WITH CHECK (true);