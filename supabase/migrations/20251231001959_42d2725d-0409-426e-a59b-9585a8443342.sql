-- Melhorar a tabela product_suppliers para suportar múltiplos fornecedores com preço
ALTER TABLE product_suppliers 
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES pessoas(id),
ADD COLUMN IF NOT EXISTS last_purchase_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purchase_date date,
ADD COLUMN IF NOT EXISTS is_preferred boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_order_qty numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);

-- Habilitar RLS
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;

-- Policy de acesso
DROP POLICY IF EXISTS "Acesso público para product_suppliers" ON product_suppliers;
CREATE POLICY "Acesso público para product_suppliers" ON product_suppliers
FOR ALL USING (true) WITH CHECK (true);