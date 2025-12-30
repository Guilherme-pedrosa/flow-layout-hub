-- Adicionar campo account_nature para diferenciar contas Sintéticas (grupos) e Analíticas (lançamentos)
-- Conforme especificação WeDo ERP v3.2 - Prompt 0.1

-- Criar enum para natureza da conta
DO $$ BEGIN
    CREATE TYPE account_nature AS ENUM ('sintetica', 'analitica');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna account_nature à tabela chart_of_accounts
ALTER TABLE public.chart_of_accounts 
ADD COLUMN IF NOT EXISTS account_nature account_nature NOT NULL DEFAULT 'analitica';

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.chart_of_accounts.account_nature IS 'Natureza da conta: sintetica (grupo) ou analitica (recebe lançamentos)';