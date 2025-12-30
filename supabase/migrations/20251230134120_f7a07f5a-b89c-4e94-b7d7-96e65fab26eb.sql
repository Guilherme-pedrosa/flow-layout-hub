-- Tabela principal de notas fiscais
CREATE TABLE public.notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  sale_id UUID REFERENCES public.sales(id),
  referencia VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) NOT NULL DEFAULT 'NFe', -- 'NFe', 'NFCe', 'NFSe'
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'rascunho', -- 'rascunho', 'processando', 'autorizado', 'cancelado', 'erro'
  status_sefaz VARCHAR(10),
  mensagem_sefaz TEXT,
  
  -- Dados da NFe
  chave_nfe VARCHAR(44),
  numero VARCHAR(20),
  serie VARCHAR(10) DEFAULT '1',
  protocolo VARCHAR(50),
  
  -- Valores
  valor_total DECIMAL(15,2),
  valor_produtos DECIMAL(15,2),
  valor_icms DECIMAL(15,2),
  valor_pis DECIMAL(15,2),
  valor_cofins DECIMAL(15,2),
  valor_frete DECIMAL(15,2),
  valor_desconto DECIMAL(15,2),
  
  -- URLs
  xml_url TEXT,
  danfe_url TEXT,
  
  -- Dados do destinatário
  destinatario_nome VARCHAR(255),
  destinatario_cpf_cnpj VARCHAR(18),
  destinatario_email VARCHAR(255),
  
  -- Natureza da operação
  natureza_operacao VARCHAR(100) DEFAULT 'Venda de Mercadoria',
  
  -- Datas
  data_emissao TIMESTAMP WITH TIME ZONE,
  data_autorizacao TIMESTAMP WITH TIME ZONE,
  data_cancelamento TIMESTAMP WITH TIME ZONE,
  justificativa_cancelamento TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT unique_referencia UNIQUE (referencia)
);

-- Índices
CREATE INDEX idx_notas_fiscais_sale_id ON public.notas_fiscais(sale_id);
CREATE INDEX idx_notas_fiscais_company_id ON public.notas_fiscais(company_id);
CREATE INDEX idx_notas_fiscais_referencia ON public.notas_fiscais(referencia);
CREATE INDEX idx_notas_fiscais_chave_nfe ON public.notas_fiscais(chave_nfe);
CREATE INDEX idx_notas_fiscais_status ON public.notas_fiscais(status);
CREATE INDEX idx_notas_fiscais_data_emissao ON public.notas_fiscais(data_emissao);

-- Tabela de itens da NFe
CREATE TABLE public.nfe_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  numero_item INTEGER NOT NULL,
  
  -- Produto
  product_id UUID REFERENCES public.products(id),
  codigo_produto VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  
  -- Classificação fiscal
  ncm VARCHAR(8),
  cest VARCHAR(7),
  cfop VARCHAR(4) NOT NULL,
  
  -- Quantidades e valores
  unidade_comercial VARCHAR(10) NOT NULL DEFAULT 'UN',
  quantidade_comercial DECIMAL(15,4) NOT NULL,
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_bruto DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2),
  
  -- Tributação ICMS
  icms_situacao_tributaria VARCHAR(3),
  icms_origem VARCHAR(1) DEFAULT '0',
  icms_base_calculo DECIMAL(15,2),
  icms_aliquota DECIMAL(5,2),
  icms_valor DECIMAL(15,2),
  
  -- Tributação PIS
  pis_situacao_tributaria VARCHAR(2),
  pis_base_calculo DECIMAL(15,2),
  pis_aliquota DECIMAL(5,4),
  pis_valor DECIMAL(15,2),
  
  -- Tributação COFINS
  cofins_situacao_tributaria VARCHAR(2),
  cofins_base_calculo DECIMAL(15,2),
  cofins_aliquota DECIMAL(5,4),
  cofins_valor DECIMAL(15,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfe_itens_nota_fiscal_id ON public.nfe_itens(nota_fiscal_id);
CREATE INDEX idx_nfe_itens_product_id ON public.nfe_itens(product_id);

-- Tabela de logs de NFe
CREATE TABLE public.nfe_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  referencia VARCHAR(100) NOT NULL,
  
  tipo VARCHAR(50) NOT NULL, -- 'emissao', 'consulta', 'cancelamento', 'carta_correcao', 'erro'
  status VARCHAR(50),
  mensagem TEXT,
  
  -- Request/Response
  request_data JSONB,
  response_data JSONB,
  
  -- Metadados
  user_id UUID REFERENCES public.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfe_logs_nota_fiscal_id ON public.nfe_logs(nota_fiscal_id);
CREATE INDEX idx_nfe_logs_referencia ON public.nfe_logs(referencia);
CREATE INDEX idx_nfe_logs_tipo ON public.nfe_logs(tipo);

-- Trigger para updated_at
CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (acesso público para desenvolvimento, ajustar em produção)
CREATE POLICY "Allow all access to notas_fiscais" ON public.notas_fiscais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to nfe_itens" ON public.nfe_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to nfe_logs" ON public.nfe_logs FOR ALL USING (true) WITH CHECK (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notas_fiscais;