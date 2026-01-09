
-- Corrigir a função get_bank_tx_summary removendo a conversão de timezone desnecessária
-- A coluna transaction_date já é do tipo DATE, não precisa converter
CREATE OR REPLACE FUNCTION public.get_bank_tx_summary(p_company_id uuid, p_date_from date, p_date_to date)
 RETURNS TABLE(tx_count bigint, total_in numeric, total_out numeric, net numeric, first_date date, last_date date)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COUNT(*) AS tx_count,
    COALESCE(SUM(
      CASE
        WHEN amount > 0 THEN amount
        ELSE 0
      END
    ), 0) AS total_in,
    COALESCE(SUM(
      CASE
        WHEN amount < 0 THEN abs(amount)
        ELSE 0
      END
    ), 0) AS total_out,
    COALESCE(SUM(amount), 0) AS net,
    MIN(transaction_date) AS first_date,
    MAX(transaction_date) AS last_date
  FROM bank_transactions
  WHERE company_id = p_company_id
    AND transaction_date BETWEEN p_date_from AND p_date_to;
$function$;
