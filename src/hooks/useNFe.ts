import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotaFiscal {
  id: string;
  company_id: string | null;
  sale_id: string | null;
  referencia: string;
  tipo: string;
  status: string;
  status_sefaz: string | null;
  mensagem_sefaz: string | null;
  chave_nfe: string | null;
  numero: string | null;
  serie: string | null;
  protocolo: string | null;
  valor_total: number | null;
  valor_produtos: number | null;
  xml_url: string | null;
  danfe_url: string | null;
  destinatario_nome: string | null;
  destinatario_cpf_cnpj: string | null;
  natureza_operacao: string | null;
  data_emissao: string | null;
  data_autorizacao: string | null;
  data_cancelamento: string | null;
  justificativa_cancelamento: string | null;
  created_at: string;
  updated_at: string;
}

export function useNFe() {
  const queryClient = useQueryClient();
  const [isEmitting, setIsEmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Listar NFes
  const { data: nfes = [], isLoading, refetch } = useQuery({
    queryKey: ["notas_fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NotaFiscal[];
    }
  });

  // Emitir NFe para uma venda
  const emitirNFe = async (saleId: string, companyId?: string) => {
    setIsEmitting(true);
    
    try {
      // Buscar company_id se não fornecido
      let finalCompanyId = companyId;
      if (!finalCompanyId) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id")
          .limit(1)
          .single();
        
        finalCompanyId = companies?.id;
      }

      if (!finalCompanyId) {
        throw new Error("Empresa não configurada");
      }

      const { data, error } = await supabase.functions.invoke("focusnfe", {
        body: {
          action: "emitir",
          saleId,
          companyId: finalCompanyId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`NFe ${data.numero} emitida com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        return data;
      } else {
        throw new Error(data.error || "Erro ao emitir NFe");
      }
    } catch (error: any) {
      console.error("Erro ao emitir NFe:", error);
      toast.error(error.message || "Erro ao emitir NFe");
      throw error;
    } finally {
      setIsEmitting(false);
    }
  };

  // Consultar NFe
  const consultarNFe = async (referencia: string) => {
    const { data, error } = await supabase.functions.invoke("focusnfe", {
      body: {
        action: "consultar",
        referencia
      }
    });

    if (error) throw error;
    return data;
  };

  // Cancelar NFe
  const cancelarNFe = async (nfeId: string, justificativa: string) => {
    setIsCancelling(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("focusnfe", {
        body: {
          action: "cancelar",
          nfeId,
          justificativa
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("NFe cancelada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
        return data;
      } else {
        throw new Error(data.error || "Erro ao cancelar NFe");
      }
    } catch (error: any) {
      console.error("Erro ao cancelar NFe:", error);
      toast.error(error.message || "Erro ao cancelar NFe");
      throw error;
    } finally {
      setIsCancelling(false);
    }
  };

  // Buscar NFe por venda
  const getNFeBySale = (saleId: string) => {
    return nfes.find(nfe => nfe.sale_id === saleId);
  };

  return {
    nfes,
    isLoading,
    isEmitting,
    isCancelling,
    emitirNFe,
    consultarNFe,
    cancelarNFe,
    getNFeBySale,
    refetch
  };
}
