-- Criar tabela para rastrear IDs entre WAI ERP e Field Control
CREATE TABLE public.field_control_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'order', 'task')),
  wai_id UUID NOT NULL,
  field_id TEXT NOT NULL,
  last_sync TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices únicos
CREATE UNIQUE INDEX idx_field_control_sync_wai ON public.field_control_sync (company_id, entity_type, wai_id);
CREATE UNIQUE INDEX idx_field_control_sync_field ON public.field_control_sync (company_id, entity_type, field_id);

-- Índice para buscas por company_id
CREATE INDEX idx_field_control_sync_company ON public.field_control_sync (company_id);

-- Habilitar RLS
ALTER TABLE public.field_control_sync ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Usuários acessam field_control_sync da empresa"
  ON public.field_control_sync
  FOR ALL
  USING (company_id IN (SELECT get_user_companies()))
  WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Comentários
COMMENT ON TABLE public.field_control_sync IS 'Rastreamento de sincronização entre WAI ERP e Field Control';
COMMENT ON COLUMN public.field_control_sync.entity_type IS 'Tipo: customer, order, task';
COMMENT ON COLUMN public.field_control_sync.wai_id IS 'ID do registro no WAI ERP';
COMMENT ON COLUMN public.field_control_sync.field_id IS 'ID do registro no Field Control';