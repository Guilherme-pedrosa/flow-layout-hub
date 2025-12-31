-- Drop existing policies for inter-certs bucket if they exist
DROP POLICY IF EXISTS "Users can view inter-certs for their companies" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload inter-certs for their companies" ON storage.objects;
DROP POLICY IF EXISTS "Users can update inter-certs for their companies" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete inter-certs for their companies" ON storage.objects;

-- Create policies that allow access based on company_id in the file path
-- The file path format is: {company_id}/filename

-- SELECT policy
CREATE POLICY "inter_certs_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inter-certs' 
  AND public.user_belongs_to_company(
    (SELECT u.id FROM public.users u WHERE u.auth_id = auth.uid()),
    (storage.foldername(name))[1]::uuid
  )
);

-- INSERT policy
CREATE POLICY "inter_certs_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inter-certs'
  AND public.user_belongs_to_company(
    (SELECT u.id FROM public.users u WHERE u.auth_id = auth.uid()),
    (storage.foldername(name))[1]::uuid
  )
);

-- UPDATE policy
CREATE POLICY "inter_certs_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inter-certs'
  AND public.user_belongs_to_company(
    (SELECT u.id FROM public.users u WHERE u.auth_id = auth.uid()),
    (storage.foldername(name))[1]::uuid
  )
);

-- DELETE policy
CREATE POLICY "inter_certs_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inter-certs'
  AND public.user_belongs_to_company(
    (SELECT u.id FROM public.users u WHERE u.auth_id = auth.uid()),
    (storage.foldername(name))[1]::uuid
  )
);