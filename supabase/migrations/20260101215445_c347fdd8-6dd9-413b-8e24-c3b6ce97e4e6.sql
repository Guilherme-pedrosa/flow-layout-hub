-- Adicionar novos valores ao enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'vendedor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'estoque';

-- Adicionar coluna de senha temporária para usuários (hash)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash text,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;