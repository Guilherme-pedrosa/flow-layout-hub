-- =====================================================
-- FUNÇÕES SQL PARA IA CONSULTAR DADOS COM SEGURANÇA
-- Todas as funções usam SECURITY DEFINER e respeitam company_id
-- =====================================================

-- 4.1 Dashboard Financeiro
CREATE OR REPLACE FUNCTION ai_get_financial_dashboard(
  p_company_id UUID,
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'periodo', json_build_object('inicio', p_start_date, 'fim', p_end_date),
    'receitas', (
      SELECT COALESCE(SUM(amount), 0) 
      FROM accounts_receivable 
      WHERE company_id = p_company_id 
      AND is_paid = true 
      AND paid_at BETWEEN p_start_date AND p_end_date
    ),
    'despesas', (
      SELECT COALESCE(SUM(paid_amount), 0) 
      FROM payables 
      WHERE company_id = p_company_id 
      AND is_paid = true 
      AND paid_at BETWEEN p_start_date AND p_end_date
    ),
    'a_receber', (
      SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) 
      FROM accounts_receivable 
      WHERE company_id = p_company_id 
      AND is_paid = false
    ),
    'a_pagar', (
      SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) 
      FROM payables 
      WHERE company_id = p_company_id 
      AND is_paid = false
    ),
    'vencidos_receber', (
      SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) 
      FROM accounts_receivable 
      WHERE company_id = p_company_id 
      AND is_paid = false 
      AND due_date < CURRENT_DATE
    ),
    'vencidos_pagar', (
      SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) 
      FROM payables 
      WHERE company_id = p_company_id 
      AND is_paid = false 
      AND due_date < CURRENT_DATE
    ),
    'saldo_bancario', (
      SELECT COALESCE(SUM(current_balance), 0) 
      FROM bank_accounts 
      WHERE company_id = p_company_id 
      AND is_active = true
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.2 Análise de Clientes
CREATE OR REPLACE FUNCTION ai_get_clientes_analysis(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_clientes', (
      SELECT COUNT(*) FROM pessoas 
      WHERE company_id = p_company_id AND is_cliente = true
    ),
    'clientes_ativos', (
      SELECT COUNT(DISTINCT cliente_id)
      FROM sales
      WHERE company_id = p_company_id
      AND created_at >= CURRENT_DATE - INTERVAL '90 days'
    ),
    'top_clientes_faturamento', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT p.razao_social as nome, SUM(s.total_amount) as total_compras, COUNT(*) as qtd_compras
        FROM sales s
        JOIN pessoas p ON p.id = s.cliente_id
        WHERE s.company_id = p_company_id
        AND s.created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY p.id, p.razao_social
        ORDER BY total_compras DESC
        LIMIT 10
      ) t
    ),
    'clientes_inativos', (
      SELECT COALESCE(json_agg(json_build_object('nome', p.razao_social, 'ultima_compra', MAX(s.created_at))), '[]'::json)
      FROM pessoas p
      LEFT JOIN sales s ON s.cliente_id = p.id
      WHERE p.company_id = p_company_id AND p.is_cliente = true
      GROUP BY p.id, p.razao_social
      HAVING MAX(s.created_at) < CURRENT_DATE - INTERVAL '90 days' OR MAX(s.created_at) IS NULL
      LIMIT 20
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.3 Análise de Produtos e Estoque
CREATE OR REPLACE FUNCTION ai_get_produtos_analysis(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_produtos', (
      SELECT COUNT(*) FROM products 
      WHERE company_id = p_company_id AND is_active = true
    ),
    'valor_estoque', (
      SELECT COALESCE(SUM(current_stock * COALESCE(cost_price, sale_price * 0.6)), 0)
      FROM products
      WHERE company_id = p_company_id AND is_active = true
    ),
    'produtos_estoque_baixo', (
      SELECT COALESCE(json_agg(json_build_object(
        'nome', name,
        'codigo', code,
        'estoque_atual', current_stock,
        'estoque_minimo', minimum_stock
      )), '[]'::json)
      FROM products
      WHERE company_id = p_company_id
      AND is_active = true
      AND current_stock <= COALESCE(minimum_stock, 5)
      AND current_stock > 0
      LIMIT 20
    ),
    'produtos_sem_estoque', (
      SELECT COALESCE(json_agg(json_build_object('nome', name, 'codigo', code)), '[]'::json)
      FROM products
      WHERE company_id = p_company_id
      AND is_active = true
      AND current_stock <= 0
      LIMIT 20
    ),
    'mais_vendidos', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT p.name as nome, p.code as codigo, SUM(spi.quantity) as qtd_vendida, SUM(spi.total) as valor_total
        FROM sale_product_items spi
        JOIN products p ON p.id = spi.product_id
        JOIN sales s ON s.id = spi.sale_id
        WHERE s.company_id = p_company_id
        AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY p.id, p.name, p.code
        ORDER BY qtd_vendida DESC
        LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.4 Análise de Ordens de Serviço
CREATE OR REPLACE FUNCTION ai_get_os_analysis(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_os', (
      SELECT COUNT(*) FROM service_orders 
      WHERE company_id = p_company_id
    ),
    'os_abertas', (
      SELECT COUNT(*) FROM service_orders
      WHERE company_id = p_company_id
      AND status_id IS NOT NULL
    ),
    'os_por_status', (
      SELECT COALESCE(json_agg(json_build_object('status', ss.name, 'quantidade', count)), '[]'::json)
      FROM (
        SELECT so.status_id, COUNT(*) as count
        FROM service_orders so
        WHERE so.company_id = p_company_id
        GROUP BY so.status_id
      ) t
      LEFT JOIN service_order_statuses ss ON ss.id = t.status_id
    ),
    'faturamento_os_mes', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM service_orders
      WHERE company_id = p_company_id
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    'ticket_medio_os', (
      SELECT COALESCE(AVG(total_amount), 0)
      FROM service_orders
      WHERE company_id = p_company_id
      AND created_at >= CURRENT_DATE - INTERVAL '90 days'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.5 Análise de Vendas
CREATE OR REPLACE FUNCTION ai_get_vendas_analysis(
  p_company_id UUID,
  p_periodo_dias INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'periodo_dias', p_periodo_dias,
    'total_vendas', (
      SELECT COUNT(*) FROM sales
      WHERE company_id = p_company_id
      AND created_at >= CURRENT_DATE - (p_periodo_dias || ' days')::INTERVAL
    ),
    'faturamento', (
      SELECT COALESCE(SUM(total_amount), 0) FROM sales
      WHERE company_id = p_company_id
      AND created_at >= CURRENT_DATE - (p_periodo_dias || ' days')::INTERVAL
    ),
    'ticket_medio', (
      SELECT COALESCE(AVG(total_amount), 0) FROM sales
      WHERE company_id = p_company_id
      AND created_at >= CURRENT_DATE - (p_periodo_dias || ' days')::INTERVAL
    ),
    'vendas_por_dia', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT created_at::DATE as dia, COUNT(*) as qtd, SUM(total_amount) as total
        FROM sales
        WHERE company_id = p_company_id
        AND created_at >= CURRENT_DATE - (p_periodo_dias || ' days')::INTERVAL
        GROUP BY created_at::DATE
        ORDER BY dia
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.6 Análise de Compras e Fornecedores
CREATE OR REPLACE FUNCTION ai_get_compras_analysis(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_compras_mes', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM purchase_orders
      WHERE company_id = p_company_id
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ),
    'pedidos_pendentes', (
      SELECT COALESCE(json_agg(json_build_object(
        'numero', po.order_number,
        'fornecedor', p.razao_social,
        'valor', po.total_amount,
        'data', po.created_at
      )), '[]'::json)
      FROM purchase_orders po
      JOIN pessoas p ON p.id = po.supplier_id
      WHERE po.company_id = p_company_id
      AND po.status_id IS NOT NULL
      LIMIT 10
    ),
    'top_fornecedores', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT p.razao_social as nome, SUM(po.total_amount) as total_compras, COUNT(*) as qtd_compras
        FROM purchase_orders po
        JOIN pessoas p ON p.id = po.supplier_id
        WHERE po.company_id = p_company_id
        AND po.created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY p.id, p.razao_social
        ORDER BY total_compras DESC
        LIMIT 10
      ) t
    ),
    'contas_a_pagar', (
      SELECT COALESCE(json_agg(json_build_object(
        'fornecedor', p.razao_social,
        'valor', pay.amount,
        'vencimento', pay.due_date
      )), '[]'::json)
      FROM payables pay
      JOIN pessoas p ON p.id = pay.supplier_id
      WHERE pay.company_id = p_company_id
      AND pay.is_paid = false
      ORDER BY pay.due_date
      LIMIT 20
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.7 Função Master para IA - Visão Geral Completa
CREATE OR REPLACE FUNCTION ai_get_full_company_overview(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'financeiro', ai_get_financial_dashboard(p_company_id),
    'clientes', ai_get_clientes_analysis(p_company_id),
    'produtos', ai_get_produtos_analysis(p_company_id),
    'ordens_servico', ai_get_os_analysis(p_company_id),
    'vendas', ai_get_vendas_analysis(p_company_id, 30),
    'compras', ai_get_compras_analysis(p_company_id),
    'gerado_em', NOW()
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.8 Função para IA acessar dados de estoque para sugestões de compra
CREATE OR REPLACE FUNCTION ai_get_purchase_suggestions(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'produtos_para_repor', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', p.id,
        'nome', p.name,
        'codigo', p.code,
        'estoque_atual', p.current_stock,
        'estoque_minimo', p.minimum_stock,
        'preco_custo', p.cost_price,
        'preco_venda', p.sale_price
      )), '[]'::json)
      FROM products p
      WHERE p.company_id = p_company_id
      AND p.is_active = true
      AND p.stock_control = true
      AND p.current_stock <= COALESCE(p.minimum_stock, 0)
      ORDER BY p.current_stock ASC
      LIMIT 50
    ),
    'fornecedores_ativos', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', p.id,
        'nome', p.razao_social,
        'cnpj', p.cpf_cnpj
      )), '[]'::json)
      FROM pessoas p
      WHERE p.company_id = p_company_id
      AND p.is_fornecedor = true
      AND p.is_active = true
      LIMIT 100
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4.9 Função para análise de inadimplência
CREATE OR REPLACE FUNCTION ai_get_inadimplencia_analysis(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_inadimplente', (
      SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0)
      FROM accounts_receivable
      WHERE company_id = p_company_id
      AND is_paid = false
      AND due_date < CURRENT_DATE
    ),
    'clientes_inadimplentes', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT 
          p.razao_social as cliente,
          SUM(ar.amount - COALESCE(ar.paid_amount, 0)) as valor_devido,
          MIN(ar.due_date) as vencimento_mais_antigo,
          CURRENT_DATE - MIN(ar.due_date) as dias_atraso,
          COUNT(*) as qtd_titulos
        FROM accounts_receivable ar
        JOIN pessoas p ON p.id = ar.client_id
        WHERE ar.company_id = p_company_id
        AND ar.is_paid = false
        AND ar.due_date < CURRENT_DATE
        GROUP BY p.id, p.razao_social
        ORDER BY valor_devido DESC
        LIMIT 20
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;