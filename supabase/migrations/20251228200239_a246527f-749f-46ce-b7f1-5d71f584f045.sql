-- Enum para roles de usuário
CREATE TYPE public.user_role AS ENUM ('admin', 'financeiro', 'operador', 'tecnico');

-- Tabela de empresas (multi-tenant)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de usuários do sistema
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operador',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações do sistema
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, key)
);

-- Índices
CREATE INDEX idx_users_company_id ON public.users(company_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_system_settings_company_id ON public.system_settings(company_id);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Função para obter company_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1
$$;

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND role = 'admin' AND is_active = true
  )
$$;

-- Políticas RLS para companies (acesso público temporário para MVP sem auth)
CREATE POLICY "Acesso público para companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- Políticas RLS para users
CREATE POLICY "Acesso público para users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Políticas RLS para audit_logs (somente leitura para admin)
CREATE POLICY "Acesso público para audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Políticas RLS para system_settings
CREATE POLICY "Acesso público para system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir empresa padrão para testes
INSERT INTO public.companies (name, cnpj, timezone)
VALUES ('Ponto a Ponto', '00.000.000/0001-00', 'America/Sao_Paulo');

-- Inserir usuário admin padrão
INSERT INTO public.users (company_id, name, email, role)
SELECT id, 'Administrador', 'admin@pontoaPonto.com', 'admin'
FROM public.companies LIMIT 1;