-- ============================================
-- WAI Observer Governance: responsible_role, SLA, auto-escalation
-- ============================================

-- 1. Adicionar campos de governança ao ai_observer_alerts
ALTER TABLE public.ai_observer_alerts 
ADD COLUMN IF NOT EXISTS responsible_role TEXT,
ADD COLUMN IF NOT EXISTS sla_hours INTEGER,
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_sla_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS priority_level TEXT;

-- 2. Índice para alertas por SLA deadline
CREATE INDEX IF NOT EXISTS idx_alerts_sla_deadline ON public.ai_observer_alerts(sla_deadline) 
WHERE is_dismissed = false AND is_actioned = false AND sla_deadline IS NOT NULL;

-- 3. Índice para alertas por responsible_role
CREATE INDEX IF NOT EXISTS idx_alerts_responsible_role ON public.ai_observer_alerts(company_id, responsible_role) 
WHERE is_dismissed = false AND is_actioned = false;

-- 4. Função para determinar responsible_role e SLA baseado no priority_level
CREATE OR REPLACE FUNCTION public.ai_assign_governance(
  p_priority_level TEXT,
  p_severity TEXT
)
RETURNS TABLE(responsible_role TEXT, sla_hours INTEGER) 
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- strategic_risk: CEO/Diretor, 24h
  IF p_priority_level = 'strategic_risk' OR (p_severity = 'critical' AND p_priority_level IS NULL) THEN
    RETURN QUERY SELECT 'diretoria'::TEXT, 24;
  
  -- economic_risk: Financeiro/Controladoria, 72h  
  ELSIF p_priority_level = 'economic_risk' OR p_severity = 'critical' THEN
    RETURN QUERY SELECT 'financeiro'::TEXT, 72;
  
  -- tactical_attention: Operações/Compras, 168h (7 dias)
  ELSIF p_priority_level = 'tactical_attention' THEN
    RETURN QUERY SELECT 'operacoes'::TEXT, 168;
  
  -- Default: operações
  ELSE
    RETURN QUERY SELECT 'operacoes'::TEXT, 168;
  END IF;
END;
$$;

