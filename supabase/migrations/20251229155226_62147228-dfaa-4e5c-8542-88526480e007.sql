-- Tabela de auditoria detalhada para checkouts
CREATE TABLE public.checkout_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_type TEXT NOT NULL, -- 'venda' ou 'os'
  checkout_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'item_separado', 'item_conferido', 'checkout_iniciado', 'checkout_finalizado', 'checkout_parcial', 'pdf_gerado'
  user_id UUID REFERENCES public.users(id),
  user_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  items_snapshot JSONB, -- Snapshot dos itens no momento da ação
  stock_before JSONB, -- Estoque antes da movimentação
  stock_after JSONB, -- Estoque depois da movimentação
  observations TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_checkout_audit_checkout ON public.checkout_audit(checkout_type, checkout_id);
CREATE INDEX idx_checkout_audit_user ON public.checkout_audit(user_id);
CREATE INDEX idx_checkout_audit_action ON public.checkout_audit(action);
CREATE INDEX idx_checkout_audit_created ON public.checkout_audit(created_at DESC);

-- Enable RLS
ALTER TABLE public.checkout_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler logs (para exibir no PDF)
CREATE POLICY "Permitir leitura de logs de checkout"
ON public.checkout_audit
FOR SELECT
USING (true);

-- Policy: Apenas inserção (logs são imutáveis)
CREATE POLICY "Permitir inserção de logs"
ON public.checkout_audit
FOR INSERT
WITH CHECK (true);

-- Tabela para armazenar referências aos PDFs gerados
CREATE TABLE public.checkout_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_type TEXT NOT NULL, -- 'venda' ou 'os'
  checkout_id UUID NOT NULL,
  pdf_type TEXT NOT NULL, -- 'recibo_completo', 'por_item', 'resumido'
  version INTEGER NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID REFERENCES public.users(id),
  generated_by_name TEXT,
  document_hash TEXT, -- Hash MD5 do documento para verificação
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_checkout_pdfs_checkout ON public.checkout_pdfs(checkout_type, checkout_id);
CREATE INDEX idx_checkout_pdfs_created ON public.checkout_pdfs(created_at DESC);

-- Enable RLS
ALTER TABLE public.checkout_pdfs ENABLE ROW LEVEL SECURITY;

-- Policy: Leitura pública
CREATE POLICY "Permitir leitura de PDFs"
ON public.checkout_pdfs
FOR SELECT
USING (true);

-- Policy: Inserção
CREATE POLICY "Permitir inserção de PDFs"
ON public.checkout_pdfs
FOR INSERT
WITH CHECK (true);