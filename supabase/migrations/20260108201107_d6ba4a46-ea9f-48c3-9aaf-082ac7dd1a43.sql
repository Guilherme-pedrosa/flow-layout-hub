-- Tabela de controle de importações (anti-sumiço de dados)
CREATE TABLE IF NOT EXISTS public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_hash text,
  file_size integer,
  rows_total integer DEFAULT 0,
  rows_imported integer DEFAULT 0,
  rows_failed integer DEFAULT 0,
  rows_duplicated integer DEFAULT 0,
  status text NOT NULL DEFAULT 'processing', -- processing | completed | failed
  error_log jsonb,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_import_batches_company ON public.import_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON public.import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_file_hash ON public.import_batches(file_hash);

-- RLS
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view import batches from their company"
  ON public.import_batches FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert import batches for their company"
  ON public.import_batches FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update import batches from their company"
  ON public.import_batches FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Adicionar coluna import_batch_id na tabela chamados (se não existir)
ALTER TABLE public.chamados 
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id),
  ADD COLUMN IF NOT EXISTS raw_excel_data jsonb,
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'normal';

-- Índice para rastreabilidade
CREATE INDEX IF NOT EXISTS idx_chamados_import_batch ON public.chamados(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_chamados_external_ref ON public.chamados(external_reference);