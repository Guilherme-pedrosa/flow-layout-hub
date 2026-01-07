-- Índices para performance de sync_jobs
CREATE INDEX IF NOT EXISTS idx_sync_jobs_company_status_updated
ON sync_jobs (company_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_company_processing_started
ON sync_jobs (company_id, status, processing_started_at);