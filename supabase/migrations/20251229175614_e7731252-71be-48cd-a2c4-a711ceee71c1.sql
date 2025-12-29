-- Criar tabela para boletos DDA
CREATE TABLE public.inter_dda_boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  
  -- Dados do boleto DDA
  linha_digitavel TEXT NOT NULL,
  codigo_barras TEXT,
  valor NUMERIC NOT NULL,
  valor_final NUMERIC,
  data_vencimento DATE NOT NULL,
  data_emissao DATE,
  
  -- Dados do beneficiário (quem emitiu o boleto)
  beneficiario_nome TEXT,
  beneficiario_documento TEXT,
  beneficiario_banco TEXT,
  
  -- Dados do pagador (sua empresa)
  pagador_nome TEXT,
  pagador_documento TEXT,
  
  -- Controle
  status TEXT NOT NULL DEFAULT 'pending', -- pending, imported, paid, cancelled
  imported_to_payable_id UUID REFERENCES public.payables(id),
  imported_at TIMESTAMPTZ,
  
  -- Dados da sincronização
  external_id TEXT, -- ID do provedor de DDA
  raw_data JSONB,
  synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_inter_dda_boletos_company ON public.inter_dda_boletos(company_id);
CREATE INDEX idx_inter_dda_boletos_status ON public.inter_dda_boletos(status);
CREATE INDEX idx_inter_dda_boletos_vencimento ON public.inter_dda_boletos(data_vencimento);
CREATE UNIQUE INDEX idx_inter_dda_boletos_linha ON public.inter_dda_boletos(company_id, linha_digitavel);

-- RLS
ALTER TABLE public.inter_dda_boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público para inter_dda_boletos" 
ON public.inter_dda_boletos 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Adicionar campo source na payables para identificar origem
ALTER TABLE public.payables 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Trigger para updated_at
CREATE TRIGGER update_inter_dda_boletos_updated_at
BEFORE UPDATE ON public.inter_dda_boletos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();