-- 1. Adicionar campos à tabela ai_observer_alerts para prioridade, causalidade e decisão
ALTER TABLE public.ai_observer_alerts
ADD COLUMN IF NOT EXISTS economic_priority_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS root_cause text,
ADD COLUMN IF NOT EXISTS downstream_entities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS projected_loss_30d numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS decision_options jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS alert_category text DEFAULT 'alert' CHECK (alert_category IN ('alert', 'insight', 'observation'));

-- 2. Adicionar campos à tabela ai_insights para consistência
ALTER TABLE public.ai_insights
ADD COLUMN IF NOT EXISTS economic_priority_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS insight_category text DEFAULT 'insight' CHECK (insight_category IN ('alert', 'insight', 'observation'));

-- 3. Criar tabela de memória econômica
CREATE TABLE IF NOT EXISTS public.ai_economic_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('product', 'client', 'supplier', 'service_order', 'sale', 'purchase_order')),
  entity_id uuid NOT NULL,
  entity_name text,
  
  -- Contadores de alertas
  total_alerts integer DEFAULT 0,
  critical_alerts integer DEFAULT 0,
  warning_alerts integer DEFAULT 0,
  
  -- Métricas econômicas acumuladas
  total_potential_loss numeric DEFAULT 0,
  avg_margin_impact numeric DEFAULT 0,
  
  -- Padrões detectados
  recurring_issues jsonb DEFAULT '[]'::jsonb,
  last_alert_types text[] DEFAULT '{}',
  
  -- Timestamps
  first_alert_at timestamp with time zone,
  last_alert_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Índice único por entidade
  CONSTRAINT unique_entity_memory UNIQUE (company_id, entity_type, entity_id)
);

-- 4. Criar tabela de decisões tomadas (para silêncio inteligente)
CREATE TABLE IF NOT EXISTS public.ai_decision_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.ai_observer_alerts(id) ON DELETE SET NULL,
  decision_type text NOT NULL,
  decision_label text NOT NULL,
  decision_data jsonb,
  decided_by uuid REFERENCES public.users(id),
  decided_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Criar tabela de configuração de silêncio
CREATE TABLE IF NOT EXISTS public.ai_silence_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('cooldown', 'threshold', 'decision_based')),
  event_type text,
  cooldown_hours integer DEFAULT 24,
  min_margin_change numeric DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE public.ai_economic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_silence_rules ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para ai_economic_memory
CREATE POLICY "Users can view memory from their companies"
ON public.ai_economic_memory FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Service role can manage memory"
ON public.ai_economic_memory FOR ALL
USING (true)
WITH CHECK (true);

