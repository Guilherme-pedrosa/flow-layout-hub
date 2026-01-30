-- Remover política antiga que restringe por empresa
DROP POLICY IF EXISTS "Usuários acessam clientes da empresa" ON public.clientes;

-- Nova política: usuários autenticados podem VER todos os clientes
CREATE POLICY "Usuários autenticados podem ver clientes" 
ON public.clientes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Política para INSERT: usuário pode criar cliente em qualquer empresa que tenha acesso
CREATE POLICY "Usuários podem criar clientes nas suas empresas" 
ON public.clientes 
FOR INSERT 
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Política para UPDATE: usuário pode atualizar cliente de qualquer empresa que tenha acesso
CREATE POLICY "Usuários podem atualizar clientes das suas empresas" 
ON public.clientes 
FOR UPDATE 
USING (company_id IN (SELECT get_user_companies()));

-- Política para DELETE: usuário pode deletar cliente de qualquer empresa que tenha acesso
CREATE POLICY "Usuários podem deletar clientes das suas empresas" 
ON public.clientes 
FOR DELETE 
USING (company_id IN (SELECT get_user_companies()));