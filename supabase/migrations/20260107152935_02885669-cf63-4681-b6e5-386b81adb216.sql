-- Adicionar coluna processing_started_at na tabela sync_jobs
ALTER TABLE public.sync_jobs 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;

-- Criar função RPC para claim atômico de jobs (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION public.claim_sync_jobs(batch_size INT DEFAULT 10)
RETURNS SETOF public.sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM public.sync_jobs
    WHERE status IN ('pending', 'error')
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      AND attempts < max_attempts
    ORDER BY 
      CASE WHEN status = 'error' THEN 1 ELSE 0 END,
      next_retry_at NULLS FIRST,
      created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.sync_jobs sj
  SET 
    status = 'processing',
    processing_started_at = NOW(),
    updated_at = NOW()
  FROM claimed c
  WHERE sj.id = c.id
  RETURNING sj.*;
END;
$$;

-- Criar função RPC para liberar jobs travados (reaper)
CREATE OR REPLACE FUNCTION public.reap_stuck_sync_jobs(stuck_minutes INT DEFAULT 5)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INT;
BEGIN
  WITH stuck AS (
    SELECT id
    FROM public.sync_jobs
    WHERE status = 'processing'
      AND processing_started_at < NOW() - (stuck_minutes || ' minutes')::INTERVAL
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.sync_jobs sj
  SET 
    status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'error' END,
    last_error = 'Job stuck in processing - timeout after ' || stuck_minutes || ' minutes',
    attempts = attempts + 1,
    next_retry_at = CASE 
      WHEN attempts < max_attempts THEN NOW() + (POWER(2, LEAST(attempts, 5)) || ' minutes')::INTERVAL
      ELSE NULL
    END,
    processing_started_at = NULL,
    updated_at = NOW()
  FROM stuck s
  WHERE sj.id = s.id;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- Criar função para buscar jobs de equipment pendentes por cliente (filtro no SQL)
CREATE OR REPLACE FUNCTION public.get_pending_equipment_jobs_for_customer(p_company_id UUID, p_client_id UUID)
RETURNS SETOF public.sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.sync_jobs
  WHERE company_id = p_company_id
    AND entity_type = 'equipment'
    AND status IN ('pending', 'error')
    AND (payload_json->>'client_id')::UUID = p_client_id
  ORDER BY created_at;
END;
$$;

-- Criar índice para busca eficiente de jobs por client_id no payload
CREATE INDEX IF NOT EXISTS idx_sync_jobs_equipment_client 
ON public.sync_jobs ((payload_json->>'client_id'))
WHERE entity_type = 'equipment';

-- Criar índice para claim eficiente
CREATE INDEX IF NOT EXISTS idx_sync_jobs_claim 
ON public.sync_jobs (status, next_retry_at, created_at)
WHERE status IN ('pending', 'error');

-- Criar índice para reaper
CREATE INDEX IF NOT EXISTS idx_sync_jobs_stuck 
ON public.sync_jobs (status, processing_started_at)
WHERE status = 'processing';