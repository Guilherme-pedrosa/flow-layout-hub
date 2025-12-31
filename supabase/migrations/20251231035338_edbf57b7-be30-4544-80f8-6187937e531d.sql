-- Criar políticas RLS para tabela pessoas
-- Permite acesso a pessoas da mesma empresa OU pessoas sem company_id (dados legados)

-- Política de SELECT (leitura)
CREATE POLICY "Usuários podem ver pessoas da sua empresa ou sem empresa"
ON public.pessoas
FOR SELECT
USING (
  company_id IS NULL 
  OR company_id IN (
    SELECT company_id FROM public.users WHERE id = auth.uid()
  )
);

-- Política de INSERT
CREATE POLICY "Usuários podem criar pessoas na sua empresa"
ON public.pessoas
FOR INSERT
WITH CHECK (
  company_id IS NULL 
  OR company_id IN (
    SELECT company_id FROM public.users WHERE id = auth.uid()
  )
);

-- Política de UPDATE
CREATE POLICY "Usuários podem atualizar pessoas da sua empresa ou sem empresa"
ON public.pessoas
FOR UPDATE
USING (
  company_id IS NULL 
  OR company_id IN (
    SELECT company_id FROM public.users WHERE id = auth.uid()
  )
);

-- Política de DELETE  
CREATE POLICY "Usuários podem deletar pessoas da sua empresa ou sem empresa"
ON public.pessoas
FOR DELETE
USING (
  company_id IS NULL 
  OR company_id IN (
    SELECT company_id FROM public.users WHERE id = auth.uid()
  )
);