-- Remover política restritiva atual
DROP POLICY IF EXISTS "Usuários acessam suas companies" ON public.companies;

-- Política para SELECT: usuários só veem suas empresas
CREATE POLICY "Users can view their companies"
ON public.companies
FOR SELECT
USING (
  id IN (SELECT get_user_companies())
);

-- Política para INSERT: qualquer usuário autenticado pode criar empresas
CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para UPDATE: usuários podem atualizar suas empresas
CREATE POLICY "Users can update their companies"
ON public.companies
FOR UPDATE
USING (id IN (SELECT get_user_companies()))
WITH CHECK (id IN (SELECT get_user_companies()));

-- Política para DELETE: usuários podem excluir suas empresas
CREATE POLICY "Users can delete their companies"
ON public.companies
FOR DELETE
USING (id IN (SELECT get_user_companies()));

-- Criar função para associar empresa ao usuário automaticamente
CREATE OR REPLACE FUNCTION public.associate_company_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscar o user_id na tabela users pelo auth_id
  SELECT id INTO v_user_id FROM public.users WHERE auth_id = auth.uid();
  
  -- Se encontrou o usuário, associar a empresa
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_companies (user_id, company_id, role)
    VALUES (v_user_id, NEW.id, 'admin')
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para associar automaticamente
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.associate_company_to_user();