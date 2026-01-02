-- Corrigir função com search_path para segurança

-- 1. FUNÇÃO PARA CLASSIFICAÇÃO EXECUTIVA (COM SEARCH_PATH)
CREATE OR REPLACE FUNCTION ai_classify_alert_priority(
  p_severity TEXT,
  p_potential_loss NUMERIC,
  p_margin_change NUMERIC,
  p_is_recurring BOOLEAN,
  p_requires_decision BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_score INTEGER;
BEGIN
  v_score := ai_calculate_priority_score(p_severity, p_potential_loss, p_margin_change, p_is_recurring);
  
  IF v_score >= 80 OR (p_severity = 'critical' AND p_requires_decision) THEN
    RETURN 'strategic_risk';
  ELSIF v_score >= 60 OR p_severity = 'critical' THEN
    RETURN 'economic_risk';
  ELSIF v_score >= 30 OR p_potential_loss > 100 THEN
    RETURN 'tactical_attention';
  ELSE
    RETURN 'operational_noise';
  END IF;
END;
$$;

-- 2. FUNÇÃO PARA LIMITAR ALERTAS ATIVOS (MAX 7) - COM SEARCH_PATH
CREATE OR REPLACE FUNCTION ai_get_top_alerts(
  p_company_id UUID,
  p_max_alerts INTEGER DEFAULT 7
)
RETURNS SETOF ai_observer_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.*
  FROM ai_observer_alerts a
  WHERE a.company_id = p_company_id
    AND a.is_dismissed = false
    AND a.is_actioned = false
  ORDER BY 
    CASE a.severity 
      WHEN 'critical' THEN 1 
      WHEN 'warning' THEN 2 
      ELSE 3 
    END,
    a.economic_priority_score DESC NULLS LAST,
    COALESCE(a.potential_loss, 0) DESC,
    a.created_at DESC
  LIMIT p_max_alerts;
END;
$$;

-- 3. FUNÇÃO PARA COMPARAÇÃO HISTÓRICA - COM SEARCH_PATH
CREATE OR REPLACE FUNCTION ai_compare_with_history(
  p_company_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metric_type TEXT,
  p_current_value NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memory RECORD;
  v_avg_value NUMERIC;
  v_deviation NUMERIC;
  v_is_outlier BOOLEAN := FALSE;
  v_samples INTEGER;
BEGIN
  SELECT * INTO v_memory
  FROM ai_economic_memory
  WHERE company_id = p_company_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;
  
  IF v_memory IS NULL THEN
    RETURN jsonb_build_object(
      'has_history', false,
      'is_outlier', false,
      'message', 'Sem histórico para comparação'
    );
  END IF;
  
  IF p_metric_type = 'cost' THEN
    v_avg_value := v_memory.avg_cost_variation;
    v_samples := v_memory.cost_variation_samples;
  ELSE
    v_avg_value := v_memory.avg_margin;
    v_samples := v_memory.margin_samples;
  END IF;
  
  IF v_samples < 3 THEN
    RETURN jsonb_build_object(
      'has_history', true,
      'is_outlier', false,
      'samples', v_samples,
      'message', 'Amostras insuficientes para comparação estatística'
    );
  END IF;
  
  v_deviation := ABS(p_current_value - v_avg_value);
  
  IF v_avg_value > 0 AND (v_deviation / v_avg_value) > 2 THEN
    v_is_outlier := TRUE;
  END IF;
  
  RETURN jsonb_build_object(
    'has_history', true,
    'is_outlier', v_is_outlier,
    'avg_value', v_avg_value,
    'current_value', p_current_value,
    'deviation_percent', CASE WHEN v_avg_value > 0 THEN ROUND((v_deviation / v_avg_value * 100)::NUMERIC, 2) ELSE 0 END,
    'samples', v_samples,
    'message', CASE 
      WHEN v_is_outlier THEN format('Desvio significativo: %.1f%% vs média histórica de %.1f%%', p_current_value, v_avg_value)
      ELSE format('Dentro do padrão histórico (média: %.1f%%)', v_avg_value)
    END
  );
END;
$$;

-- 4. FUNÇÃO PARA ATUALIZAR MEMÓRIA - COM SEARCH_PATH
CREATE OR REPLACE FUNCTION ai_update_economic_memory(
  p_company_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_entity_name TEXT,
  p_alert_severity TEXT DEFAULT NULL,
  p_potential_loss NUMERIC DEFAULT 0,
  p_margin_impact NUMERIC DEFAULT NULL,
  p_cost_variation NUMERIC DEFAULT NULL,
  p_alert_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ai_economic_memory (
    company_id, entity_type, entity_id, entity_name,
    total_alerts, critical_alerts, warning_alerts,
    total_potential_loss, avg_margin_impact,
    first_alert_at, last_alert_at, last_alert_types
  )
  VALUES (
    p_company_id, p_entity_type, p_entity_id, p_entity_name,
    CASE WHEN p_alert_severity IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN p_alert_severity = 'critical' THEN 1 ELSE 0 END,
    CASE WHEN p_alert_severity = 'warning' THEN 1 ELSE 0 END,
    p_potential_loss,
    COALESCE(p_margin_impact, 0),
    NOW(), NOW(),
    CASE WHEN p_alert_type IS NOT NULL THEN ARRAY[p_alert_type] ELSE '{}'::TEXT[] END
  )
  ON CONFLICT (company_id, entity_type, entity_id)
  DO UPDATE SET
    total_alerts = ai_economic_memory.total_alerts + CASE WHEN p_alert_severity IS NOT NULL THEN 1 ELSE 0 END,
    critical_alerts = ai_economic_memory.critical_alerts + CASE WHEN p_alert_severity = 'critical' THEN 1 ELSE 0 END,
    warning_alerts = ai_economic_memory.warning_alerts + CASE WHEN p_alert_severity = 'warning' THEN 1 ELSE 0 END,
    total_potential_loss = ai_economic_memory.total_potential_loss + p_potential_loss,
    avg_margin_impact = CASE 
      WHEN p_margin_impact IS NOT NULL AND ai_economic_memory.total_alerts > 0 THEN 
        (ai_economic_memory.avg_margin_impact * ai_economic_memory.total_alerts + p_margin_impact) / (ai_economic_memory.total_alerts + 1)
      WHEN p_margin_impact IS NOT NULL THEN p_margin_impact
      ELSE ai_economic_memory.avg_margin_impact
    END,
    last_alert_at = NOW(),
    last_alert_types = CASE 
      WHEN p_alert_type IS NOT NULL THEN 
        (ARRAY[p_alert_type] || ai_economic_memory.last_alert_types)[1:5]
      ELSE ai_economic_memory.last_alert_types
    END,
    entity_name = COALESCE(p_entity_name, ai_economic_memory.entity_name),
    updated_at = NOW();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION ai_classify_alert_priority TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_get_top_alerts TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_compare_with_history TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_update_economic_memory TO authenticated, service_role;