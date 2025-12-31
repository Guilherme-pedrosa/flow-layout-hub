-- Atualizar política de products para permitir company_id NULL (produtos compartilhados)
DROP POLICY IF EXISTS "Usuários acessam products da empresa" ON public.products;

CREATE POLICY "Usuários acessam products" 
ON public.products 
FOR ALL 
USING (
  company_id IS NULL 
  OR company_id IN (SELECT get_user_companies())
);

-- Atualizar política de chart_of_accounts para compartilhar entre empresas
DROP POLICY IF EXISTS "Usuários acessam chart_of_accounts da empresa" ON public.chart_of_accounts;

CREATE POLICY "Usuários acessam chart_of_accounts" 
ON public.chart_of_accounts 
FOR ALL 
USING (
  company_id IN (SELECT get_user_companies())
  OR EXISTS (SELECT 1 FROM get_user_companies())
);

-- Atualizar política de cost_centers para compartilhar entre empresas
DROP POLICY IF EXISTS "Usuários acessam cost_centers da empresa" ON public.cost_centers;

CREATE POLICY "Usuários acessam cost_centers" 
ON public.cost_centers 
FOR ALL 
USING (
  company_id IN (SELECT get_user_companies())
  OR EXISTS (SELECT 1 FROM get_user_companies())
);