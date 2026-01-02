-- ============================================
-- 1. FUNÇÃO PARA CALCULAR PRIORITY_SCORE (PRECISA EXISTIR ANTES DA VIEW)
-- ============================================

CREATE OR REPLACE FUNCTION ai_calculate_priority_score(
  p_severity TEXT,
  p_potential_loss NUMERIC,
  p_margin_change NUMERIC,
  p_is_recurring BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  -- Base por severidade
  v_score := CASE p_severity
    WHEN 'critical' THEN 80
    WHEN 'warning' THEN 40
    WHEN 'info' THEN 10
    ELSE 0
  END;
  
  -- Adicionar por perda potencial
  v_score := v_score + LEAST(FLOOR(COALESCE(p_potential_loss, 0) / 100)::INTEGER, 15);
  
  -- Adicionar por mudança de margem (negativa)
  IF p_margin_change < 0 THEN
    v_score := v_score + LEAST(ABS(p_margin_change)::INTEGER, 10);
  END IF;
  
  -- Bônus para recorrência
  IF p_is_recurring THEN
    v_score := v_score + 10;
  END IF;
  
  -- Limitar a 100
  RETURN LEAST(v_score, 100);
END;
$$;

-- Grant
GRANT EXECUTE ON FUNCTION ai_calculate_priority_score TO authenticated, service_role;

-- ============================================
-- 2. RECRIAR A VIEW
-- ============================================

DROP VIEW IF EXISTS ai_alerts_ranked;

CREATE VIEW ai_alerts_ranked AS
SELECT 
  a.*,
  ai_calculate_priority_score(
    a.severity, 
    a.potential_loss, 
    a.margin_change_percent,
    EXISTS (
      SELECT 1 FROM ai_economic_memory m 
      WHERE m.company_id = a.company_id 
        AND m.entity_type = a.event_source_type 
        AND m.entity_id = a.event_source_id
        AND m.total_alerts >= 3
    )
  ) AS priority_rank,
  COALESCE(m.total_potential_loss, 0) AS entity_total_loss,
  COALESCE(m.total_alerts, 0) AS entity_recurrence_count
FROM ai_observer_alerts a
LEFT JOIN ai_economic_memory m 
  ON m.company_id = a.company_id 
  AND m.entity_type = a.event_source_type 
  AND m.entity_id = a.event_source_id
WHERE a.is_dismissed = false AND a.is_actioned = false;