-- 5. Função para gerar deep-link contextual
CREATE OR REPLACE FUNCTION public.ai_generate_action_url(
  p_event_type TEXT,
  p_event_source_type TEXT,
  p_event_source_id UUID,
  p_impacted_entities JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_first_entity JSONB;
  v_entity_type TEXT;
  v_entity_id TEXT;
BEGIN
  -- Prioridade 1: entidade impactada específica
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
  
  -- Prioridade 2: baseado no event_source
  IF p_event_source_type = 'product' AND p_event_source_id IS NOT NULL THEN
    RETURN '/produtos?edit=' || p_event_source_id || '&tab=custos';
  ELSIF p_event_source_type = 'service_order' AND p_event_source_id IS NOT NULL THEN
    RETURN '/servicos/ordem-servico/' || p_event_source_id;
  ELSIF p_event_source_type = 'sale' AND p_event_source_id IS NOT NULL THEN
    RETURN '/receber/venda/' || p_event_source_id;
  ELSIF p_event_source_type = 'purchase_order' AND p_event_source_id IS NOT NULL THEN
    RETURN '/compras/pedidos-compra?edit=' || p_event_source_id;
  END IF;
  
  -- Prioridade 3: baseado no event_type
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
  
  -- Fallback: dashboard financeiro
  RETURN '/financeiro/dashboard';
END;
$$;

-- 6. Trigger para auto-atribuir governança ao inserir alerta
CREATE OR REPLACE FUNCTION public.ai_auto_assign_governance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_governance RECORD;
  v_action_url TEXT;
BEGIN
  -- Calcular priority_level se não definido
  IF NEW.priority_level IS NULL THEN
    NEW.priority_level := ai_classify_alert_priority(
      NEW.severity,
      NEW.potential_loss,
      NEW.margin_change_percent,
      (SELECT total_alerts > 2 FROM ai_economic_memory 
       WHERE company_id = NEW.company_id 
       AND entity_id = NEW.event_source_id 
       LIMIT 1),
      NEW.requires_human_decision
    );
  END IF;
  
  -- Buscar responsible_role e SLA
  SELECT * INTO v_governance FROM ai_assign_governance(NEW.priority_level, NEW.severity);
  
  NEW.responsible_role := v_governance.responsible_role;
  NEW.sla_hours := v_governance.sla_hours;
  NEW.sla_deadline := NEW.created_at + (v_governance.sla_hours || ' hours')::INTERVAL;
  
  -- Gerar deep-link
  NEW.action_url := ai_generate_action_url(
    NEW.event_type,
    NEW.event_source_type,
    NEW.event_source_id,
    NEW.impacted_entities
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_auto_assign_governance ON public.ai_observer_alerts;
CREATE TRIGGER trg_auto_assign_governance
  BEFORE INSERT ON public.ai_observer_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_auto_assign_governance();

-- 7. Função para verificar e escalar alertas com SLA estourado
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
  -- Buscar alertas com SLA estourado e não escalados
  FOR v_alert IN
    SELECT id, severity, priority_level, responsible_role, sla_deadline
    FROM ai_observer_alerts
    WHERE is_dismissed = false
    AND is_actioned = false
    AND is_sla_breached = false
    AND sla_deadline IS NOT NULL
    AND sla_deadline < NOW()
  LOOP
    -- Escalar: subir prioridade e mudar responsável
    UPDATE ai_observer_alerts SET
      is_sla_breached = true,
      escalated_at = NOW(),
      escalation_reason = 'SLA estourado (' || v_alert.sla_hours || 'h) - alerta não tratado',
      -- Escalar prioridade
      priority_level = CASE v_alert.priority_level
        WHEN 'tactical_attention' THEN 'economic_risk'
        WHEN 'economic_risk' THEN 'strategic_risk'
        ELSE 'strategic_risk'
      END,
      -- Escalar responsável
      responsible_role = CASE v_alert.responsible_role
        WHEN 'operacoes' THEN 'financeiro'
        WHEN 'financeiro' THEN 'diretoria'
        ELSE 'diretoria'
      END,
      -- Novo SLA: 24h após escalonamento
      sla_hours = 24,
      sla_deadline = NOW() + INTERVAL '24 hours'
    WHERE id = v_alert.id;
    
    v_escalated_count := v_escalated_count + 1;
  END LOOP;
  
  RETURN v_escalated_count;
END;
$$;

-- 8. Atualizar função ai_check_duplicate_alert para retornar dados de escalonamento
DROP FUNCTION IF EXISTS public.ai_check_duplicate_alert(uuid, text);
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
  -- Buscar alerta similar recente
  SELECT a.id, a.severity, a.is_sla_breached, a.created_at
  INTO v_existing
  FROM ai_observer_alerts a
  WHERE a.company_id = p_company_id
  AND a.alert_hash = p_alert_hash
  AND NOT a.is_dismissed
  AND a.created_at >= NOW() - (p_hours_cooldown || ' hours')::INTERVAL
  ORDER BY a.created_at DESC
  LIMIT 1;
  
  IF v_existing.id IS NOT NULL THEN
    -- Contar ocorrências nas últimas 48h
    SELECT COUNT(*) INTO v_occurrence_count
    FROM ai_observer_alerts
    WHERE company_id = p_company_id
    AND alert_hash = p_alert_hash
    AND created_at >= NOW() - INTERVAL '48 hours';
    
    -- Se já ocorreu 3+ vezes → escalar
    IF v_occurrence_count >= 3 THEN
      RETURN QUERY SELECT 
        false::BOOLEAN, 
        v_existing.id,
        true::BOOLEAN,
        format('Alerta recorrente: %s ocorrências em 48h', v_occurrence_count)::TEXT;
    ELSE
      -- Duplicata simples → silenciar
      RETURN QUERY SELECT 
        true::BOOLEAN, 
        v_existing.id,
        false::BOOLEAN,
        NULL::TEXT;
    END IF;
  ELSE
    -- Nenhum alerta similar → não é duplicata
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      NULL::UUID,
      false::BOOLEAN,
      NULL::TEXT;
  END IF;
END;
$$;

-- 9. View para alertas por responsável com SLA
CREATE OR REPLACE VIEW public.ai_alerts_by_responsible AS
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