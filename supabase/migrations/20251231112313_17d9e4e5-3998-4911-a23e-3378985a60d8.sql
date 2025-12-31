-- Criar políticas de storage para o bucket inter-certs
-- Permite que usuários façam upload/update de certificados para suas empresas

-- Política para SELECT (download)
CREATE POLICY "Usuários podem baixar certificados da sua empresa"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'inter-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.user_companies 
    WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
);

-- Política para INSERT (upload)
CREATE POLICY "Usuários podem fazer upload de certificados da sua empresa"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'inter-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.user_companies 
    WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
);

-- Política para UPDATE (substituir)
CREATE POLICY "Usuários podem atualizar certificados da sua empresa"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'inter-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.user_companies 
    WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
);

-- Política para DELETE
CREATE POLICY "Usuários podem deletar certificados da sua empresa"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'inter-certs' 
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.user_companies 
    WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
);