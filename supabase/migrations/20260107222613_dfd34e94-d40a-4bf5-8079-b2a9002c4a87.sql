-- RPC para métricas de SLA de sync_jobs
CREATE OR REPLACE FUNCTION public.get_sync_jobs_sla(p_company_id uuid)
RETURNS TABLE (
  entity_type text,
  total_jobs bigint,
  avg_duration_seconds numeric,
  p95_duration_seconds numeric,
  p99_duration_seconds numeric,
  success_rate numeric
)
AS $$
BEGIN
  RETURN QUERY
  WITH job_durations AS (
    SELECT 
      sj.entity_type,
      EXTRACT(EPOCH FROM (sj.updated_at - sj.created_at)) AS duration_seconds,
      sj.status
    FROM sync_jobs sj
    WHERE sj.company_id = p_company_id
      AND sj.status = 'done'
      AND sj.created_at > NOW() - INTERVAL '30 days'
  ),
  stats AS (
    SELECT 
      entity_type,
      COUNT(*) AS total,
      AVG(duration_seconds) AS avg_dur,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_seconds) AS p95_dur,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_seconds) AS p99_dur
    FROM job_durations
    GROUP BY entity_type
  ),
  success_rates AS (
    SELECT 
      sj.entity_type,
      COUNT(*) FILTER (WHERE sj.status = 'done')::numeric / NULLIF(COUNT(*), 0) * 100 AS rate
    FROM sync_jobs sj
    WHERE sj.company_id = p_company_id
      AND sj.created_at > NOW() - INTERVAL '30 days'
    GROUP BY sj.entity_type
  )
  SELECT 
    s.entity_type::text,
    s.total AS total_jobs,
    ROUND(s.avg_dur, 2) AS avg_duration_seconds,
    ROUND(s.p95_dur, 2) AS p95_duration_seconds,
    ROUND(s.p99_dur, 2) AS p99_duration_seconds,
    ROUND(COALESCE(sr.rate, 0), 1) AS success_rate
  FROM stats s
  LEFT JOIN success_rates sr ON s.entity_type = sr.entity_type
  ORDER BY s.entity_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;