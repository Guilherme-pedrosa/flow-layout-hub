-- Tornar company_id nullable na tabela users (usamos user_companies para gerenciar multi-empresas)
ALTER TABLE public.users ALTER COLUMN company_id DROP NOT NULL;