-- Criar RPC alternativa que busca de bank_transactions (onde o Inter salva)
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
SET search_path = public
AS $$
  SELECT
    count(*) as tx_count,
    COALESCE(sum(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_in,
    COALESCE(sum(CASE WHEN amount < 0 THEN abs(amount) ELSE 0 END), 0) as total_out,
    COALESCE(sum(amount), 0) as net,
    min(transaction_date::date) as first_date,
    max(transaction_date::date) as last_date
  FROM public.bank_transactions
  WHERE company_id = p_company_id
    AND transaction_date::date BETWEEN p_date_from AND p_date_to;
$$;

-- Manter grants
GRANT EXECUTE ON FUNCTION public.get_bank_tx_summary(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bank_tx_summary(uuid, date, date) TO service_role;