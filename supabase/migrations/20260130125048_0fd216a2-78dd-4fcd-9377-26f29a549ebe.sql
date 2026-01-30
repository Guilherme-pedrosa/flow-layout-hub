-- Atualizar a função diretamente (sem drop)
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_access boolean := false;
BEGIN
  -- Buscar o user_id do usuário autenticado
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_id = auth.uid();
  
  -- Se não encontrou usuário, não tem acesso
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se tem acesso via company_id direto na tabela users
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = v_user_id AND company_id = p_company_id
  ) INTO v_has_access;
  
  IF v_has_access THEN
    RETURN true;
  END IF;
  
  -- Verificar se tem acesso via user_companies
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = v_user_id AND company_id = p_company_id
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;