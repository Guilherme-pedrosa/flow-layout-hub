-- Adicionar campo para código do Auvo na tabela pessoas
ALTER TABLE public.pessoas 
ADD COLUMN IF NOT EXISTS auvo_codigo TEXT;

-- Criar índice para busca rápida por código Auvo
CREATE INDEX IF NOT EXISTS idx_pessoas_auvo_codigo ON public.pessoas(auvo_codigo) WHERE auvo_codigo IS NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.pessoas.auvo_codigo IS 'Código único do cliente no sistema Auvo';