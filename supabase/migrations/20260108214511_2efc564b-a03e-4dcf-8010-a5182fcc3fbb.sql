-- Adicionar colunas de configuração de acesso na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS exige_integracao boolean DEFAULT false;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS regras_acesso text;

-- Tabela de Controle de Acesso (Quem entra Onde)
CREATE TABLE clientes_tecnicos_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  colaborador_id uuid NOT NULL REFERENCES pessoas(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Controle de Validade
  data_inicio date DEFAULT CURRENT_DATE,
  data_validade date NOT NULL,
  
  -- Controle de Arquivos (Storage)
  comprovante_url text,
  nome_arquivo text,
  
  -- Status Manual (Caso a portaria bloqueie mesmo com data válida)
  is_blocked boolean DEFAULT false,
  motivo_bloqueio text,
  
  -- Observações
  observacoes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Um técnico só tem um registro por cliente
  CONSTRAINT clientes_tecnicos_acesso_unique UNIQUE(client_id, colaborador_id)
);

-- Índices para performance
CREATE INDEX idx_clientes_tecnicos_acesso_client ON clientes_tecnicos_acesso(client_id);
CREATE INDEX idx_clientes_tecnicos_acesso_colaborador ON clientes_tecnicos_acesso(colaborador_id);
CREATE INDEX idx_clientes_tecnicos_acesso_validade ON clientes_tecnicos_acesso(data_validade);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_clientes_tecnicos_acesso_updated_at
  BEFORE UPDATE ON clientes_tecnicos_acesso
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE clientes_tecnicos_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clientes_tecnicos_acesso" ON clientes_tecnicos_acesso FOR SELECT USING (true);
CREATE POLICY "Users can insert clientes_tecnicos_acesso" ON clientes_tecnicos_acesso FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update clientes_tecnicos_acesso" ON clientes_tecnicos_acesso FOR UPDATE USING (true);
CREATE POLICY "Users can delete clientes_tecnicos_acesso" ON clientes_tecnicos_acesso FOR DELETE USING (true);

-- Criar bucket de storage para comprovantes de integração
INSERT INTO storage.buckets (id, name, public) VALUES ('integracao-comprovantes', 'integracao-comprovantes', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket
CREATE POLICY "Anyone can view integracao-comprovantes" ON storage.objects FOR SELECT USING (bucket_id = 'integracao-comprovantes');
CREATE POLICY "Authenticated users can upload integracao-comprovantes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'integracao-comprovantes');
CREATE POLICY "Authenticated users can update integracao-comprovantes" ON storage.objects FOR UPDATE USING (bucket_id = 'integracao-comprovantes');
CREATE POLICY "Authenticated users can delete integracao-comprovantes" ON storage.objects FOR DELETE USING (bucket_id = 'integracao-comprovantes');