-- 8. Políticas RLS para ai_decision_log
CREATE POLICY "Users can view decisions from their companies"
ON public.ai_decision_log FOR SELECT
USING (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Users can insert decisions for their companies"
ON public.ai_decision_log FOR INSERT
WITH CHECK (company_id IN (SELECT get_user_companies()));

CREATE POLICY "Service role can manage decisions"
ON public.ai_decision_log FOR ALL
USING (true);

-- 9. Políticas RLS para ai_silence_rules
CREATE POLICY "Users can manage silence rules from their companies"
ON public.ai_silence_rules FOR ALL
USING (company_id IN (SELECT get_user_companies()));

-- 10. Função para calcular prioridade econômica
CREATE OR REPLACE FUNCTION public.calculate_economic_priority(
  p_severity text,
  p_potential_loss numeric,
  p_margin_change_percent numeric,
  p_impacted_count integer,
  p_recurrence_count integer
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score integer := 0;
BEGIN
  -- Severidade (0-30 pontos)
  score := score + CASE p_severity
    WHEN 'critical' THEN 30
    WHEN 'high' THEN 20
    WHEN 'medium' THEN 10
    ELSE 5
  END;
  
  -- Perda potencial (0-25 pontos)
  score := score + LEAST(25, COALESCE(p_potential_loss, 0) / 1000);
  
  -- Mudança de margem (0-20 pontos)
  score := score + LEAST(20, ABS(COALESCE(p_margin_change_percent, 0)));
  
  -- Entidades impactadas (0-15 pontos)
  score := score + LEAST(15, COALESCE(p_impacted_count, 0) * 3);
  
  -- Recorrência (0-10 pontos)
  score := score + LEAST(10, COALESCE(p_recurrence_count, 0) * 2);
  
  RETURN LEAST(100, score);
END;
$$;

-- 11. Função para atualizar memória econômica
CREATE OR REPLACE FUNCTION public.update_economic_memory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entity RECORD;
  v_recurrence integer;
BEGIN
  -- Processar cada entidade impactada
  IF NEW.impacted_entities IS NOT NULL AND jsonb_array_length(NEW.impacted_entities) > 0 THEN
    FOR v_entity IN SELECT * FROM jsonb_array_elements(NEW.impacted_entities)
    LOOP
      INSERT INTO ai_economic_memory (
        company_id,
        entity_type,
        entity_id,
        entity_name,
        total_alerts,
        critical_alerts,
        warning_alerts,
        total_potential_loss,
        last_alert_types,
        first_alert_at,
        last_alert_at
      ) VALUES (
        NEW.company_id,
        v_entity->>'type',
        (v_entity->>'id')::uuid,
        v_entity->>'description',
        1,
        CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
        CASE WHEN NEW.severity IN ('high', 'medium') THEN 1 ELSE 0 END,
        COALESCE(NEW.potential_loss, 0),
        ARRAY[NEW.event_type],
        NEW.created_at,
        NEW.created_at
      )
      ON CONFLICT (company_id, entity_type, entity_id) DO UPDATE SET
        total_alerts = ai_economic_memory.total_alerts + 1,
        critical_alerts = ai_economic_memory.critical_alerts + CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
        warning_alerts = ai_economic_memory.warning_alerts + CASE WHEN NEW.severity IN ('high', 'medium') THEN 1 ELSE 0 END,
        total_potential_loss = ai_economic_memory.total_potential_loss + COALESCE(NEW.potential_loss, 0),
        last_alert_types = (
          SELECT array_agg(DISTINCT t) FROM (
            SELECT unnest(ai_economic_memory.last_alert_types) AS t
            UNION
            SELECT NEW.event_type
          ) sub
          LIMIT 10
        ),
        last_alert_at = NEW.created_at,
        updated_at = now();
      
      -- Buscar contagem de recorrência para calcular prioridade
      SELECT total_alerts INTO v_recurrence
      FROM ai_economic_memory
      WHERE company_id = NEW.company_id
        AND entity_type = v_entity->>'type'
        AND entity_id = (v_entity->>'id')::uuid;
    END LOOP;
  END IF;
  
  -- Calcular e atualizar prioridade econômica do alerta
  UPDATE ai_observer_alerts SET
    economic_priority_score = calculate_economic_priority(
      NEW.severity,
      NEW.potential_loss,
      NEW.margin_change_percent,
      COALESCE(jsonb_array_length(NEW.impacted_entities), 0),
      COALESCE(v_recurrence, 0)
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- 12. Trigger para atualizar memória econômica
DROP TRIGGER IF EXISTS trigger_update_economic_memory ON ai_observer_alerts;
CREATE TRIGGER trigger_update_economic_memory
AFTER INSERT ON ai_observer_alerts
FOR EACH ROW
EXECUTE FUNCTION update_economic_memory();

-- 13. Função para verificar silêncio inteligente
CREATE OR REPLACE FUNCTION public.ai_should_silence_alert(
  p_company_id uuid,
  p_event_type text,
  p_alert_hash text,
  p_margin_change numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rule RECORD;
  v_last_similar TIMESTAMP;
  v_decision_exists boolean;
BEGIN
  -- Verificar regras de silêncio ativas
  FOR v_rule IN 
    SELECT * FROM ai_silence_rules 
    WHERE company_id = p_company_id 
    AND is_active = true
    AND (event_type IS NULL OR event_type = p_event_type)
  LOOP
    -- Cooldown: não repetir alertas similares
    IF v_rule.rule_type = 'cooldown' THEN
      SELECT created_at INTO v_last_similar
      FROM ai_observer_alerts
      WHERE company_id = p_company_id
        AND alert_hash = p_alert_hash
        AND NOT is_dismissed
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF v_last_similar IS NOT NULL 
         AND v_last_similar > NOW() - (v_rule.cooldown_hours || ' hours')::interval THEN
        RETURN true;
      END IF;
    END IF;
    
    -- Threshold: ignorar variações pequenas
    IF v_rule.rule_type = 'threshold' THEN
      IF ABS(COALESCE(p_margin_change, 0)) < v_rule.min_margin_change THEN
        RETURN true;
      END IF;
    END IF;
    
    -- Decision-based: usuário já tomou decisão
    IF v_rule.rule_type = 'decision_based' THEN
      SELECT EXISTS(
        SELECT 1 FROM ai_decision_log
        WHERE company_id = p_company_id
          AND decision_type = p_event_type
          AND decided_at > NOW() - INTERVAL '7 days'
      ) INTO v_decision_exists;
      
      IF v_decision_exists THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;

-- 14. View para ranking global de alertas
CREATE OR REPLACE VIEW public.ai_alerts_ranked AS
SELECT 
  a.*,
  m.total_alerts as entity_recurrence_count,
  m.total_potential_loss as entity_total_loss,
  ROW_NUMBER() OVER (
    PARTITION BY a.company_id 
    ORDER BY a.economic_priority_score DESC, a.created_at DESC
  ) as priority_rank
FROM ai_observer_alerts a
LEFT JOIN ai_economic_memory m ON (
  a.impacted_entities IS NOT NULL 
  AND jsonb_array_length(a.impacted_entities) > 0
  AND m.company_id = a.company_id
  AND m.entity_id = (a.impacted_entities->0->>'id')::uuid
)
WHERE a.is_dismissed = false
ORDER BY a.economic_priority_score DESC, a.created_at DESC;