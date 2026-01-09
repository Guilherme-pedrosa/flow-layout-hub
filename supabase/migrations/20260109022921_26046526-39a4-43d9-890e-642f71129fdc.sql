-- =============================================
-- INTEGRAÇÃO BANCÁRIA VIA API - WAI ERP
-- Tabelas multi-tenant com RLS
-- =============================================

-- 1) Conexões bancárias (providers)
CREATE TABLE public.bank_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pluggy', -- pluggy, belvo, openbanking, inter, etc.
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, error, revoked
  external_item_id TEXT, -- ID da conexão no provider
  access_token_encrypted TEXT, -- token criptografado (NUNCA plain)
  refresh_token_encrypted TEXT,
  connector_name TEXT, -- nome do banco (ex: "Banco Inter", "Nubank")
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- success, partial, error
  last_sync_error TEXT,
  sync_frequency_hours INTEGER DEFAULT 6,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Contas bancárias sincronizadas
CREATE TABLE public.bank_accounts_synced (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT,
  account_type TEXT DEFAULT 'checking', -- checking, savings, credit, investment
  currency TEXT DEFAULT 'BRL',
  current_balance NUMERIC(18,2) DEFAULT 0,
  available_balance NUMERIC(18,2),
  credit_limit NUMERIC(18,2),
  last_refreshed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, connection_id, external_account_id)
);

-- 3) Transações bancárias sincronizadas
CREATE TABLE public.bank_transactions_synced (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.bank_accounts_synced(id) ON DELETE CASCADE,
  external_tx_id TEXT NOT NULL,
  posted_at DATE NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL, -- positivo = entrada, negativo = saída
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  category TEXT,
  merchant TEXT,
  payment_method TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_with_id UUID,
  reconciled_with_type TEXT, -- payable, receivable
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, account_id, external_tx_id)
);

-- 4) Logs de sincronização
CREATE TABLE public.bank_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.bank_connections(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running, success, partial, error
  error_message TEXT,
  accounts_synced INTEGER DEFAULT 0,
  transactions_synced INTEGER DEFAULT 0,
  triggered_by TEXT, -- manual, cron, webhook
  triggered_by_user UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_bank_connections_company ON public.bank_connections(company_id);
CREATE INDEX idx_bank_connections_status ON public.bank_connections(status);
CREATE INDEX idx_bank_accounts_synced_company ON public.bank_accounts_synced(company_id);
CREATE INDEX idx_bank_accounts_synced_connection ON public.bank_accounts_synced(connection_id);
CREATE INDEX idx_bank_transactions_synced_company ON public.bank_transactions_synced(company_id);
CREATE INDEX idx_bank_transactions_synced_account ON public.bank_transactions_synced(account_id);
CREATE INDEX idx_bank_transactions_synced_date ON public.bank_transactions_synced(posted_at DESC);
CREATE INDEX idx_bank_sync_logs_company ON public.bank_sync_logs(company_id);

-- RLS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts_synced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions_synced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies para bank_connections
CREATE POLICY "Users can view their company bank connections" 
  ON public.bank_connections FOR SELECT 
  USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert bank connections for their company" 
  ON public.bank_connections FOR INSERT 
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company bank connections" 
  ON public.bank_connections FOR UPDATE 
  USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their company bank connections" 
  ON public.bank_connections FOR DELETE 
  USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

-- Policies para bank_accounts_synced
CREATE POLICY "Users can view their company synced accounts" 
  ON public.bank_accounts_synced FOR SELECT 
  USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage synced accounts" 
  ON public.bank_accounts_synced FOR ALL 
  USING (true);

-- Policies para bank_transactions_synced
CREATE POLICY "Users can view their company synced transactions" 
  ON public.bank_transactions_synced FOR SELECT 
  USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage synced transactions" 
  ON public.bank_transactions_synced FOR ALL 
  USING (true);

-- Policies para bank_sync_logs
CREATE POLICY "Users can view their company sync logs" 
  ON public.bank_sync_logs FOR SELECT 
  USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage sync logs" 
  ON public.bank_sync_logs FOR ALL 
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_synced_updated_at
  BEFORE UPDATE ON public.bank_accounts_synced
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();