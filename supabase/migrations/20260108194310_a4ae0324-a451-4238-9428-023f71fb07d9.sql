
-- Tabela principal de chamados
CREATE TABLE IF NOT EXISTS public.chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  os_numero text NOT NULL,
  os_data date,
  distrito text,
  tecnico_nome text,
  cliente_codigo text,
  cliente_nome text,
  tra_nome text,
  client_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  service_order_id uuid REFERENCES public.service_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_execucao', 'concluido', 'cancelado')),
  imported_from text NOT NULL DEFAULT 'excel',
  imported_at timestamptz DEFAULT now(),
  imported_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, os_numero)
);

-- Tabela de logs/auditoria dos chamados
CREATE TABLE IF NOT EXISTS public.chamado_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  action text NOT NULL,
  metadata jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chamados_company ON public.chamados(company_id);
CREATE INDEX IF NOT EXISTS idx_chamados_status ON public.chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_os_numero ON public.chamados(os_numero);
CREATE INDEX IF NOT EXISTS idx_chamados_client ON public.chamados(client_id);
CREATE INDEX IF NOT EXISTS idx_chamado_logs_chamado ON public.chamado_logs(chamado_id);

-- RLS para chamados
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chamados from their companies"
  ON public.chamados FOR SELECT
  USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert chamados to their companies"
  ON public.chamados FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can update chamados from their companies"
  ON public.chamados FOR UPDATE
  USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can delete chamados from their companies"
  ON public.chamados FOR DELETE
  USING (company_id IN (SELECT get_user_companies()));

-- RLS para chamado_logs
ALTER TABLE public.chamado_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chamado_logs from their companies"
  ON public.chamado_logs FOR SELECT
  USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert chamado_logs to their companies"
  ON public.chamado_logs FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_companies()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_chamados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION update_chamados_updated_at();
