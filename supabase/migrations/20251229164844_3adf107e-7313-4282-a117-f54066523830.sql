-- Remover políticas antigas do bucket inter-certs
DROP POLICY IF EXISTS "Usuários podem fazer upload de certificados da sua empresa" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem ver certificados da sua empresa" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar certificados da sua empresa" ON storage.objects;

-- Criar políticas mais simples para o bucket inter-certs (privado)
CREATE POLICY "Permitir upload de certificados inter"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inter-certs');

CREATE POLICY "Permitir leitura de certificados inter"
ON storage.objects FOR SELECT
USING (bucket_id = 'inter-certs');

CREATE POLICY "Permitir deletar certificados inter"
ON storage.objects FOR DELETE
USING (bucket_id = 'inter-certs');

-- Também simplificar a política do inter_credentials
DROP POLICY IF EXISTS "Acesso por company_id para inter_credentials" ON public.inter_credentials;

CREATE POLICY "Permitir acesso a inter_credentials"
ON public.inter_credentials FOR ALL
USING (true)
WITH CHECK (true);