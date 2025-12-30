-- Adicionar coluna allows_manual_change na tabela financial_situations
ALTER TABLE public.financial_situations 
ADD COLUMN IF NOT EXISTS allows_manual_change BOOLEAN NOT NULL DEFAULT true;

-- Adicionar coluna display_order se não existir (para manter compatibilidade com PDF)
ALTER TABLE public.financial_situations 
ADD COLUMN IF NOT EXISTS display_order INT;

-- Copiar valores de sort_order para display_order se existir
UPDATE public.financial_situations SET display_order = sort_order WHERE display_order IS NULL;

-- Adicionar situation_id em accounts_receivable se não existir
ALTER TABLE public.accounts_receivable 
ADD COLUMN IF NOT EXISTS situation_id UUID REFERENCES public.financial_situations(id);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_payables_situation_id ON public.payables(financial_situation_id);
CREATE INDEX IF NOT EXISTS idx_receivables_situation_id ON public.accounts_receivable(situation_id);

-- Atualizar a situação "Pago" para não permitir mudança manual (só IA pode mudar)
UPDATE public.financial_situations 
SET allows_manual_change = false, confirms_payment = true 
WHERE name = 'Pago';

-- Inserir situação "Pago Manual" para cada empresa que não tem
INSERT INTO public.financial_situations (company_id, name, color, is_default, confirms_payment, allows_editing, allows_manual_change, sort_order)
SELECT DISTINCT 
  c.id,
  'Pago Manual',
  '#16A34A',
  false,
  true,
  false,
  true,
  6
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_situations fs 
  WHERE fs.company_id = c.id AND fs.name = 'Pago Manual'
);

-- Inserir situação "Cancelado" para cada empresa que não tem
INSERT INTO public.financial_situations (company_id, name, color, is_default, confirms_payment, allows_editing, allows_manual_change, sort_order)
SELECT DISTINCT 
  c.id,
  'Cancelado',
  '#6B7280',
  false,
  false,
  false,
  true,
  7
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_situations fs 
  WHERE fs.company_id = c.id AND fs.name = 'Cancelado'
);

-- Trigger para proteger situações automáticas (só service_role pode mudar para situações com allows_manual_change = false)
CREATE OR REPLACE FUNCTION check_situation_change()
RETURNS TRIGGER AS $$
DECLARE
  new_situation RECORD;
BEGIN
  -- Se a situação está mudando
  IF NEW.financial_situation_id IS DISTINCT FROM OLD.financial_situation_id AND NEW.financial_situation_id IS NOT NULL THEN
    SELECT * INTO new_situation
    FROM public.financial_situations
    WHERE id = NEW.financial_situation_id;
    
    -- Se a nova situação não permite mudança manual
    IF new_situation.allows_manual_change = false THEN
      -- Verificar se é uma chamada de service_role (IA/backend)
      IF current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Esta situação só pode ser atribuída automaticamente pelo sistema';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS protect_automatic_situations ON public.payables;
CREATE TRIGGER protect_automatic_situations
BEFORE UPDATE ON public.payables
FOR EACH ROW EXECUTE FUNCTION check_situation_change();