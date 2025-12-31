-- Adicionar política para permitir leitura de insights sem autenticação
-- (já que o sistema não usa auth do Supabase atualmente)

DROP POLICY IF EXISTS "Users can view insights from their companies" ON public.ai_insights;
DROP POLICY IF EXISTS "Users can update insights from their companies" ON public.ai_insights;

-- Política de leitura - qualquer um pode ler insights (sistema interno)
CREATE POLICY "Anyone can view insights" 
ON public.ai_insights 
FOR SELECT 
USING (true);

-- Política de atualização - qualquer um pode atualizar (marcar como lido/dispensar)
CREATE POLICY "Anyone can update insights" 
ON public.ai_insights 
FOR UPDATE 
USING (true);

-- Política de inserção - qualquer um pode inserir (via edge functions)
CREATE POLICY "Anyone can insert insights" 
ON public.ai_insights 
FOR INSERT 
WITH CHECK (true);