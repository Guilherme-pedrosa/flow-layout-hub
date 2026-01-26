-- =============================================================
-- GERADOR DE PROPOSTAS WEDO - Estrutura Completa
-- =============================================================

-- 1) Configurações da empresa para propostas
CREATE TABLE public.proposal_company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identidade visual
  logo_url TEXT,
  cover_image_url TEXT,
  primary_color TEXT DEFAULT '#16a34a',
  secondary_color TEXT DEFAULT '#15803d',
  
  -- Dados institucionais
  razao_social TEXT,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  
  -- Conteúdo institucional (rich text HTML)
  texto_institucional TEXT,
  missao TEXT,
  visao TEXT,
  valores TEXT,
  diferenciais TEXT,
  fornecimento_empresa TEXT,
  fornecimento_cliente TEXT,
  
  -- Configurações padrão
  validade_dias_padrao INTEGER DEFAULT 10,
  proximo_numero INTEGER DEFAULT 1,
  prefixo_numero TEXT DEFAULT 'P',
  
  -- Assinatura
  nome_assinatura TEXT,
  cargo_assinatura TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_company_proposal_settings UNIQUE (company_id)
);

-- 2) Propostas comerciais
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Numeração
  numero TEXT NOT NULL,
  
  -- Datas
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE NOT NULL,
  
  -- Cliente (referência à tabela existente)
  cliente_id UUID REFERENCES public.clientes(id),
  cliente_nome TEXT, -- Denormalizado para caso de cliente externo
  cliente_cnpj_cpf TEXT,
  cliente_endereco TEXT,
  cliente_contato TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  
  -- Proposta
  titulo TEXT NOT NULL,
  descricao_geral TEXT,
  
  -- Valores calculados
  valor_total NUMERIC(15,2) DEFAULT 0,
  valor_desconto NUMERIC(15,2) DEFAULT 0,
  valor_final NUMERIC(15,2) DEFAULT 0,
  
  -- Forma de pagamento
  forma_pagamento TEXT,
  condicoes_pagamento TEXT,
  
  -- Observações gerais
  observacoes TEXT,
  
  -- Status
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada', 'aprovada', 'rejeitada', 'expirada', 'cancelada')),
  
  -- Controle
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para proposals
CREATE INDEX idx_proposals_company ON public.proposals(company_id);
CREATE INDEX idx_proposals_cliente ON public.proposals(cliente_id);
CREATE INDEX idx_proposals_numero ON public.proposals(numero);
CREATE INDEX idx_proposals_status ON public.proposals(status);

-- 3) Seções personalizadas da proposta (institucional, missão, etc.)
CREATE TABLE public.proposal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  tipo TEXT NOT NULL CHECK (tipo IN ('institucional', 'missao_valores', 'parceiros', 'descricao', 'pagamento', 'termos', 'assinaturas', 'custom')),
  titulo TEXT,
  conteudo TEXT, -- Rich HTML
  imagem_url TEXT,
  
  ordem INTEGER NOT NULL DEFAULT 0,
  habilitado BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_sections_proposal ON public.proposal_sections(proposal_id);

-- 4) Itens da proposta (produtos/serviços)
CREATE TABLE public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  -- Tipo
  tipo TEXT NOT NULL CHECK (tipo IN ('produto', 'servico', 'plano')),
  
  -- Referências opcionais aos cadastros existentes
  produto_id UUID REFERENCES public.products(id),
  servico_id UUID REFERENCES public.services(id),
  
  -- Dados do item
  descricao TEXT NOT NULL,
  detalhes TEXT, -- Descrição expandida
  
  -- Centro de custo / Unidade (ex: nome do restaurante)
  centro_custo TEXT,
  
  -- Quantidades e valores
  unidade TEXT DEFAULT 'SV',
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  
  -- Observação específica
  observacao TEXT,
  
  ordem INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_items_proposal ON public.proposal_items(proposal_id);

-- 5) Imagens da proposta
CREATE TABLE public.proposal_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  legenda TEXT,
  pagina_destino TEXT, -- 'capa', 'institucional', 'galeria', etc.
  
  ordem INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_images_proposal ON public.proposal_images(proposal_id);

-- 6) Termos e condições da proposta
CREATE TABLE public.proposal_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  chave TEXT NOT NULL, -- 'inicio_fornecimento', 'turno_trabalho', 'horas_extras', etc.
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL, -- HTML rico
  
  habilitado BOOLEAN DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_terms_proposal ON public.proposal_terms(proposal_id);

