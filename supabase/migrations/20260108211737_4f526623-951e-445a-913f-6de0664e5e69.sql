-- Tabela de Colaboradores (Técnicos)
CREATE TABLE public.rh_colaboradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Documentos dos Colaboradores
CREATE TABLE public.rh_documentos_colaborador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.rh_colaboradores(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  data_emissao TIMESTAMP WITH TIME ZONE,
  data_vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Integrações (Técnico + Unidade/Cliente)
CREATE TABLE public.rh_integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.rh_colaboradores(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_integracao TIMESTAMP WITH TIME ZONE NOT NULL,
  data_vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
  observacoes TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_rh_colaboradores_company ON public.rh_colaboradores(company_id);
CREATE INDEX idx_rh_documentos_colaborador ON public.rh_documentos_colaborador(colaborador_id);
CREATE INDEX idx_rh_integracoes_colaborador ON public.rh_integracoes(colaborador_id);
CREATE INDEX idx_rh_integracoes_cliente ON public.rh_integracoes(cliente_id);

-- Enable RLS
ALTER TABLE public.rh_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_documentos_colaborador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rh_integracoes ENABLE ROW LEVEL SECURITY;

-- Policies para rh_colaboradores
CREATE POLICY "Users can view colaboradores of their company" 
ON public.rh_colaboradores FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert colaboradores in their company" 
ON public.rh_colaboradores FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update colaboradores in their company" 
ON public.rh_colaboradores FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete colaboradores in their company" 
ON public.rh_colaboradores FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Policies para rh_documentos_colaborador
CREATE POLICY "Users can view documentos of their company" 
ON public.rh_documentos_colaborador FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert documentos in their company" 
ON public.rh_documentos_colaborador FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update documentos in their company" 
ON public.rh_documentos_colaborador FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete documentos in their company" 
ON public.rh_documentos_colaborador FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Policies para rh_integracoes
CREATE POLICY "Users can view integracoes of their company" 
ON public.rh_integracoes FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert integracoes in their company" 
ON public.rh_integracoes FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update integracoes in their company" 
ON public.rh_integracoes FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete integracoes in their company" 
ON public.rh_integracoes FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_rh_colaboradores_updated_at
BEFORE UPDATE ON public.rh_colaboradores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rh_documentos_colaborador_updated_at
BEFORE UPDATE ON public.rh_documentos_colaborador
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rh_integracoes_updated_at
BEFORE UPDATE ON public.rh_integracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();