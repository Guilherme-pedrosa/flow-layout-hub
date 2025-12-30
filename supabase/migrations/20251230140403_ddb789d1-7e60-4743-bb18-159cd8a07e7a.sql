-- ETAPA 2: Funções e tabelas adicionais

-- Função para verificar se usuário pertence à empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- Função para obter empresas do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uc.company_id 
  FROM public.user_companies uc
  JOIN public.users u ON u.id = uc.user_id
  WHERE u.auth_id = auth.uid()
$$;

-- Tabela de formas de pagamento por empresa
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'outros',
  is_active boolean NOT NULL DEFAULT true,
  receives_in_company_id uuid REFERENCES public.companies(id),
  auto_transfer_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_company ON public.payment_methods(company_id);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para payment_methods"
ON public.payment_methods FOR ALL
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de transferências inter-empresa
CREATE TABLE public.inter_company_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_company_id uuid NOT NULL REFERENCES public.companies(id),
  target_company_id uuid NOT NULL REFERENCES public.companies(id),
  amount numeric NOT NULL,
  reference_type text NOT NULL,
  reference_id uuid,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.inter_company_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para inter_company_transfers"
ON public.inter_company_transfers FOR ALL
USING (true)
WITH CHECK (true);