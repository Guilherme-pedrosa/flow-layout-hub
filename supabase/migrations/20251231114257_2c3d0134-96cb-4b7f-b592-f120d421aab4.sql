
-- 1. REMOVER TODAS as políticas do bucket inter-certs
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%inter%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 2. CRIAR políticas SIMPLES que funcionam (sem subqueries complexas)
-- SELECT
CREATE POLICY "inter_certs_select_v2"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inter-certs');

-- INSERT
CREATE POLICY "inter_certs_insert_v2"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inter-certs');

-- UPDATE
CREATE POLICY "inter_certs_update_v2"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inter-certs')
WITH CHECK (bucket_id = 'inter-certs');

-- DELETE
CREATE POLICY "inter_certs_delete_v2"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inter-certs');
