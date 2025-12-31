
-- Criar função ai_get_contratos_analysis para análise de contratos/locações
CREATE OR REPLACE FUNCTION public.ai_get_contratos_analysis(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'contratos_ativos', (
      SELECT COUNT(*) FROM sales
      WHERE company_id = p_company_id
      AND status = 'contrato'
    ),
    'receita_recorrente_mensal', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM sales
      WHERE company_id = p_company_id
      AND status = 'contrato'
    ),
    'locacoes_ativas', (
      SELECT COUNT(*) FROM service_orders
      WHERE company_id = p_company_id
      AND tipo = 'locacao'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Atualizar ai_get_full_company_overview para incluir contratos
CREATE OR REPLACE FUNCTION public.ai_get_full_company_overview(p_company_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    'contratos', ai_get_contratos_analysis(p_company_id),
    'gerado_em', NOW()
  ) INTO result;

  RETURN result;
END;
$$;
