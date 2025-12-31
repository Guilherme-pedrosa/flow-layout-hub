-- Corrigir função handle_new_auth_user para usar coluna 'name' ao invés de 'full_name'
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_company_id uuid;
  new_user_id uuid;
BEGIN
  -- Buscar primeira empresa ativa
  SELECT id INTO first_company_id
  FROM public.companies
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;

  -- Criar registro na tabela users (usando 'name' ao invés de 'full_name')
  INSERT INTO public.users (auth_id, email, name, is_active)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    true
  )
  RETURNING id INTO new_user_id;

  -- Associar usuário à primeira empresa (se existir)
  IF first_company_id IS NOT NULL THEN
    INSERT INTO public.user_companies (user_id, company_id, role, is_default)
    VALUES (new_user_id, first_company_id, 'admin', true);
  END IF;

  RETURN NEW;
END;
$$;