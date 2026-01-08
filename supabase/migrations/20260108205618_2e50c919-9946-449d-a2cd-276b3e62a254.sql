-- Remover check constraint antigo
ALTER TABLE public.chamados DROP CONSTRAINT IF EXISTS chamados_status_check;

-- Adicionar novos campos na tabela chamados para ser idêntico ao ecolab-chamados
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS numero_tarefa TEXT,
ADD COLUMN IF NOT EXISTS data_atendimento DATE,
ADD COLUMN IF NOT EXISTS data_fechamento DATE,
ADD COLUMN IF NOT EXISTS nome_gt TEXT,
ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Atualizar os status existentes para o novo formato
UPDATE public.chamados SET status = 'aguardando_agendamento' WHERE status = 'aberto' OR status = 'pendente';
UPDATE public.chamados SET status = 'agendado' WHERE status = 'em_execucao' OR status = 'em_andamento';
UPDATE public.chamados SET status = 'fechado' WHERE status = 'concluido';

-- Criar novo check constraint com os novos valores
ALTER TABLE public.chamados ADD CONSTRAINT chamados_status_check 
CHECK (status IN ('aguardando_agendamento', 'agendado', 'ag_retorno', 'atendido_ag_fechamento', 'fechado'));

-- Criar tabela de evoluções (igual ao ecolab-chamados)
CREATE TABLE IF NOT EXISTS public.chamado_evolucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  status_anterior TEXT,
  status_novo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  company_id UUID NOT NULL REFERENCES public.companies(id)
);

-- Enable RLS
ALTER TABLE public.chamado_evolucoes ENABLE ROW LEVEL SECURITY;

-- Policies para chamado_evolucoes
CREATE POLICY "Users can view evolucoes of their company" 
ON public.chamado_evolucoes 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can create evolucoes for their company" 
ON public.chamado_evolucoes 
FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update evolucoes of their company" 
ON public.chamado_evolucoes 
FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete evolucoes of their company" 
ON public.chamado_evolucoes 
FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.users WHERE auth_id = auth.uid()));