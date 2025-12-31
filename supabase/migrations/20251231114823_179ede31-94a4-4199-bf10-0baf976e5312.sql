
-- REMOVER políticas existentes
DROP POLICY IF EXISTS "inter_certs_select_v2" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_insert_v2" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_update_v2" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_delete_v2" ON storage.objects;

-- Criar políticas que funcionam com o Storage Admin
-- Usar PUBLIC ao invés de authenticated, já que o storage usa service role

-- SELECT
CREATE POLICY "inter_certs_select_final"
ON storage.objects FOR SELECT
USING (bucket_id = 'inter-certs');

-- INSERT  
CREATE POLICY "inter_certs_insert_final"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inter-certs');

-- UPDATE
CREATE POLICY "inter_certs_update_final"
ON storage.objects FOR UPDATE
USING (bucket_id = 'inter-certs')
WITH CHECK (bucket_id = 'inter-certs');

-- DELETE
CREATE POLICY "inter_certs_delete_final"
ON storage.objects FOR DELETE
USING (bucket_id = 'inter-certs');
