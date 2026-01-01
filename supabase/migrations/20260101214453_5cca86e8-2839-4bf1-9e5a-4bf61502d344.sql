-- Adicionar campo para configurar qual status abre OS no Field Control
ALTER TABLE service_order_statuses 
  ADD COLUMN IF NOT EXISTS opens_field_activity BOOLEAN DEFAULT false;

-- Marcar o status "OS APROVADA" para abrir no Field
UPDATE service_order_statuses 
SET opens_field_activity = true 
WHERE LOWER(name) LIKE '%aprovad%';

-- Verificar/corrigir RLS da tabela service_order_statuses
DROP POLICY IF EXISTS "Usuários acessam service_order_statuses da empresa" ON service_order_statuses;

CREATE POLICY "Usuários acessam service_order_statuses da empresa"
ON service_order_statuses FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));