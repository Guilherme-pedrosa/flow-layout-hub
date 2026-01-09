-- RPC para sumário de transações bancárias sincronizadas
CREATE OR REPLACE FUNCTION public.get_bank_tx_summary(
  p_company_id uuid,
  p_date_from date,
  p_date_to date
)
RETURNS TABLE (
  tx_count bigint,
  total_in numeric,
  total_out numeric,
  net numeric,
  first_date date,
  last_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    count(*) as tx_count,
    COALESCE(sum(CASE WHEN direction='in' OR direction='credit' THEN amount ELSE 0 END),0) as total_in,
    COALESCE(sum(CASE WHEN direction='out' OR direction='debit' THEN abs(amount) ELSE 0 END),0) as total_out,
    COALESCE(sum(CASE WHEN direction='in' OR direction='credit' THEN amount ELSE -abs(amount) END),0) as net,
    min(posted_at::date) as first_date,
    max(posted_at::date) as last_date
  FROM public.bank_transactions_synced
  WHERE company_id = p_company_id
    AND posted_at::date BETWEEN p_date_from AND p_date_to;
$$;

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_bank_tx_summary(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bank_tx_summary(uuid, date, date) TO service_role;