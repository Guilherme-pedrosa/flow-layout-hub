-- Adicionar política de INSERT para service_role poder inserir alertas
CREATE POLICY "Service role can insert alerts"
  ON public.ai_observer_alerts
  FOR INSERT
  WITH CHECK (true);

-- Opcional: Permitir usuários verem todos os campos durante DELETE (para limpeza)
CREATE POLICY "Users can delete alerts from their companies"
  ON public.ai_observer_alerts
  FOR DELETE
  USING (company_id IN (SELECT get_user_companies()));