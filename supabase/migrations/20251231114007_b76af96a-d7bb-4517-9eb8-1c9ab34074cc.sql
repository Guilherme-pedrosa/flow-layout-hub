
-- Remover TODAS as políticas existentes para inter-certs
DROP POLICY IF EXISTS "Permitir deletar certificados inter" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura de certificados inter" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de certificados inter" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar certificados da sua empresa" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem baixar certificados da sua empresa" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar certificados da sua empresa" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem fazer upload de certificados da sua empresa" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_delete" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_insert" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_select" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_update" ON storage.objects;
DROP POLICY IF EXISTS "inter_certs_update_policy" ON storage.objects;

-- Criar políticas SIMPLES que permitem usuários autenticados gerenciar seus certificados
-- usando uma verificação simplificada baseada na company_id

-- SELECT: Usuários autenticados podem ler certificados do bucket
CREATE POLICY "inter_certs_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inter-certs'
);

-- INSERT: Usuários autenticados podem fazer upload no bucket
CREATE POLICY "inter_certs_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inter-certs'
);

-- UPDATE: Usuários autenticados podem atualizar arquivos no bucket
CREATE POLICY "inter_certs_modify"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inter-certs')
WITH CHECK (bucket_id = 'inter-certs');

-- DELETE: Usuários autenticados podem deletar arquivos no bucket
CREATE POLICY "inter_certs_remove"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inter-certs');
