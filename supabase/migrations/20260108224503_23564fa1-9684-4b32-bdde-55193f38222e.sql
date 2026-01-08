
-- Tabela de unidades do cliente
CREATE TABLE public.client_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  address TEXT,
  integration_validity_days INTEGER DEFAULT 365,
  requires_local_integration BOOLEAN DEFAULT false,
  access_email_to TEXT[] DEFAULT '{}',
  access_email_cc TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Requisitos documentais por unidade
CREATE TABLE public.unit_policy_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.client_units(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE CASCADE,
  required_for TEXT NOT NULL CHECK (required_for IN ('COMPANY', 'TECHNICIAN')),
  is_required BOOLEAN DEFAULT true,
  applies_to_role TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, document_type_id, required_for)
);

-- Registro de integração local por técnico/unidade
CREATE TABLE public.unit_integration_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.client_units(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.rh_colaboradores(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_date DATE NOT NULL,
  expires_at DATE,
  certificate_file_url TEXT,
  certificate_file_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, technician_id)
);

-- Kit de acesso gerado
CREATE TABLE public.access_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.client_units(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  technician_ids UUID[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'SENT')),
  zip_file_url TEXT,
  zip_file_name TEXT,
  files_manifest JSONB DEFAULT '[]',
  sent_to TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_message_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auditoria de blindagem
CREATE TABLE public.access_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payload JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.client_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_policy_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_integration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage client_units for their company" ON public.client_units
  FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage unit_policy_requirements" ON public.unit_policy_requirements
  FOR ALL USING (unit_id IN (SELECT id FROM public.client_units WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

CREATE POLICY "Users can manage unit_integration_records for their company" ON public.unit_integration_records
  FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage access_kits for their company" ON public.access_kits
  FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage access_audit_logs for their company" ON public.access_audit_logs
  FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_client_units_updated_at
  BEFORE UPDATE ON public.client_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unit_integration_records_updated_at
  BEFORE UPDATE ON public.unit_integration_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
