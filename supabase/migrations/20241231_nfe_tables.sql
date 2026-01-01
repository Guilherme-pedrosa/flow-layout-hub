-- Tabela de configuração de NF-e por empresa
CREATE TABLE IF NOT EXISTS nfe_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados Focus NFe
  focus_token TEXT, -- Token de acesso à API Focus NFe
  ambiente VARCHAR(20) DEFAULT 'homologacao', -- 'homologacao' ou 'producao'
  
  -- Certificado Digital
  certificado_base64 TEXT, -- Certificado A1 em base64
  certificado_senha TEXT, -- Senha do certificado (criptografada)
  certificado_validade DATE,
  
  -- Dados fiscais da empresa
  regime_tributario VARCHAR(50), -- 'simples_nacional', 'lucro_presumido', 'lucro_real'
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  cnae_fiscal VARCHAR(10),
  
  -- Numeração
  serie_nfe INTEGER DEFAULT 1,
  ultimo_numero_nfe INTEGER DEFAULT 0,
  serie_nfce INTEGER DEFAULT 1,
  ultimo_numero_nfce INTEGER DEFAULT 0,
  
  -- Configurações padrão
  natureza_operacao_padrao VARCHAR(100) DEFAULT 'Venda de mercadoria',
  cfop_padrao VARCHAR(10) DEFAULT '5102',
  
  -- Webhooks
  webhook_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Tabela de notas fiscais emitidas
CREATE TABLE IF NOT EXISTS nfe_emitidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Referência e identificação
  referencia VARCHAR(100) NOT NULL, -- Referência única para a API
  tipo VARCHAR(10) NOT NULL, -- 'nfe', 'nfce', 'nfse'
  
  -- Dados da nota
  numero INTEGER,
  serie INTEGER,
  chave_acesso VARCHAR(44),
  protocolo VARCHAR(20),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pendente', 
  -- 'pendente', 'processando', 'autorizada', 'rejeitada', 'cancelada', 'inutilizada'
  status_sefaz VARCHAR(10),
  mensagem_sefaz TEXT,
  
  -- Datas
  data_emissao TIMESTAMP WITH TIME ZONE,
  data_autorizacao TIMESTAMP WITH TIME ZONE,
  data_cancelamento TIMESTAMP WITH TIME ZONE,
  
  -- Valores
  valor_total DECIMAL(15,2),
  valor_produtos DECIMAL(15,2),
  valor_frete DECIMAL(15,2) DEFAULT 0,
  valor_seguro DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_outras_despesas DECIMAL(15,2) DEFAULT 0,
  
  -- Impostos
  valor_icms DECIMAL(15,2) DEFAULT 0,
  valor_icms_st DECIMAL(15,2) DEFAULT 0,
  valor_ipi DECIMAL(15,2) DEFAULT 0,
  valor_pis DECIMAL(15,2) DEFAULT 0,
  valor_cofins DECIMAL(15,2) DEFAULT 0,
  
  -- Destinatário
  destinatario_id UUID REFERENCES pessoas(id),
  destinatario_nome VARCHAR(200),
  destinatario_cpf_cnpj VARCHAR(20),
  destinatario_ie VARCHAR(20),
  destinatario_endereco TEXT,
  
  -- Natureza e CFOP
  natureza_operacao VARCHAR(100),
  cfop VARCHAR(10),
  
  -- Transporte
  modalidade_frete VARCHAR(20), -- 'emitente', 'destinatario', 'terceiros', 'sem_frete'
  transportadora_id UUID REFERENCES pessoas(id),
  
  -- Informações adicionais
  informacoes_complementares TEXT,
  informacoes_fisco TEXT,
  
  -- Arquivos
  xml_url TEXT,
  pdf_url TEXT,
  
  -- JSON completo enviado/recebido
  payload_envio JSONB,
  payload_retorno JSONB,
  
  -- Vínculo com venda/pedido
  sale_id UUID REFERENCES sales(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  
  -- Carta de correção
  carta_correcao_texto TEXT,
  carta_correcao_sequencia INTEGER,
  carta_correcao_data TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, referencia)
);

-- Tabela de itens da NF-e
CREATE TABLE IF NOT EXISTS nfe_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES nfe_emitidas(id) ON DELETE CASCADE,
  
  -- Produto
  produto_id UUID REFERENCES products(id),
  codigo VARCHAR(60),
  descricao VARCHAR(120) NOT NULL,
  ncm VARCHAR(8),
  cfop VARCHAR(4),
  unidade VARCHAR(6),
  
  -- Quantidades e valores
  quantidade DECIMAL(15,4) NOT NULL,
  valor_unitario DECIMAL(15,4) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  
  -- Impostos
  icms_origem VARCHAR(1), -- 0-Nacional, 1-Estrangeira importação direta, etc
  icms_cst VARCHAR(3),
  icms_base_calculo DECIMAL(15,2) DEFAULT 0,
  icms_aliquota DECIMAL(5,2) DEFAULT 0,
  icms_valor DECIMAL(15,2) DEFAULT 0,
  
  ipi_cst VARCHAR(2),
  ipi_base_calculo DECIMAL(15,2) DEFAULT 0,
  ipi_aliquota DECIMAL(5,2) DEFAULT 0,
  ipi_valor DECIMAL(15,2) DEFAULT 0,
  
  pis_cst VARCHAR(2),
  pis_base_calculo DECIMAL(15,2) DEFAULT 0,
  pis_aliquota DECIMAL(5,2) DEFAULT 0,
  pis_valor DECIMAL(15,2) DEFAULT 0,
  
  cofins_cst VARCHAR(2),
  cofins_base_calculo DECIMAL(15,2) DEFAULT 0,
  cofins_aliquota DECIMAL(5,2) DEFAULT 0,
  cofins_valor DECIMAL(15,2) DEFAULT 0,
  
  numero_item INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_company ON nfe_emitidas(company_id);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_status ON nfe_emitidas(status);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_chave ON nfe_emitidas(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_emitidas_data ON nfe_emitidas(data_emissao);
CREATE INDEX IF NOT EXISTS idx_nfe_itens_nfe ON nfe_itens(nfe_id);

-- RLS
ALTER TABLE nfe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_itens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view nfe_config of their companies" ON nfe_config
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage nfe_config of their companies" ON nfe_config
  FOR ALL USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view nfe_emitidas of their companies" ON nfe_emitidas
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage nfe_emitidas of their companies" ON nfe_emitidas
  FOR ALL USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view nfe_itens of their companies" ON nfe_itens
  FOR SELECT USING (
    nfe_id IN (
      SELECT id FROM nfe_emitidas 
      WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage nfe_itens of their companies" ON nfe_itens
  FOR ALL USING (
    nfe_id IN (
      SELECT id FROM nfe_emitidas 
      WHERE company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
    )
  );