-- 7) Templates de termos padrão por empresa
CREATE TABLE public.proposal_term_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  chave TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_term_template_per_company UNIQUE (company_id, chave)
);

-- 8) Audit log de propostas
CREATE TABLE public.proposal_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  payload JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_audit_proposal ON public.proposal_audit(proposal_id);

-- 9) PDFs gerados
CREATE TABLE public.proposal_generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_hash TEXT,
  file_size INTEGER,
  
  generated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_files_proposal ON public.proposal_generated_files(proposal_id);

-- =============================================================
-- RLS Policies
-- =============================================================

ALTER TABLE public.proposal_company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_term_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_generated_files ENABLE ROW LEVEL SECURITY;

-- Policies para proposal_company_settings
CREATE POLICY "Users can view their company proposal settings"
  ON public.proposal_company_settings FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert their company proposal settings"
  ON public.proposal_company_settings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their company proposal settings"
  ON public.proposal_company_settings FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Policies para proposals
CREATE POLICY "Users can view their company proposals"
  ON public.proposals FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create their company proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their company proposals"
  ON public.proposals FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their company proposals"
  ON public.proposals FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Policies para proposal_sections
CREATE POLICY "Users can manage proposal sections"
  ON public.proposal_sections FOR ALL
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

-- Policies para proposal_items
CREATE POLICY "Users can manage proposal items"
  ON public.proposal_items FOR ALL
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

-- Policies para proposal_images
CREATE POLICY "Users can manage proposal images"
  ON public.proposal_images FOR ALL
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

-- Policies para proposal_terms
CREATE POLICY "Users can manage proposal terms"
  ON public.proposal_terms FOR ALL
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

-- Policies para proposal_term_templates
CREATE POLICY "Users can manage their company term templates"
  ON public.proposal_term_templates FOR ALL
  USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

-- Policies para proposal_audit
CREATE POLICY "Users can view proposal audit"
  ON public.proposal_audit FOR SELECT
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

CREATE POLICY "Users can insert proposal audit"
  ON public.proposal_audit FOR INSERT
  WITH CHECK (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

-- Policies para proposal_generated_files
CREATE POLICY "Users can manage proposal files"
  ON public.proposal_generated_files FOR ALL
  USING (proposal_id IN (SELECT id FROM public.proposals WHERE company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid())));

-- =============================================================
-- Trigger para atualizar updated_at
-- =============================================================

CREATE OR REPLACE FUNCTION update_proposal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION update_proposal_updated_at();

CREATE TRIGGER trigger_proposal_settings_updated_at
  BEFORE UPDATE ON public.proposal_company_settings
  FOR EACH ROW EXECUTE FUNCTION update_proposal_updated_at();

CREATE TRIGGER trigger_proposal_sections_updated_at
  BEFORE UPDATE ON public.proposal_sections
  FOR EACH ROW EXECUTE FUNCTION update_proposal_updated_at();

CREATE TRIGGER trigger_proposal_items_updated_at
  BEFORE UPDATE ON public.proposal_items
  FOR EACH ROW EXECUTE FUNCTION update_proposal_updated_at();

CREATE TRIGGER trigger_proposal_terms_updated_at
  BEFORE UPDATE ON public.proposal_terms
  FOR EACH ROW EXECUTE FUNCTION update_proposal_updated_at();

-- =============================================================
-- Função para gerar próximo número da proposta
-- =============================================================

CREATE OR REPLACE FUNCTION generate_proposal_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefixo TEXT;
  v_numero INTEGER;
  v_resultado TEXT;
BEGIN
  -- Buscar configurações ou usar padrão
  SELECT prefixo_numero, proximo_numero 
  INTO v_prefixo, v_numero
  FROM public.proposal_company_settings
  WHERE company_id = p_company_id;
  
  IF v_prefixo IS NULL THEN
    v_prefixo := 'P';
    v_numero := 1;
    
    -- Criar configuração padrão
    INSERT INTO public.proposal_company_settings (company_id, prefixo_numero, proximo_numero)
    VALUES (p_company_id, v_prefixo, v_numero + 1);
  ELSE
    -- Atualizar próximo número
    UPDATE public.proposal_company_settings
    SET proximo_numero = proximo_numero + 1
    WHERE company_id = p_company_id;
  END IF;
  
  v_resultado := v_prefixo || v_numero::TEXT;
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- Storage bucket para propostas
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Users can upload proposal files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'proposals' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view proposal files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proposals');

CREATE POLICY "Users can update proposal files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'proposals' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete proposal files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'proposals' AND auth.role() = 'authenticated');