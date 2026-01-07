-- =============================================
-- SYNC JOBS TABLE (Outbox Pattern)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'customer', 'equipment', 'service_order'
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL DEFAULT 'upsert', -- 'upsert', 'delete'
  payload_json JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'done', 'error', 'dead'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para processamento eficiente
CREATE INDEX IF NOT EXISTS idx_sync_jobs_pending ON public.sync_jobs(company_id, status, next_retry_at) WHERE status IN ('pending', 'error');
CREATE INDEX IF NOT EXISTS idx_sync_jobs_entity ON public.sync_jobs(entity_type, entity_id);

-- RLS
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_jobs_select_company" ON public.sync_jobs
  FOR SELECT USING (
    company_id IN (
      SELECT uc.company_id FROM user_companies uc 
      WHERE uc.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "sync_jobs_insert_company" ON public.sync_jobs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT uc.company_id FROM user_companies uc 
      WHERE uc.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "sync_jobs_update_company" ON public.sync_jobs
  FOR UPDATE USING (
    company_id IN (
      SELECT uc.company_id FROM user_companies uc 
      WHERE uc.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- =============================================
-- CAMPOS DE SYNC NA TABELA CLIENTES
-- =============================================
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'not_synced',
ADD COLUMN IF NOT EXISTS sync_last_error TEXT,
ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.clientes.field_customer_id IS 'ID do cliente no Field Control - obrigatório para integração';
COMMENT ON COLUMN public.clientes.sync_status IS 'Status: not_synced, pending, synced, error';

-- =============================================
-- CAMPOS DE SYNC NA TABELA EQUIPMENTS
-- =============================================
ALTER TABLE public.equipments 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'not_synced',
ADD COLUMN IF NOT EXISTS sync_last_error TEXT,
ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- TRIGGER PARA CRIAR JOB AUTOMATICAMENTE
-- =============================================
CREATE OR REPLACE FUNCTION public.create_sync_job_on_cliente_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só cria job se tiver company_id e dados mínimos
  IF NEW.company_id IS NOT NULL AND (NEW.razao_social IS NOT NULL OR NEW.nome_fantasia IS NOT NULL) THEN
    -- Verificar se já existe job pendente para este cliente
    IF NOT EXISTS (
      SELECT 1 FROM public.sync_jobs 
      WHERE entity_type = 'customer' 
      AND entity_id = NEW.id 
      AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO public.sync_jobs (company_id, entity_type, entity_id, action, payload_json, status)
      VALUES (
        NEW.company_id,
        'customer',
        NEW.id,
        'upsert',
        jsonb_build_object(
          'name', COALESCE(NEW.nome_fantasia, NEW.razao_social),
          'document', NEW.cpf_cnpj,
          'email', NEW.email,
          'phone', NEW.telefone,
          'cep', NEW.cep,
          'street', NEW.logradouro,
          'number', NEW.numero,
          'district', NEW.bairro,
          'complement', NEW.complemento,
          'city', NEW.cidade,
          'state', NEW.estado
        ),
        'pending'
      );
      
      -- Marcar cliente como pending
      NEW.sync_status := 'pending';
      NEW.sync_updated_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_sync_cliente ON public.clientes;
CREATE TRIGGER trigger_sync_cliente
  BEFORE INSERT OR UPDATE OF razao_social, nome_fantasia, cpf_cnpj, email, telefone, cep, logradouro, numero, bairro, complemento, cidade, estado
  ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sync_job_on_cliente_change();

-- =============================================
-- TRIGGER PARA EQUIPAMENTOS
-- =============================================
CREATE OR REPLACE FUNCTION public.create_sync_job_on_equipment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_client_field_id VARCHAR(100);
BEGIN
  -- Verificar se cliente está sincronizado
  IF NEW.client_id IS NOT NULL THEN
    SELECT field_customer_id INTO v_client_field_id
    FROM public.clientes
    WHERE id = NEW.client_id;
  END IF;

  -- Só cria job se tiver company_id
  IF NEW.company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sync_jobs 
      WHERE entity_type = 'equipment' 
      AND entity_id = NEW.id 
      AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO public.sync_jobs (company_id, entity_type, entity_id, action, payload_json, status)
      VALUES (
        NEW.company_id,
        'equipment',
        NEW.id,
        'upsert',
        jsonb_build_object(
          'serial_number', NEW.serial_number,
          'model', NEW.model,
          'brand', NEW.brand,
          'equipment_type', NEW.equipment_type,
          'client_id', NEW.client_id,
          'field_customer_id', v_client_field_id
        ),
        CASE 
          WHEN v_client_field_id IS NOT NULL THEN 'pending'
          ELSE 'pending' -- Será processado quando cliente sincronizar
        END
      );
      
      NEW.sync_status := 'pending';
      NEW.sync_updated_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_equipment ON public.equipments;
CREATE TRIGGER trigger_sync_equipment
  BEFORE INSERT OR UPDATE OF serial_number, model, brand, equipment_type, client_id
  ON public.equipments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sync_job_on_equipment_change();