-- Adicionar campos de composição de custo na movimentação de estoque
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS cost_breakdown jsonb DEFAULT '{}'::jsonb;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS calculated_unit_cost numeric DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS freight_allocated numeric DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS taxes_included numeric DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS taxes_credited numeric DEFAULT 0;

-- Adicionar campos de CT-e no purchase_order_items para controle de frete rateado
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS cost_breakdown jsonb DEFAULT '{}'::jsonb;
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS calculated_unit_cost numeric DEFAULT 0;

-- Comentários explicativos
COMMENT ON COLUMN stock_movements.cost_breakdown IS 'JSON com detalhes: {product_value, ipi, icms_st, freight, icms_credit, pis_credit, cofins_credit}';
COMMENT ON COLUMN stock_movements.calculated_unit_cost IS 'Custo unitário calculado: (valor + IPI + ICMS-ST + frete) - (créditos)';
COMMENT ON COLUMN purchase_order_items.cost_breakdown IS 'JSON com detalhes do cálculo de custo para o item';