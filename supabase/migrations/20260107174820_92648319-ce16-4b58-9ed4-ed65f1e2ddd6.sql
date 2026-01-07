-- Dropar funções existentes para recriar com parâmetros corretos
DROP FUNCTION IF EXISTS public.claim_sync_jobs(integer);
DROP FUNCTION IF EXISTS public.reap_stuck_sync_jobs(integer);
DROP FUNCTION IF EXISTS public.get_pending_equipment_jobs_for_customer(uuid, uuid);

-- Função para claim atômico de jobs (evita race condition)
CREATE OR REPLACE FUNCTION public.claim_sync_jobs(p_batch_size INTEGER DEFAULT 10)
RETURNS SETOF public.sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.sync_jobs
  SET 
    status = 'processing',
    processing_started_at = now(),
    updated_at = now()
  WHERE id IN (
    SELECT id FROM public.sync_jobs
    WHERE status IN ('pending', 'error')
      AND next_retry_at <= now()
      AND attempts < max_attempts
    ORDER BY 
      CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
      next_retry_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Função para limpar jobs travados em processing
CREATE OR REPLACE FUNCTION public.reap_stuck_sync_jobs(p_stuck_minutes INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH stuck_jobs AS (
    UPDATE public.sync_jobs
    SET 
      status = 'error',
      last_error = 'Job travado em processing por mais de ' || p_stuck_minutes || ' minutos',
      attempts = attempts + 1,
      next_retry_at = now() + INTERVAL '1 minute' * POWER(2, LEAST(attempts, 6)),
      updated_at = now()
    WHERE status = 'processing'
      AND processing_started_at < now() - (p_stuck_minutes || ' minutes')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM stuck_jobs;
  
  RETURN v_count;
END;
$$;

-- Função para buscar jobs de equipment pendentes por cliente
CREATE OR REPLACE FUNCTION public.get_pending_equipment_jobs_for_customer(
  p_company_id UUID,
  p_client_id UUID
)
RETURNS SETOF public.sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.sync_jobs
  WHERE company_id = p_company_id
    AND entity_type = 'equipment'
    AND status IN ('pending', 'error')
    AND (payload_json->>'client_id')::UUID = p_client_id
  ORDER BY created_at ASC;
END;
$$;

-- Atualizar triggers de cliente
CREATE OR REPLACE FUNCTION public.trigger_sync_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sync_jobs 
      WHERE entity_type = 'customer' 
        AND entity_id = NEW.id 
        AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO public.sync_jobs (
        company_id, entity_type, entity_id, action, payload_json, status
      ) VALUES (
        NEW.company_id,
        'customer',
        NEW.id,
        'upsert',
        jsonb_build_object(
          'id', NEW.id,
          'razao_social', NEW.razao_social,
          'nome_fantasia', NEW.nome_fantasia,
          'cpf_cnpj', NEW.cpf_cnpj,
          'email', NEW.email,
          'telefone', NEW.telefone,
          'logradouro', NEW.logradouro,
          'numero', NEW.numero,
          'complemento', NEW.complemento,
          'bairro', NEW.bairro,
          'cidade', NEW.cidade,
          'estado', NEW.estado,
          'cep', NEW.cep
        ),
        'pending'
      );
      
      NEW.sync_status := 'pending';
      NEW.sync_updated_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_cliente_insert ON public.clientes;
CREATE TRIGGER trigger_sync_cliente_insert
  BEFORE INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_cliente();

DROP TRIGGER IF EXISTS trigger_sync_cliente_update ON public.clientes;
CREATE TRIGGER trigger_sync_cliente_update
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  WHEN (
    OLD.razao_social IS DISTINCT FROM NEW.razao_social OR
    OLD.nome_fantasia IS DISTINCT FROM NEW.nome_fantasia OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.telefone IS DISTINCT FROM NEW.telefone OR
    OLD.logradouro IS DISTINCT FROM NEW.logradouro OR
    OLD.cidade IS DISTINCT FROM NEW.cidade OR
    OLD.estado IS DISTINCT FROM NEW.estado
  )
  EXECUTE FUNCTION public.trigger_sync_cliente();

-- Atualizar triggers de equipamento
CREATE OR REPLACE FUNCTION public.trigger_sync_equipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sync_jobs 
      WHERE entity_type = 'equipment' 
        AND entity_id = NEW.id 
        AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO public.sync_jobs (
        company_id, entity_type, entity_id, action, payload_json, status
      ) VALUES (
        NEW.company_id,
        'equipment',
        NEW.id,
        'upsert',
        jsonb_build_object(
          'id', NEW.id,
          'client_id', NEW.client_id,
          'serial_number', NEW.serial_number,
          'brand', NEW.brand,
          'model', NEW.model,
          'equipment_type', NEW.equipment_type,
          'notes', NEW.notes
        ),
        'pending'
      );
      
      NEW.sync_status := 'pending';
      NEW.sync_updated_at := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_equipment_insert ON public.equipments;
CREATE TRIGGER trigger_sync_equipment_insert
  BEFORE INSERT ON public.equipments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_equipment();

DROP TRIGGER IF EXISTS trigger_sync_equipment_update ON public.equipments;
CREATE TRIGGER trigger_sync_equipment_update
  BEFORE UPDATE ON public.equipments
  FOR EACH ROW
  WHEN (
    OLD.serial_number IS DISTINCT FROM NEW.serial_number OR
    OLD.brand IS DISTINCT FROM NEW.brand OR
    OLD.model IS DISTINCT FROM NEW.model OR
    OLD.client_id IS DISTINCT FROM NEW.client_id
  )
  EXECUTE FUNCTION public.trigger_sync_equipment();