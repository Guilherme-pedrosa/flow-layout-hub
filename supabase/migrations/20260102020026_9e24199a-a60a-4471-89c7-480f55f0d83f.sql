-- Criar bucket para fotos de equipamentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para visualização pública
CREATE POLICY "Fotos de equipamentos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-images');

-- Policy para upload por usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'equipment-images' AND auth.uid() IS NOT NULL);

-- Policy para atualização
CREATE POLICY "Usuários autenticados podem atualizar fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'equipment-images' AND auth.uid() IS NOT NULL);

-- Policy para delete
CREATE POLICY "Usuários autenticados podem deletar fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'equipment-images' AND auth.uid() IS NOT NULL);