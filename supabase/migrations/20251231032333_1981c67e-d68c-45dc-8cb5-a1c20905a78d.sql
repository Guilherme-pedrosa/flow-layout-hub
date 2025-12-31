-- Criar trigger para vincular usuário criador à nova empresa automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Buscar o user_id do usuário autenticado
  SELECT id INTO current_user_id
  FROM public.users
  WHERE auth_id = auth.uid();

  -- Se encontrou o usuário, vincular à nova empresa
  IF current_user_id IS NOT NULL THEN
    INSERT INTO public.user_companies (user_id, company_id, role, is_default)
    VALUES (current_user_id, NEW.id, 'admin', false)
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_company_created ON public.companies;

-- Criar trigger para novas empresas
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();