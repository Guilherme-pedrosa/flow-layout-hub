-- Enum para tipo de cliente
CREATE TYPE public.tipo_pessoa AS ENUM ('PF', 'PJ');

-- Enum para status do cliente
CREATE TYPE public.cliente_status AS ENUM ('ativo', 'inativo', 'bloqueado');

-- Enum para tipo de cliente comercial
CREATE TYPE public.tipo_cliente_comercial AS ENUM ('avulso', 'contrato', 'grande_conta');

-- Enum para regime tributário
CREATE TYPE public.regime_tributario AS ENUM ('simples_nacional', 'lucro_presumido', 'lucro_real', 'mei');

-- Tabela principal de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Tipo de pessoa
  tipo_pessoa tipo_pessoa NOT NULL DEFAULT 'PJ',
  
  -- Dados cadastrais
  razao_social TEXT,
  nome_fantasia TEXT,
  cpf_cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  email TEXT,
  telefone TEXT,
  
  -- Dados da consulta CNPJ
  situacao_cadastral TEXT,
  data_abertura DATE,
  cnae_principal TEXT,
  
  -- Endereço
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  
  -- Configurações comerciais
  condicao_pagamento TEXT,
  limite_credito DECIMAL(15,2),
  tipo_cliente tipo_cliente_comercial DEFAULT 'avulso',
  observacoes_comerciais TEXT,
  
  -- Configurações operacionais
  responsavel_comercial TEXT,
  responsavel_tecnico TEXT,
  sla_padrao TEXT,
  observacoes_internas TEXT,
  
  -- Configurações fiscais
  regime_tributario regime_tributario,
  contribuinte_icms BOOLEAN DEFAULT false,
  retencao_impostos BOOLEAN DEFAULT false,
  observacoes_fiscais TEXT,
  
  -- Status
  status cliente_status NOT NULL DEFAULT 'ativo',
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Tabela de contatos do cliente
CREATE TABLE public.cliente_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  principal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de alterações
CREATE TABLE public.cliente_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);
CREATE INDEX idx_clientes_status ON public.clientes(status);
CREATE INDEX idx_clientes_razao_social ON public.clientes(razao_social);
CREATE INDEX idx_cliente_contatos_cliente_id ON public.cliente_contatos(cliente_id);
CREATE INDEX idx_cliente_historico_cliente_id ON public.cliente_historico(cliente_id);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_historico ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - acesso público por enquanto (sem auth implementado ainda)
CREATE POLICY "Acesso público para clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para contatos" ON public.cliente_contatos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público para histórico" ON public.cliente_historico FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cliente_contatos_updated_at
  BEFORE UPDATE ON public.cliente_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;