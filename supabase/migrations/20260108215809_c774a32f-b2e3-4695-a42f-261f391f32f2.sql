-- Bucket para documentos de colaboradores (ASO, NRs, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('colaborador-docs', 'colaborador-docs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket
CREATE POLICY "Authenticated users can upload colaborador docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'colaborador-docs');

CREATE POLICY "Authenticated users can update colaborador docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'colaborador-docs');

CREATE POLICY "Anyone can view colaborador docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'colaborador-docs');

CREATE POLICY "Authenticated users can delete colaborador docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'colaborador-docs');