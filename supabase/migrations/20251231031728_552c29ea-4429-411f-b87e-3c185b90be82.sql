-- Criar trigger para associar novo usuário à primeira empresa ativa
-- e criar registro na tabela users

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

  -- Criar registro na tabela users
  INSERT INTO public.users (auth_id, email, full_name, is_active)
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

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();