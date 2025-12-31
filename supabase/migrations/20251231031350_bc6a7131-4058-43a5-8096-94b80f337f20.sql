-- Atualizar função para retornar todas empresas ativas quando não há usuário autenticado
-- Isso é necessário para desenvolvimento sem autenticação
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Retornar empresas do usuário se autenticado
  SELECT uc.company_id 
  FROM public.user_companies uc
  JOIN public.users u ON u.id = uc.user_id
  WHERE u.auth_id = auth.uid()
  
  UNION
  
  -- Retornar todas as empresas ativas se não há usuário autenticado (dev mode)
  SELECT c.id
  FROM public.companies c
  WHERE c.is_active = true AND auth.uid() IS NULL;
$$;