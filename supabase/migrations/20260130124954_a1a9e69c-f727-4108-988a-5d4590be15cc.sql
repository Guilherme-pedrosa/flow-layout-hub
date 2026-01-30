-- Corrigir função user_has_company_access para usar user_companies corretamente
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND (
      u.company_id = p_company_id
      OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = u.id
        AND uc.company_id = p_company_id
      )
    )
  );
$$;