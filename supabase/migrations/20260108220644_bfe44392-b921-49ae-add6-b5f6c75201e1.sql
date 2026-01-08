-- Tabela para histórico de envios de documentação
CREATE TABLE public.cliente_envios_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.rh_colaboradores(id) ON DELETE CASCADE,
  enviado_por UUID REFERENCES public.users(id),
  enviado_por_nome TEXT,
  destinatario_email TEXT NOT NULL,
  assunto TEXT NOT NULL,
  documentos_enviados JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'enviado',
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_cliente_envios_docs_cliente ON public.cliente_envios_docs(cliente_id);
CREATE INDEX idx_cliente_envios_docs_colaborador ON public.cliente_envios_docs(colaborador_id);
CREATE INDEX idx_cliente_envios_docs_created ON public.cliente_envios_docs(created_at DESC);

-- RLS
ALTER TABLE public.cliente_envios_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view envios from their company"
ON public.cliente_envios_docs FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert envios for their company"
ON public.cliente_envios_docs FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));