-- Fix security warnings: set search_path on new functions

-- 1. Fix ai_assign_governance
DROP FUNCTION IF EXISTS public.ai_assign_governance(text, text);
CREATE OR REPLACE FUNCTION public.ai_assign_governance(
  p_priority_level TEXT,
  p_severity TEXT
)
RETURNS TABLE(responsible_role TEXT, sla_hours INTEGER) 
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF p_priority_level = 'strategic_risk' OR (p_severity = 'critical' AND p_priority_level IS NULL) THEN
    RETURN QUERY SELECT 'diretoria'::TEXT, 24;
  ELSIF p_priority_level = 'economic_risk' OR p_severity = 'critical' THEN
    RETURN QUERY SELECT 'financeiro'::TEXT, 72;
  ELSIF p_priority_level = 'tactical_attention' THEN
    RETURN QUERY SELECT 'operacoes'::TEXT, 168;
  ELSE
    RETURN QUERY SELECT 'operacoes'::TEXT, 168;
  END IF;
END;
$$;

-- 2. Fix ai_generate_action_url
DROP FUNCTION IF EXISTS public.ai_generate_action_url(text, text, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.ai_generate_action_url(
  p_event_type TEXT,
  p_event_source_type TEXT,
  p_event_source_id UUID,
  p_impacted_entities JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_first_entity JSONB;
  v_entity_type TEXT;
  v_entity_id TEXT;
BEGIN
  IF p_impacted_entities IS NOT NULL AND jsonb_array_length(p_impacted_entities) > 0 THEN
    v_first_entity := p_impacted_entities->0;
    v_entity_type := v_first_entity->>'type';
    v_entity_id := v_first_entity->>'id';
    
    IF v_entity_type = 'product' AND v_entity_id IS NOT NULL THEN
      RETURN '/produtos?edit=' || v_entity_id || '&tab=custos';
    ELSIF v_entity_type = 'service_order' AND v_entity_id IS NOT NULL THEN
      RETURN '/servicos/ordem-servico/' || v_entity_id || '?highlight=margin';
    ELSIF v_entity_type = 'sale' AND v_entity_id IS NOT NULL THEN
      RETURN '/receber/venda/' || v_entity_id || '?highlight=pricing';
    ELSIF v_entity_type = 'supplier' AND v_entity_id IS NOT NULL THEN
      RETURN '/cadastros/fornecedores?edit=' || v_entity_id;
    ELSIF v_entity_type = 'client' AND v_entity_id IS NOT NULL THEN
      RETURN '/cadastros/clientes?edit=' || v_entity_id;
    END IF;
  END IF;
  
  IF p_event_source_type = 'product' AND p_event_source_id IS NOT NULL THEN
    RETURN '/produtos?edit=' || p_event_source_id || '&tab=custos';
  ELSIF p_event_source_type = 'service_order' AND p_event_source_id IS NOT NULL THEN
    RETURN '/servicos/ordem-servico/' || p_event_source_id;
  ELSIF p_event_source_type = 'sale' AND p_event_source_id IS NOT NULL THEN
    RETURN '/receber/venda/' || p_event_source_id;
  ELSIF p_event_source_type = 'purchase_order' AND p_event_source_id IS NOT NULL THEN
    RETURN '/compras/pedidos-compra?edit=' || p_event_source_id;
  END IF;
  
  IF p_event_type LIKE '%product%' OR p_event_type LIKE '%cost%' THEN
    RETURN '/produtos';
  ELSIF p_event_type LIKE '%service_order%' OR p_event_type LIKE '%os%' THEN
    RETURN '/servicos/ordens-servico';
  ELSIF p_event_type LIKE '%sale%' THEN
    RETURN '/receber/vendas';
  ELSIF p_event_type LIKE '%purchase%' OR p_event_type LIKE '%compra%' THEN
    RETURN '/compras/pedidos-compra';
  ELSIF p_event_type LIKE '%payable%' OR p_event_type LIKE '%pagar%' THEN
    RETURN '/financeiro/contas-pagar';
  ELSIF p_event_type LIKE '%receivable%' OR p_event_type LIKE '%receber%' THEN
    RETURN '/financeiro/contas-receber';
  END IF;
  
  RETURN '/financeiro/dashboard';
END;
$$;

-- 3. Fix ai_check_and_escalate_sla
DROP FUNCTION IF EXISTS public.ai_check_and_escalate_sla();
CREATE OR REPLACE FUNCTION public.ai_check_and_escalate_sla()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escalated_count INTEGER := 0;
  v_alert RECORD;
BEGIN
  FOR v_alert IN
    SELECT id, severity, priority_level, responsible_role, sla_hours, sla_deadline
    FROM ai_observer_alerts
    WHERE is_dismissed = false
    AND is_actioned = false
    AND is_sla_breached = false
    AND sla_deadline IS NOT NULL
    AND sla_deadline < NOW()
  LOOP
    UPDATE ai_observer_alerts SET
      is_sla_breached = true,
      escalated_at = NOW(),
      escalation_reason = 'SLA estourado (' || v_alert.sla_hours || 'h) - alerta não tratado',
      priority_level = CASE v_alert.priority_level
        WHEN 'tactical_attention' THEN 'economic_risk'
        WHEN 'economic_risk' THEN 'strategic_risk'
        ELSE 'strategic_risk'
      END,
      responsible_role = CASE v_alert.responsible_role
        WHEN 'operacoes' THEN 'financeiro'
        WHEN 'financeiro' THEN 'diretoria'
        ELSE 'diretoria'
      END,
      sla_hours = 24,
      sla_deadline = NOW() + INTERVAL '24 hours'
    WHERE id = v_alert.id;
    
    v_escalated_count := v_escalated_count + 1;
  END LOOP;
  
  RETURN v_escalated_count;
END;
$$;

-- 4. Fix ai_check_duplicate_alert
DROP FUNCTION IF EXISTS public.ai_check_duplicate_alert(uuid, text, text, integer);
CREATE OR REPLACE FUNCTION public.ai_check_duplicate_alert(
  p_company_id UUID,
  p_alert_hash TEXT,
  p_event_type TEXT DEFAULT NULL,
  p_hours_cooldown INTEGER DEFAULT 24
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  existing_alert_id UUID,
  should_escalate BOOLEAN,
  escalation_reason TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
  v_occurrence_count INTEGER;
BEGIN
  SELECT a.id, a.severity, a.is_sla_breached, a.created_at, a.sla_hours
  INTO v_existing
  FROM ai_observer_alerts a
  WHERE a.company_id = p_company_id
  AND a.alert_hash = p_alert_hash
  AND NOT a.is_dismissed
  AND a.created_at >= NOW() - (p_hours_cooldown || ' hours')::INTERVAL
  ORDER BY a.created_at DESC
  LIMIT 1;
  
  IF v_existing.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_occurrence_count
    FROM ai_observer_alerts
    WHERE company_id = p_company_id
    AND alert_hash = p_alert_hash
    AND created_at >= NOW() - INTERVAL '48 hours';
    
    IF v_occurrence_count >= 3 THEN
      RETURN QUERY SELECT 
        false::BOOLEAN, 
        v_existing.id,
        true::BOOLEAN,
        format('Alerta recorrente: %s ocorrências em 48h', v_occurrence_count)::TEXT;
    ELSE
      RETURN QUERY SELECT 
        true::BOOLEAN, 
        v_existing.id,
        false::BOOLEAN,
        NULL::TEXT;
    END IF;
  ELSE
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      NULL::UUID,
      false::BOOLEAN,
      NULL::TEXT;
  END IF;
END;
$$;

-- 5. Drop security definer views and recreate as regular views
DROP VIEW IF EXISTS public.ai_alerts_by_responsible;
DROP VIEW IF EXISTS public.ai_alerts_ranked;

-- Recreate ai_alerts_by_responsible without SECURITY DEFINER (default is SECURITY INVOKER)
CREATE VIEW public.ai_alerts_by_responsible AS
SELECT 
  a.id,
  a.company_id,
  a.event_type,
  a.severity,
  a.priority_level,
  a.responsible_role,
  a.economic_reason,
  a.potential_loss,
  a.sla_hours,
  a.sla_deadline,
  a.is_sla_breached,
  a.escalated_at,
  a.escalation_reason,
  a.action_url,
  a.created_at,
  CASE 
    WHEN a.sla_deadline < NOW() AND NOT a.is_sla_breached THEN 'overdue'
    WHEN a.sla_deadline < NOW() + INTERVAL '4 hours' THEN 'urgent'
    WHEN a.sla_deadline < NOW() + INTERVAL '24 hours' THEN 'soon'
    ELSE 'ok'
  END AS sla_status,
  EXTRACT(EPOCH FROM (a.sla_deadline - NOW())) / 3600 AS hours_remaining
FROM ai_observer_alerts a
WHERE a.is_dismissed = false
AND a.is_actioned = false
ORDER BY 
  a.is_sla_breached DESC,
  a.sla_deadline ASC NULLS LAST,
  a.economic_priority_score DESC;

-- Recreate ai_alerts_ranked without SECURITY DEFINER
CREATE VIEW public.ai_alerts_ranked AS
SELECT 
  a.*,
  CASE 
    WHEN a.severity = 'critical' THEN 1
    WHEN a.severity = 'warning' THEN 2
    ELSE 3
  END AS severity_rank,
  COALESCE(a.economic_priority_score, 0) AS priority_score
FROM ai_observer_alerts a
WHERE a.is_dismissed = false
ORDER BY 
  CASE a.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
  COALESCE(a.economic_priority_score, 0) DESC,
  a.created_at DESC;