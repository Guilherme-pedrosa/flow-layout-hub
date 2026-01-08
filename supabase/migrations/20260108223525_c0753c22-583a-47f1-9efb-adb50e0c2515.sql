-- =============================================
-- FASE 1: FUNDAÇÃO DO MÓDULO DE BLINDAGEM
-- =============================================

-- 1. Catálogo de Tipos de Documento
CREATE TABLE public.document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('COMPANY', 'TECHNICIAN')),
  requires_expiry BOOLEAN NOT NULL DEFAULT false,
  default_validity_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Documentos Globais da Empresa (WeDo)
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  expires_at DATE,
  version TEXT,
  notes TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, document_type_id)
);

-- 3. Documentos Globais do Técnico (expandindo colaborador_docs existente)
-- Vamos criar uma nova tabela mais robusta
CREATE TABLE public.technician_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.rh_colaboradores(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  expires_at DATE,
  notes TEXT,
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(technician_id, document_type_id)
);

-- RLS para document_types
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document types of their company"
  ON public.document_types FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage document types of their company"
  ON public.document_types FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- RLS para company_documents
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company documents of their company"
  ON public.company_documents FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage company documents of their company"
  ON public.company_documents FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- RLS para technician_documents
ALTER TABLE public.technician_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view technician documents of their company"
  ON public.technician_documents FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage technician documents of their company"
  ON public.technician_documents FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_document_types_updated_at
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technician_documents_updated_at
  BEFORE UPDATE ON public.technician_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_document_types_company ON public.document_types(company_id);
CREATE INDEX idx_document_types_scope ON public.document_types(scope);
CREATE INDEX idx_company_documents_company ON public.company_documents(company_id);
CREATE INDEX idx_company_documents_expires ON public.company_documents(expires_at);
CREATE INDEX idx_technician_documents_technician ON public.technician_documents(technician_id);
CREATE INDEX idx_technician_documents_expires ON public.technician_documents(expires_at);

-- Inserir tipos de documento padrão (seed)
-- Será feito via INSERT após aprovação da migration