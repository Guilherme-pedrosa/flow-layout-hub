-- Create storage bucket for sale attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('sale-attachments', 'sale-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for sale attachments
CREATE POLICY "Permitir leitura de anexos de vendas"
ON storage.objects FOR SELECT
USING (bucket_id = 'sale-attachments');

CREATE POLICY "Permitir upload de anexos de vendas"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sale-attachments');

CREATE POLICY "Permitir exclusão de anexos de vendas"
ON storage.objects FOR DELETE
USING (bucket_id = 'sale-attachments');