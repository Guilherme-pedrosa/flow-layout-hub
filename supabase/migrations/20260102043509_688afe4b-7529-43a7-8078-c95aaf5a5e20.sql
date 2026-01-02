-- Tabela de eventos de auditoria detalhada
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id),
  actor_auth_id UUID,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  source TEXT DEFAULT 'app', -- app | api | system
  ip TEXT,
  user_agent TEXT,
  diff JSONB,        -- o que mudou (antes/depois)
  payload JSONB,     -- contexto mínimo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_audit_events_company_created ON public.audit_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON public.audit_events(event_type);

-- RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view audit events from their companies"
  ON public.audit_events FOR SELECT
  USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Service role can insert audit events"
  ON public.audit_events FOR INSERT
  WITH CHECK (true);