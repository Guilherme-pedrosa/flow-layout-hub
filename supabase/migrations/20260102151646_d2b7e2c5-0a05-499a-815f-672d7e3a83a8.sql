-- ============================================
-- WAI OBSERVER: Governança SLA Executivo (Correção)
-- ============================================

-- 1. Função de escalonamento de SLA vencido (corrigida)
CREATE OR REPLACE FUNCTION ai_check_and_escalate_sla()
RETURNS INTEGER AS $$
DECLARE
  v_tactical_count INTEGER;
  v_economic_count INTEGER;
  v_strategic_count INTEGER;
BEGIN
  -- Escalonar alertas táticos vencidos para econômico
  UPDATE ai_observer_alerts
  SET 
    priority_level = 'economic_risk',
    responsible_role = 'financeiro',
    escalated_at = NOW(),
    escalation_reason = 'SLA vencido sem ação - escalonado de tático para econômico',
    sla_hours = 24,
    sla_deadline = NOW() + INTERVAL '24 hours'
  WHERE 
    priority_level = 'tactical_attention'
    AND sla_deadline < NOW()
    AND is_sla_breached = false
    AND is_dismissed = false
    AND is_actioned = false;
  
  GET DIAGNOSTICS v_tactical_count = ROW_COUNT;
  
  -- Escalonar alertas econômicos vencidos para estratégico
  UPDATE ai_observer_alerts
  SET 
    priority_level = 'strategic_risk',
    responsible_role = 'diretoria',
    escalated_at = NOW(),
    escalation_reason = 'SLA crítico vencido - escalonado para diretoria',
    sla_hours = 4,
    sla_deadline = NOW() + INTERVAL '4 hours'
  WHERE 
    priority_level = 'economic_risk'
    AND sla_deadline < NOW()
    AND is_sla_breached = false
    AND is_dismissed = false
    AND is_actioned = false;
  
  GET DIAGNOSTICS v_economic_count = ROW_COUNT;
  
  -- Marcar alertas estratégicos vencidos como SLA violado
  UPDATE ai_observer_alerts
  SET 
    is_sla_breached = true,
    escalation_reason = COALESCE(escalation_reason, '') || ' | ALERTA MÁXIMO: SLA estratégico violado'
  WHERE 
    priority_level = 'strategic_risk'
    AND sla_deadline < NOW()
    AND is_sla_breached = false
    AND is_dismissed = false
    AND is_actioned = false;
  
  GET DIAGNOSTICS v_strategic_count = ROW_COUNT;
  
  RETURN v_tactical_count + v_economic_count + v_strategic_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Função RPC para buscar top alertas priorizados (atualizada)
DROP FUNCTION IF EXISTS ai_get_top_alerts(UUID, INTEGER);

CREATE OR REPLACE FUNCTION ai_get_top_alerts(
  p_company_id UUID,
  p_limit INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  severity TEXT,
  priority_level TEXT,
  responsible_role TEXT,
  economic_reason TEXT,
  potential_loss NUMERIC,
  margin_change_percent NUMERIC,
  sla_deadline TIMESTAMPTZ,
  sla_hours INTEGER,
  is_sla_breached BOOLEAN,
  escalation_reason TEXT,
  action_url TEXT,
  created_at TIMESTAMPTZ,
  priority_rank INTEGER,
  entity_total_loss NUMERIC,
  entity_recurrence_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.event_type,
    a.severity,
    a.priority_level,
    a.responsible_role,
    a.economic_reason,
    a.potential_loss,
    a.margin_change_percent,
    a.sla_deadline,
    a.sla_hours,
    a.is_sla_breached,
    a.escalation_reason,
    a.action_url,
    a.created_at,
    ROW_NUMBER() OVER (
      ORDER BY 
        CASE a.priority_level 
          WHEN 'strategic_risk' THEN 1 
          WHEN 'economic_risk' THEN 2 
          WHEN 'tactical_attention' THEN 3 
          ELSE 4 
        END,
        CASE a.severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          ELSE 3 
        END,
        COALESCE(a.economic_priority_score, 0) DESC,
        COALESCE(a.potential_loss, 0) DESC
    )::INTEGER as priority_rank,
    COALESCE(m.total_potential_loss, 0) as entity_total_loss,
    COALESCE(m.total_alerts, 0)::INTEGER as entity_recurrence_count
  FROM ai_observer_alerts a
  LEFT JOIN ai_economic_memory m ON 
    m.company_id = a.company_id 
    AND m.entity_type = a.event_source_type 
    AND m.entity_id = a.event_source_id
  WHERE 
    a.company_id = p_company_id
    AND a.is_dismissed = false
    AND a.is_actioned = false
    AND (a.priority_level IS NULL OR a.priority_level != 'operational_noise')
  ORDER BY priority_rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Garantir que alertas antigos sem priority_level sejam atualizados
UPDATE ai_observer_alerts
SET 
  priority_level = CASE 
    WHEN severity = 'critical' THEN 'economic_risk'
    WHEN severity = 'warning' THEN 'tactical_attention'
    ELSE 'operational_noise'
  END,
  responsible_role = CASE 
    WHEN severity = 'critical' THEN 'financeiro'
    WHEN severity = 'warning' THEN 'operacoes'
    ELSE NULL
  END,
  sla_hours = CASE 
    WHEN severity = 'critical' THEN 24
    WHEN severity = 'warning' THEN 48
    ELSE NULL
  END
WHERE priority_level IS NULL;