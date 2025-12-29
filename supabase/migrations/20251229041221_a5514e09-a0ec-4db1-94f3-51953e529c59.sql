-- Drop table if partially created
DROP TABLE IF EXISTS public.pessoa_historico;
DROP TABLE IF EXISTS public.pessoa_contatos;
DROP TABLE IF EXISTS public.pessoas CASCADE;

-- Create unified pessoas table
CREATE TABLE public.pessoas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  
  -- Identification
  tipo_pessoa public.tipo_pessoa NOT NULL DEFAULT 'PJ',
  cpf_cnpj text,
  razao_social text,
  nome_fantasia text,
  
  -- Contact
  email text,
  telefone text,
  
  -- Address
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  
  -- Fiscal data
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario public.regime_tributario,
  contribuinte_icms boolean DEFAULT false,
  retencao_impostos boolean DEFAULT false,
  cnae_principal text,
  situacao_cadastral text,
  data_abertura date,
  observacoes_fiscais text,
  
  -- Commercial data
  tipo_cliente public.tipo_cliente_comercial DEFAULT 'avulso',
  limite_credito numeric,
  condicao_pagamento text,
  responsavel_comercial text,
  observacoes_comerciais text,
  
  -- Operational data
  responsavel_tecnico text,
  sla_padrao text,
  observacoes_internas text,
  
  -- Role flags
  is_cliente boolean NOT NULL DEFAULT false,
  is_fornecedor boolean NOT NULL DEFAULT false,
  is_colaborador boolean NOT NULL DEFAULT false,
  is_transportadora boolean NOT NULL DEFAULT false,
  
  -- Collaborator specific fields
  cargo text,
  departamento text,
  data_admissao date,
  data_demissao date,
  salario numeric,
  comissao_percentual numeric,
  auth_id uuid,
  
  -- Status
  status public.cliente_status NOT NULL DEFAULT 'ativo',
  is_active boolean NOT NULL DEFAULT true,
  
  -- Audit
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para pessoas" ON public.pessoas
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_pessoas_cpf_cnpj ON public.pessoas(cpf_cnpj);
CREATE INDEX idx_pessoas_razao_social ON public.pessoas(razao_social);
CREATE INDEX idx_pessoas_is_cliente ON public.pessoas(is_cliente) WHERE is_cliente = true;
CREATE INDEX idx_pessoas_is_fornecedor ON public.pessoas(is_fornecedor) WHERE is_fornecedor = true;
CREATE INDEX idx_pessoas_is_colaborador ON public.pessoas(is_colaborador) WHERE is_colaborador = true;
CREATE INDEX idx_pessoas_is_transportadora ON public.pessoas(is_transportadora) WHERE is_transportadora = true;

-- Migrate data from clientes
INSERT INTO public.pessoas (
  id, tipo_pessoa, cpf_cnpj, razao_social, nome_fantasia,
  email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado,
  inscricao_estadual, inscricao_municipal, regime_tributario, contribuinte_icms,
  retencao_impostos, cnae_principal, situacao_cadastral, data_abertura,
  observacoes_fiscais, tipo_cliente, limite_credito, condicao_pagamento,
  responsavel_comercial, observacoes_comerciais, responsavel_tecnico,
  sla_padrao, observacoes_internas, is_cliente, status,
  created_at, updated_at, created_by, updated_by
)
SELECT 
  id, tipo_pessoa, cpf_cnpj, razao_social, nome_fantasia,
  email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado,
  inscricao_estadual, inscricao_municipal, regime_tributario, contribuinte_icms,
  retencao_impostos, cnae_principal, situacao_cadastral, data_abertura,
  observacoes_fiscais, tipo_cliente, limite_credito, condicao_pagamento,
  responsavel_comercial, observacoes_comerciais, responsavel_tecnico,
  sla_padrao, observacoes_internas, true, status,
  created_at, updated_at, created_by, updated_by
FROM public.clientes;

-- Migrate data from suppliers (cast tipo_pessoa to enum)
INSERT INTO public.pessoas (
  tipo_pessoa, cpf_cnpj, razao_social, nome_fantasia,
  email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado,
  inscricao_estadual, inscricao_municipal, is_fornecedor, is_active,
  observacoes_internas, created_at, updated_at
)
SELECT 
  COALESCE(tipo_pessoa::public.tipo_pessoa, 'PJ'), cpf_cnpj, razao_social, nome_fantasia,
  email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado,
  inscricao_estadual, inscricao_municipal, true, is_active,
  observacoes, created_at, updated_at
FROM public.suppliers s
WHERE NOT EXISTS (
  SELECT 1 FROM public.pessoas p WHERE p.cpf_cnpj = s.cpf_cnpj AND s.cpf_cnpj IS NOT NULL
);

-- Update existing pessoas that are also suppliers
UPDATE public.pessoas p
SET is_fornecedor = true
FROM public.suppliers s
WHERE p.cpf_cnpj = s.cpf_cnpj AND s.cpf_cnpj IS NOT NULL;

-- Migrate data from users to pessoas (collaborators)
INSERT INTO public.pessoas (
  tipo_pessoa, razao_social, email,
  cargo, is_colaborador, auth_id, is_active,
  created_at, updated_at
)
SELECT 
  'PF', name, email,
  role::text, true, auth_id, is_active,
  created_at, updated_at
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.pessoas p WHERE p.email = u.email AND u.email IS NOT NULL
);

-- Update existing pessoas that are also users/collaborators
UPDATE public.pessoas p
SET 
  is_colaborador = true,
  auth_id = u.auth_id,
  cargo = COALESCE(p.cargo, u.role::text)
FROM public.users u
WHERE p.email = u.email AND u.email IS NOT NULL;

-- Create pessoa_contatos table
CREATE TABLE public.pessoa_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  nome text,
  cargo text,
  telefone text,
  email text,
  principal boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoa_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para pessoa_contatos" ON public.pessoa_contatos
  FOR ALL USING (true) WITH CHECK (true);

-- Migrate cliente_contatos
INSERT INTO public.pessoa_contatos (pessoa_id, nome, cargo, telefone, email, principal, created_at, updated_at)
SELECT cliente_id, nome, cargo, telefone, email, principal, created_at, updated_at
FROM public.cliente_contatos;

-- Create pessoa_historico table
CREATE TABLE public.pessoa_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  campo_alterado text NOT NULL,
  valor_anterior text,
  valor_novo text,
  usuario_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoa_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para pessoa_historico" ON public.pessoa_historico
  FOR ALL USING (true) WITH CHECK (true);

-- Migrate cliente_historico
INSERT INTO public.pessoa_historico (pessoa_id, campo_alterado, valor_anterior, valor_novo, usuario_id, created_at)
SELECT cliente_id, campo_alterado, valor_anterior, valor_novo, usuario_id, created_at
FROM public.cliente_historico;

-- Add triggers
CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pessoa_contatos_updated_at
  BEFORE UPDATE ON public.pessoa_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();