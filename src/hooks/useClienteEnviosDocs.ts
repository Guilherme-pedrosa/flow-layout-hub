import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

import { Json } from "@/integrations/supabase/types";

export interface EnvioDoc {
  id: string;
  cliente_id: string;
  colaborador_id: string;
  company_id: string;
  destinatario_email: string;
  assunto: string;
  documentos_enviados: Json;
  status: string;
  enviado_por: string | null;
  enviado_por_nome: string | null;
  created_at: string;
}

export function useClienteEnviosDocs(clienteId: string) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: envios = [], isLoading } = useQuery({
    queryKey: ['cliente_envios_docs', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente_envios_docs')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EnvioDoc[];
    },
    enabled: !!clienteId,
  });

  const registrarEnvio = useMutation({
    mutationFn: async (data: {
      colaborador_id: string;
      destinatario_email: string;
      assunto: string;
      documentos_enviados: { tipo: string; nome: string }[];
      enviado_por_nome: string | null;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('cliente_envios_docs')
        .insert({
          cliente_id: clienteId,
          colaborador_id: data.colaborador_id,
          company_id: currentCompany.id,
          destinatario_email: data.destinatario_email,
          assunto: data.assunto,
          documentos_enviados: data.documentos_enviados,
          status: 'enviado',
          enviado_por: user?.user?.id || null,
          enviado_por_nome: data.enviado_por_nome,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente_envios_docs', clienteId] });
    },
    onError: (error: Error) => toast.error('Erro ao registrar envio: ' + error.message),
  });

  // Buscar último envio por colaborador
  const getUltimoEnvio = (colaboradorId: string): EnvioDoc | undefined => {
    return envios.find(e => e.colaborador_id === colaboradorId);
  };

  return {
    envios,
    isLoading,
    registrarEnvio,
    getUltimoEnvio,
  };
}
