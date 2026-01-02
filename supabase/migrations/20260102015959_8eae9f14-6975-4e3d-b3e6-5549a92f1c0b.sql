-- Adicionar coluna para foto do equipamento
ALTER TABLE public.equipments 
ADD COLUMN IF NOT EXISTS image_url text;

-- Comentário explicativo
COMMENT ON COLUMN public.equipments.image_url IS 'URL da foto do equipamento no storage';