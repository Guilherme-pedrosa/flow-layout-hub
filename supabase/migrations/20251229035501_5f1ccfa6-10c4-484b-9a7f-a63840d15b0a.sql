-- ===========================================
-- MÓDULO DE PEDIDOS DE COMPRA COMPLETO
-- ===========================================

-- 1. Tabela de Fornecedores
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj VARCHAR(18) UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado VARCHAR(2),
  cep VARCHAR(9),
  telefone TEXT,
  email TEXT,
  observacoes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para suppliers" ON public.suppliers
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Expandir tabela de pedidos de compra
ALTER TABLE public.purchase_orders 
  ADD COLUMN IF NOT EXISTS order_number SERIAL,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'estoque' CHECK (purpose IN ('estoque', 'ordem_de_servico', 'despesa_operacional')),
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS freight_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_external_freight BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nfe_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS nfe_key TEXT,
  ADD COLUMN IF NOT EXISTS nfe_number TEXT,
  ADD COLUMN IF NOT EXISTS nfe_series TEXT,
  ADD COLUMN IF NOT EXISTS nfe_date DATE,
  ADD COLUMN IF NOT EXISTS nfe_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cte_xml_url TEXT,
  ADD COLUMN IF NOT EXISTS cte_key TEXT,
  ADD COLUMN IF NOT EXISTS cte_number TEXT,
  ADD COLUMN IF NOT EXISTS cte_carrier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS cte_freight_value NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cte_date DATE,
  ADD COLUMN IF NOT EXISTS cte_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requires_reapproval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reapproval_reason TEXT,
  ADD COLUMN IF NOT EXISTS receipt_status TEXT DEFAULT 'pending' CHECK (receipt_status IN ('pending', 'partial', 'complete')),
  ADD COLUMN IF NOT EXISTS receipt_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS financial_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS financial_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stock_entry_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_entry_done_at TIMESTAMPTZ;

-- 3. Expandir itens do pedido de compra
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS chart_account_id uuid REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS nfe_quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS nfe_unit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS nfe_total_value NUMERIC,
  ADD COLUMN IF NOT EXISTS has_divergence BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS divergence_details JSONB,
  ADD COLUMN IF NOT EXISTS quantity_received NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_allocated NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_unit_cost NUMERIC DEFAULT 0;

-- 4. Tabela de divergências (para rastreamento detalhado)
CREATE TABLE public.purchase_order_divergences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
  divergence_type TEXT NOT NULL CHECK (divergence_type IN ('supplier', 'item_quantity', 'item_price', 'item_total', 'order_total', 'freight', 'missing_item', 'extra_item')),
  field_name TEXT,
  expected_value TEXT,
  actual_value TEXT,
  difference NUMERIC,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by uuid REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_divergences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para purchase_order_divergences" ON public.purchase_order_divergences
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Tabela de contas a pagar (geradas pelo pedido)
CREATE TABLE public.payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  document_type TEXT NOT NULL DEFAULT 'nfe' CHECK (document_type IN ('nfe', 'cte', 'manual')),
  document_number TEXT,
  description TEXT,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  chart_account_id uuid REFERENCES public.chart_of_accounts(id),
  cost_center_id uuid REFERENCES public.cost_centers(id),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para payables" ON public.payables
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_suppliers_cpf_cnpj ON public.suppliers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_divergences_order ON public.purchase_order_divergences(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_payables_supplier ON public.payables(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON public.payables(due_date);

-- 7. Trigger para updated_at em suppliers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Trigger para updated_at em payables
CREATE TRIGGER update_payables_updated_at
  BEFORE UPDATE ON public.payables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();