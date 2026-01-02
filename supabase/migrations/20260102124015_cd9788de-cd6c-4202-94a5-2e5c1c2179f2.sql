
-- =============================================
-- TABELA ai_alert_feedback (Loop de Feedback Humano)
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_alert_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES public.ai_observer_alerts(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('dismissed', 'actioned', 'ignored', 'escalated')),
  feedback_score INTEGER DEFAULT 0 CHECK (feedback_score >= -2 AND feedback_score <= 2),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_alert_feedback_company ON public.ai_alert_feedback(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_alert_feedback_alert ON public.ai_alert_feedback(alert_id);
CREATE INDEX IF NOT EXISTS idx_ai_alert_feedback_action ON public.ai_alert_feedback(action);

-- RLS
ALTER TABLE public.ai_alert_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback for their companies"
ON public.ai_alert_feedback FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can view feedback from their companies"
ON public.ai_alert_feedback FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Service role can manage feedback"
ON public.ai_alert_feedback FOR ALL
USING (true);

-- =============================================
-- FUNÇÃO ai_record_feedback (Registra feedback e atualiza sensibilidade)
-- =============================================
CREATE OR REPLACE FUNCTION public.ai_record_feedback(
  p_alert_id UUID,
  p_action TEXT,
  p_feedback_score INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert RECORD;
  v_company_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar alerta
  SELECT * INTO v_alert FROM ai_observer_alerts WHERE id = p_alert_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alerta não encontrado');
  END IF;
  
  v_company_id := v_alert.company_id;
  
  -- Inserir feedback
  INSERT INTO ai_alert_feedback (
    company_id, alert_id, action, feedback_score, notes, user_id
  ) VALUES (
    v_company_id, p_alert_id, p_action, COALESCE(p_feedback_score, 0), p_notes, p_user_id
  );
  
  -- Atualizar alerta conforme ação
  IF p_action = 'dismissed' THEN
    UPDATE ai_observer_alerts SET 
      is_dismissed = true,
      is_read = true
    WHERE id = p_alert_id;
    
    -- Atualizar memória econômica (falso positivo)
    IF v_alert.event_source_type IS NOT NULL AND v_alert.event_source_id IS NOT NULL THEN
      INSERT INTO ai_economic_memory (
        company_id, entity_type, entity_id, entity_name,
        total_alerts, critical_alerts, warning_alerts,
        total_potential_loss, first_alert_at, last_alert_at
      ) VALUES (
        v_company_id, 
        v_alert.event_source_type, 
        v_alert.event_source_id,
        v_alert.event_type,
        0, 0, 0, 0, now(), now()
      )
      ON CONFLICT (company_id, entity_type, entity_id) DO UPDATE SET
        -- Falso positivo: não incrementa contadores
        updated_at = now();
    END IF;
    
  ELSIF p_action = 'actioned' THEN
    UPDATE ai_observer_alerts SET 
      is_actioned = true,
      actioned_at = now(),
      actioned_by = p_user_id,
      action_taken = COALESCE(p_notes, 'Ação tomada pelo usuário')
    WHERE id = p_alert_id;
    
    -- Atualizar memória econômica (alerta válido)
    IF v_alert.event_source_type IS NOT NULL AND v_alert.event_source_id IS NOT NULL THEN
      INSERT INTO ai_economic_memory (
        company_id, entity_type, entity_id, entity_name,
        total_alerts, critical_alerts, warning_alerts,
        total_potential_loss, first_alert_at, last_alert_at,
        last_alert_types
      ) VALUES (
        v_company_id, 
        v_alert.event_source_type, 
        v_alert.event_source_id,
        v_alert.event_type,
        1,
        CASE WHEN v_alert.severity = 'critical' THEN 1 ELSE 0 END,
        CASE WHEN v_alert.severity = 'warning' THEN 1 ELSE 0 END,
        COALESCE(v_alert.potential_loss, 0),
        now(), now(),
        ARRAY[v_alert.event_type]
      )
      ON CONFLICT (company_id, entity_type, entity_id) DO UPDATE SET
        total_alerts = ai_economic_memory.total_alerts + 1,
        critical_alerts = ai_economic_memory.critical_alerts + CASE WHEN v_alert.severity = 'critical' THEN 1 ELSE 0 END,
        warning_alerts = ai_economic_memory.warning_alerts + CASE WHEN v_alert.severity = 'warning' THEN 1 ELSE 0 END,
        total_potential_loss = ai_economic_memory.total_potential_loss + COALESCE(v_alert.potential_loss, 0),
        last_alert_at = now(),
        last_alert_types = (
          SELECT array_agg(DISTINCT val) 
          FROM unnest(ai_economic_memory.last_alert_types || ARRAY[v_alert.event_type]) val
          LIMIT 5
        ),
        updated_at = now();
    END IF;
    
  ELSIF p_action = 'ignored' THEN
    UPDATE ai_observer_alerts SET 
      is_read = true
    WHERE id = p_alert_id;
    
  ELSIF p_action = 'escalated' THEN
    UPDATE ai_observer_alerts SET 
      severity = 'critical',
      requires_human_decision = true,
      is_read = true
    WHERE id = p_alert_id;
    
    -- Atualizar memória para refletir escalação
    IF v_alert.event_source_type IS NOT NULL AND v_alert.event_source_id IS NOT NULL THEN
      INSERT INTO ai_economic_memory (
        company_id, entity_type, entity_id, entity_name,
        total_alerts, critical_alerts, warning_alerts,
        total_potential_loss, first_alert_at, last_alert_at
      ) VALUES (
        v_company_id, 
        v_alert.event_source_type, 
        v_alert.event_source_id,
        v_alert.event_type,
        1, 1, 0,
        COALESCE(v_alert.potential_loss, 0) * 1.5,
        now(), now()
      )
      ON CONFLICT (company_id, entity_type, entity_id) DO UPDATE SET
        critical_alerts = ai_economic_memory.critical_alerts + 1,
        total_potential_loss = ai_economic_memory.total_potential_loss + COALESCE(v_alert.potential_loss, 0) * 1.5,
        last_alert_at = now(),
        updated_at = now();
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'alert_id', p_alert_id
  );
END;
$$;

-- =============================================
-- ATUALIZAR ai_economic_memory (adicionar constraint única se não existir)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_economic_memory_company_entity_unique'
  ) THEN
    ALTER TABLE public.ai_economic_memory
    ADD CONSTRAINT ai_economic_memory_company_entity_unique 
    UNIQUE (company_id, entity_type, entity_id);
  END IF;
END $$;
