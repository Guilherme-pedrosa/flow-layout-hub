-- 1. Criar tabela para anexos de financeiro
CREATE TABLE IF NOT EXISTS public.payable_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id UUID NOT NULL REFERENCES public.payables(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.payable_attachments ENABLE ROW LEVEL SECURITY;

-- Política RLS
CREATE POLICY "Usuários acessam payable_attachments da empresa" 
ON public.payable_attachments 
FOR ALL 
USING (company_id IN (SELECT get_user_companies()));

-- 2. Criar tabela para anexos de contas a receber
CREATE TABLE IF NOT EXISTS public.receivable_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID NOT NULL REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.receivable_attachments ENABLE ROW LEVEL SECURITY;

-- Política RLS
CREATE POLICY "Usuários acessam receivable_attachments da empresa" 
ON public.receivable_attachments 
FOR ALL 
USING (company_id IN (SELECT get_user_companies()));

-- 3. Criar bucket para anexos financeiros (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-attachments', 'financial-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de storage
CREATE POLICY "Usuários podem ver anexos financeiros" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'financial-attachments');

CREATE POLICY "Usuários podem fazer upload de anexos financeiros" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'financial-attachments');

CREATE POLICY "Usuários podem deletar anexos financeiros" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'financial-attachments');