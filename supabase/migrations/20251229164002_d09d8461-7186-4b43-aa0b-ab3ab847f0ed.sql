-- Criar bucket privado para certificados do Banco Inter
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('inter-certs', 'inter-certs', false, 52428800, ARRAY['application/x-x509-ca-cert', 'application/x-pem-file', 'application/octet-stream', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket inter-certs
CREATE POLICY "Usuários podem fazer upload de certificados da sua empresa"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inter-certs' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT company_id FROM public.users WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem ver certificados da sua empresa"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inter-certs' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT company_id FROM public.users WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar certificados da sua empresa"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inter-certs' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT company_id FROM public.users WHERE auth_id = auth.uid()
  )
);

-- Tabela: inter_credentials
-- Objetivo: Armazenar as credenciais de API do Banco Inter para cada empresa
CREATE TABLE public.inter_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    certificate_file_path text NOT NULL,
    private_key_file_path text NOT NULL,
    account_number text,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    UNIQUE (company_id)
);

-- Habilitar RLS
ALTER TABLE public.inter_credentials ENABLE ROW LEVEL SECURITY;

-- Política: Acesso baseado na empresa do usuário
CREATE POLICY "Acesso por company_id para inter_credentials"
ON public.inter_credentials
FOR ALL
USING (company_id IN (
    SELECT company_id FROM public.users WHERE auth_id = auth.uid()
))
WITH CHECK (company_id IN (
    SELECT company_id FROM public.users WHERE auth_id = auth.uid()
));

-- Trigger para updated_at
CREATE TRIGGER update_inter_credentials_updated_at
BEFORE UPDATE ON public.inter_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: bank_transactions
-- Objetivo: Armazenar o extrato bancário sincronizado para conciliação
CREATE TABLE public.bank_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid REFERENCES public.companies(id) NOT NULL,
    bank_account_id uuid REFERENCES public.bank_accounts(id),
    transaction_date date NOT NULL,
    description text,
    amount numeric(15, 2) NOT NULL,
    type text CHECK (type IN ('CREDIT', 'DEBIT')),
    nsu text,
    external_id text,
    category text,
    is_reconciled boolean DEFAULT FALSE NOT NULL,
    reconciled_at timestamp with time zone,
    reconciled_by uuid REFERENCES public.users(id),
    reconciled_with_id uuid,
    reconciled_with_type text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    UNIQUE (company_id, nsu)
);

-- Habilitar RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Política: Acesso baseado na empresa do usuário
CREATE POLICY "Acesso por company_id para bank_transactions"
ON public.bank_transactions
FOR ALL
USING (company_id IN (
    SELECT company_id FROM public.users WHERE auth_id = auth.uid()
))
WITH CHECK (company_id IN (
    SELECT company_id FROM public.users WHERE auth_id = auth.uid()
));

-- Trigger para updated_at
CREATE TRIGGER update_bank_transactions_updated_at
BEFORE UPDATE ON public.bank_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_bank_transactions_company_date ON public.bank_transactions(company_id, transaction_date);
CREATE INDEX idx_bank_transactions_reconciled ON public.bank_transactions(company_id, is_reconciled);
CREATE INDEX idx_inter_credentials_company ON public.inter_credentials(company_id);