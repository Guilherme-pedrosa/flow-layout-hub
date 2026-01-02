-- Corrigir view com SECURITY INVOKER (padrão mais seguro)
DROP VIEW IF EXISTS public.ai_alerts_ranked;

CREATE VIEW public.ai_alerts_ranked 
WITH (security_invoker = true)
AS
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