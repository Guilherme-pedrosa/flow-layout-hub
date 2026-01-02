-- Adicionar coluna external_id para guardar o ID original do sistema de origem (Gestão Click, etc)
ALTER TABLE public.pessoas
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Criar índice para buscas rápidas pelo external_id
CREATE INDEX IF NOT EXISTS idx_pessoas_external_id ON public.pessoas(company_id, external_id);

COMMENT ON COLUMN public.pessoas.external_id IS 'ID original do sistema de origem (ex: Gestão Click) para identificar registros únicos durante importação';