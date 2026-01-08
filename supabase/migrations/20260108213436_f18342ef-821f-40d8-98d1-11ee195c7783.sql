-- Adicionar campos faltantes na tabela pessoas para colaboradores
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS funcao text;

-- Renomear tabelas existentes para seguir o padrão do PRD
-- Tabela de Documentos Globais (colaborador_docs)
DROP TABLE IF EXISTS colaborador_docs CASCADE;
CREATE TABLE colaborador_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ASO', 'NR10', 'NR35', 'NR33', 'NR12', 'NR06', 'NR11', 'CNH', 'FICHA_REGISTRO', 'OUTROS')),
  tipo_customizado text, -- Para quando tipo = 'OUTROS'
  data_emissao date,
  data_vencimento date,
  arquivo_url text,
  arquivo_nome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_colaborador_docs_colaborador ON colaborador_docs(colaborador_id);
CREATE INDEX idx_colaborador_docs_vencimento ON colaborador_docs(data_vencimento);
CREATE INDEX idx_colaborador_docs_tipo ON colaborador_docs(tipo);

-- Tabela de Integrações Locais (integracoes)
DROP TABLE IF EXISTS integracoes CASCADE;
CREATE TABLE integracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,
  cliente_id uuid NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data_realizacao date NOT NULL,
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'pendente')),
  comprovante_url text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Constraint: Um técnico não pode ter duas integrações ativas no mesmo cliente
  CONSTRAINT integracoes_unique_colaborador_cliente UNIQUE(colaborador_id, cliente_id)
);

-- Índices para performance
CREATE INDEX idx_integracoes_colaborador ON integracoes(colaborador_id);
CREATE INDEX idx_integracoes_cliente ON integracoes(cliente_id);
CREATE INDEX idx_integracoes_vencimento ON integracoes(data_vencimento);
CREATE INDEX idx_integracoes_status ON integracoes(status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_colaborador_docs_updated_at ON colaborador_docs;
CREATE TRIGGER update_colaborador_docs_updated_at
  BEFORE UPDATE ON colaborador_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integracoes_updated_at ON integracoes;
CREATE TRIGGER update_integracoes_updated_at
  BEFORE UPDATE ON integracoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE colaborador_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view colaborador_docs" ON colaborador_docs FOR SELECT USING (true);
CREATE POLICY "Users can insert colaborador_docs" ON colaborador_docs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update colaborador_docs" ON colaborador_docs FOR UPDATE USING (true);
CREATE POLICY "Users can delete colaborador_docs" ON colaborador_docs FOR DELETE USING (true);

CREATE POLICY "Users can view integracoes" ON integracoes FOR SELECT USING (true);
CREATE POLICY "Users can insert integracoes" ON integracoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update integracoes" ON integracoes FOR UPDATE USING (true);
CREATE POLICY "Users can delete integracoes" ON integracoes FOR DELETE USING (true);

-- Migrar dados existentes das tabelas antigas se existirem
INSERT INTO colaborador_docs (colaborador_id, company_id, tipo, data_emissao, data_vencimento, arquivo_url, arquivo_nome, created_at)
SELECT 
  colaborador_id, 
  company_id, 
  CASE 
    WHEN tipo_documento IN ('ASO', 'NR10', 'NR35', 'NR33', 'NR12', 'NR06', 'NR11', 'CNH', 'FICHA_REGISTRO') THEN tipo_documento
    ELSE 'OUTROS'
  END,
  data_emissao::date, 
  data_vencimento::date, 
  arquivo_url, 
  arquivo_nome, 
  created_at
FROM rh_documentos_colaborador
WHERE ativo = 1
ON CONFLICT DO NOTHING;

INSERT INTO integracoes (colaborador_id, cliente_id, company_id, data_realizacao, data_vencimento, status, observacoes, created_at)
SELECT 
  colaborador_id, 
  cliente_id, 
  company_id, 
  data_integracao, 
  data_vencimento,
  CASE 
    WHEN data_vencimento < CURRENT_DATE THEN 'vencido'
    ELSE 'ativo'
  END,
  observacoes, 
  created_at
FROM rh_integracoes
WHERE ativo = 1
ON CONFLICT (colaborador_id, cliente_id) DO NOTHING;