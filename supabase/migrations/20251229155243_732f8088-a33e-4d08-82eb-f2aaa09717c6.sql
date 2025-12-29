-- Criar bucket para armazenar PDFs de checkout
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('checkout-receipts', 'checkout-receipts', true, 10485760, ARRAY['application/pdf']);

-- Policies para o bucket
CREATE POLICY "Permitir leitura pública de recibos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'checkout-receipts');

CREATE POLICY "Permitir upload de recibos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'checkout-receipts');

CREATE POLICY "Permitir atualização de recibos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'checkout-receipts');