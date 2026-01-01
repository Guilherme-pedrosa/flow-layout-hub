-- Tabela de configuração de NFS-e por empresa
CREATE TABLE IF NOT EXISTS nfse_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados Focus NFe (pode ser o mesmo token da NF-e)
  focus_token TEXT,
  ambiente VARCHAR(20) DEFAULT 'homologacao', -- 'homologacao' ou 'producao'
  
  -- Certificado Digital (pode compartilhar com nfe_config)
  certificado_base64 TEXT,
  certificado_senha TEXT,
  certificado_validade DATE,
  
  -- Dados fiscais da empresa para NFS-e
  inscricao_municipal VARCHAR(20) NOT NULL,
  codigo_municipio VARCHAR(10) DEFAULT '5201108', -- Anápolis/GO
  
  -- Configurações de serviço padrão
  item_lista_servico VARCHAR(10), -- Ex: "7.13"
  codigo_tributario_municipio VARCHAR(20), -- Mesmo valor do CNAE em Anápolis
  codigo_cnae VARCHAR(10),
  aliquota_iss DECIMAL(5,2) DEFAULT 2.00,
  
  -- Regime tributário
  optante_simples_nacional BOOLEAN DEFAULT true,
  regime_especial_tributacao INTEGER DEFAULT 6, -- 6 = Microempresa Municipal
  
  -- Numeração
  serie_nfse INTEGER DEFAULT 1,
  ultimo_numero_nfse INTEGER DEFAULT 0,
  ultimo_numero_rps INTEGER DEFAULT 0,
  
  -- Configurações padrão
  natureza_operacao_padrao INTEGER DEFAULT 1, -- 1 = Tributação no município
  
  -- Webhooks
  webhook_url TEXT,
  
  -- Credenciais específicas da prefeitura (se não usar Focus NFe)
  login_prefeitura VARCHAR(100),
  senha_prefeitura TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nfse_config_company ON nfse_config(company_id);

-- RLS
ALTER TABLE nfse_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view nfse_config of their companies" ON nfse_config
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage nfse_config of their companies" ON nfse_config
  FOR ALL USING (
    company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  );

-- Comentários
COMMENT ON TABLE nfse_config IS 'Configuração de NFS-e por empresa';
COMMENT ON COLUMN nfse_config.codigo_municipio IS 'Código IBGE do município (5201108 = Anápolis/GO)';
COMMENT ON COLUMN nfse_config.item_lista_servico IS 'Item da lista de serviços conforme LC 116/2003';
COMMENT ON COLUMN nfse_config.regime_especial_tributacao IS '1=Microempresa, 2=Estimativa, 3=Sociedade Profissionais, 4=Cooperativa, 5=MEI, 6=ME EPP Simples Nacional';
