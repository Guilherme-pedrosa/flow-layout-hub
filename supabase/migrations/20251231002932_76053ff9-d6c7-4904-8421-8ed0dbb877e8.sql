-- Tabela de endereços para pessoas (fornecedores, clientes, etc.)
CREATE TABLE public.pessoa_enderecos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_endereco TEXT NOT NULL DEFAULT 'principal', -- principal, cobranca, entrega
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  is_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de dados bancários do fornecedor
CREATE TABLE public.supplier_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT DEFAULT 'corrente', -- corrente, poupanca
  pix_key TEXT,
  pix_key_type TEXT, -- cpf, cnpj, email, telefone, aleatorio
  is_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_pessoa_enderecos_pessoa_id ON public.pessoa_enderecos(pessoa_id);
CREATE INDEX idx_supplier_bank_accounts_pessoa_id ON public.supplier_bank_accounts(pessoa_id);

-- Habilitar RLS
ALTER TABLE public.pessoa_enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Acesso público para pessoa_enderecos" ON public.pessoa_enderecos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso público para supplier_bank_accounts" ON public.supplier_bank_accounts
  FOR ALL USING (true) WITH CHECK (true);