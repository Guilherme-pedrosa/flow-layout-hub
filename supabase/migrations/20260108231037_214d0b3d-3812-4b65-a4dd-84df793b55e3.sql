-- Tabela de requisitos de documentação por cliente
CREATE TABLE public.client_document_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
  required_for TEXT NOT NULL CHECK (required_for IN ('COMPANY', 'TECHNICIAN')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, document_type_id, required_for)
);

-- RLS
ALTER TABLE public.client_document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view client requirements of their company"
ON public.client_document_requirements FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert client requirements for their company"
ON public.client_document_requirements FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update client requirements of their company"
ON public.client_document_requirements FOR UPDATE
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete client requirements of their company"
ON public.client_document_requirements FOR DELETE
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_client_document_requirements_updated_at
BEFORE UPDATE ON public.client_document_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();