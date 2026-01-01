-- Criar tabela extract_rules para regras de extrato bancário
CREATE TABLE public.extract_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  search_text TEXT NOT NULL,
  supplier_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice único para evitar regras duplicadas por empresa
CREATE UNIQUE INDEX extract_rules_company_search_unique ON public.extract_rules(company_id, search_text);

-- Índice para busca rápida por empresa
CREATE INDEX extract_rules_company_id_idx ON public.extract_rules(company_id);

-- Enable RLS
ALTER TABLE public.extract_rules ENABLE ROW LEVEL SECURITY;

-- Política RLS para usuários acessarem regras da empresa
CREATE POLICY "Usuários acessam extract_rules da empresa"
  ON public.extract_rules
  FOR ALL
  USING (company_id IN (SELECT get_user_companies()))
  WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_extract_rules_updated_at
  BEFORE UPDATE ON public.extract_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC para incrementar contador de uso da regra
CREATE OR REPLACE FUNCTION public.increment_rule_usage(rule_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE extract_rules
  SET times_used = times_used + 1,
      updated_at = now()
  WHERE id = rule_id;
END;
$$;