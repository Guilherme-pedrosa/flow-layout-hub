-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for company-documents bucket
CREATE POLICY "Users can upload company documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view company documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-documents' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete company documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-documents' 
  AND auth.role() = 'authenticated'
);