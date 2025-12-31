-- Criar políticas simples para inter-certs bucket
-- SELECT: Usuários autenticados podem ler certificados da sua empresa
CREATE POLICY "inter_certs_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inter-certs'
  AND (storage.foldername(name))[1] IN (
    SELECT uc.company_id::text FROM public.user_companies uc
    JOIN public.users u ON u.id = uc.user_id
    WHERE u.auth_id = auth.uid()
  )
);

-- INSERT: Usuários autenticados podem fazer upload de certificados da sua empresa
CREATE POLICY "inter_certs_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inter-certs'
  AND (storage.foldername(name))[1] IN (
    SELECT uc.company_id::text FROM public.user_companies uc
    JOIN public.users u ON u.id = uc.user_id
    WHERE u.auth_id = auth.uid()
  )
);

-- UPDATE: Usuários autenticados podem atualizar certificados da sua empresa
CREATE POLICY "inter_certs_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inter-certs'
  AND (storage.foldername(name))[1] IN (
    SELECT uc.company_id::text FROM public.user_companies uc
    JOIN public.users u ON u.id = uc.user_id
    WHERE u.auth_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'inter-certs'
  AND (storage.foldername(name))[1] IN (
    SELECT uc.company_id::text FROM public.user_companies uc
    JOIN public.users u ON u.id = uc.user_id
    WHERE u.auth_id = auth.uid()
  )
);

-- DELETE: Usuários autenticados podem deletar certificados da sua empresa
CREATE POLICY "inter_certs_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inter-certs'
  AND (storage.foldername(name))[1] IN (
    SELECT uc.company_id::text FROM public.user_companies uc
    JOIN public.users u ON u.id = uc.user_id
    WHERE u.auth_id = auth.uid()
  )
);