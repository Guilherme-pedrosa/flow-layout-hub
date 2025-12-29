-- Add is_forecast field to payables to track provisional vs effective
ALTER TABLE public.payables 
ADD COLUMN IF NOT EXISTS is_forecast boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS forecast_converted_at timestamp with time zone;

-- Add comment explaining the field
COMMENT ON COLUMN public.payables.is_forecast IS 'True when payable is a forecast/provisional, false when effective';
COMMENT ON COLUMN public.payables.forecast_converted_at IS 'Timestamp when forecast was converted to effective payable';