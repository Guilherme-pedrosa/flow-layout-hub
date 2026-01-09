
-- =============================================
-- TABELA: integrations (registra validações de kits de documentação)
-- =============================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  unit_id uuid NULL REFERENCES client_units(id) ON DELETE SET NULL,
  technician_ids uuid[] NOT NULL DEFAULT '{}',
  
  -- Status workflow
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'blocked', 'authorized', 'sent', 'expired')),
  
  -- Dados de validação
  validated_at timestamptz NULL,
  validated_by uuid NULL REFERENCES users(id),
  blocked_reasons jsonb NOT NULL DEFAULT '[]',
  
  -- Dados do ZIP gerado
  zip_url text NULL,
  zip_file_name text NULL,
  manifest jsonb NULL,
  
  -- Dados de envio
  sent_at timestamptz NULL,
  sent_to text[] NULL,
  sent_by uuid NULL REFERENCES users(id),
  
  -- Controle de expiração
  earliest_expiry_date date NULL,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_integrations_company_id ON public.integrations(company_id);
CREATE INDEX idx_integrations_client_id ON public.integrations(client_id);
CREATE INDEX idx_integrations_status ON public.integrations(status);
CREATE INDEX idx_integrations_earliest_expiry ON public.integrations(earliest_expiry_date) WHERE earliest_expiry_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view integrations of their companies"
ON public.integrations FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert integrations for their companies"
ON public.integrations FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can update integrations of their companies"
ON public.integrations FOR UPDATE
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can delete integrations of their companies"
ON public.integrations FOR DELETE
USING (company_id IN (SELECT get_user_companies()));

-- Trigger para updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_chamados_updated_at();

-- =============================================
-- TABELA: integration_audit_logs (log de ações no módulo)
-- =============================================
CREATE TABLE IF NOT EXISTS public.integration_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id uuid NULL REFERENCES integrations(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NULL,
  performed_by uuid NULL REFERENCES users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_audit_logs_company ON public.integration_audit_logs(company_id);
CREATE INDEX idx_integration_audit_logs_integration ON public.integration_audit_logs(integration_id) WHERE integration_id IS NOT NULL;
CREATE INDEX idx_integration_audit_logs_event_type ON public.integration_audit_logs(event_type);

ALTER TABLE public.integration_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs of their companies"
ON public.integration_audit_logs FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert audit logs for their companies"
ON public.integration_audit_logs FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- =============================================
-- FUNÇÃO: Registrar evento de auditoria
-- =============================================
CREATE OR REPLACE FUNCTION log_integration_event(
  p_company_id uuid,
  p_integration_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT NULL,
  p_performed_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO integration_audit_logs (company_id, integration_id, event_type, event_data, performed_by)
  VALUES (p_company_id, p_integration_id, p_event_type, p_event_data, p_performed_by);
END;
$$;
