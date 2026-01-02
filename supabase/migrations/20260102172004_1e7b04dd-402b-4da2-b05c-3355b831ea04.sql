-- Tabela para guardar snapshot dos clientes do Field Control
CREATE TABLE public.field_customers_snapshot (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  field_id text NOT NULL,
  name text,
  document text,
  location_name text,
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  full_address text,
  latitude numeric,
  longitude numeric,
  raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, field_id)
);

-- Tabela para guardar o resultado do matching (candidatos)
CREATE TABLE public.field_matching_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wai_customer_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  field_candidate_id text,
  match_score integer NOT NULL DEFAULT 0,
  match_reason text,
  match_status text NOT NULL DEFAULT 'PENDING',
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, wai_customer_id)
);

-- RLS para field_customers_snapshot
ALTER TABLE public.field_customers_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários acessam field_customers_snapshot da empresa"
ON public.field_customers_snapshot FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- RLS para field_matching_results
ALTER TABLE public.field_matching_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários acessam field_matching_results da empresa"
ON public.field_matching_results FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Índices
CREATE INDEX idx_field_customers_snapshot_company ON public.field_customers_snapshot(company_id);
CREATE INDEX idx_field_customers_snapshot_document ON public.field_customers_snapshot(document);
CREATE INDEX idx_field_matching_results_company ON public.field_matching_results(company_id);
CREATE INDEX idx_field_matching_results_status ON public.field_matching_results(match_status);