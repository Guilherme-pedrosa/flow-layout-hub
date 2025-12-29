-- Create table for purchase order limits configuration
CREATE TABLE public.purchase_order_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  max_per_transaction NUMERIC NULL,
  max_monthly_total NUMERIC NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.purchase_order_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching existing pattern)
CREATE POLICY "Acesso público para purchase_order_limits"
ON public.purchase_order_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_purchase_order_limits_updated_at
BEFORE UPDATE ON public.purchase_order_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment explaining the table
COMMENT ON TABLE public.purchase_order_limits IS 'Limites de valor para pedidos de compra por usuário';
COMMENT ON COLUMN public.purchase_order_limits.user_id IS 'NULL = limite global para todos os usuários da empresa';
COMMENT ON COLUMN public.purchase_order_limits.max_per_transaction IS 'Limite máximo por transação individual';
COMMENT ON COLUMN public.purchase_order_limits.max_monthly_total IS 'Limite máximo mensal (soma de todos os pedidos)';