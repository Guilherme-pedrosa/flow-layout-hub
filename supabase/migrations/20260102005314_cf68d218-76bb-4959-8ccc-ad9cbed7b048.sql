-- Add field_control_api_key column to system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS field_control_api_key TEXT;