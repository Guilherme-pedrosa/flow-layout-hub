import { supabase } from "@/integrations/supabase/client";
import { NFEData, CTEData, Parcela } from "@/components/compras/types";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

export interface PayableInsert {
  company_id: string;
  supplier_id: string;
  purchase_order_id?: string;
  amount: number;
  due_date: string;
  document_type: string;
  document_number?: string;
  description?: string;
  chart_account_id?: string;
  cost_center_id?: string;
  is_forecast?: boolean;
  recipient_name?: string;
  recipient_document?: string;
}

export interface GeneratePayablesParams {
  nfeData: NFEData;
  cteData?: CTEData | null;
  orderId: string;
  supplierId: string;
  carrierId?: string | null;
  chartAccountId?: string;
  costCenterId?: string;
  skipForecasts?: boolean;
}

/**
 * Hook para gerar contas a pagar de NF-e e CT-e
 */
export function usePayablesGeneration() {
  const { currentCompany } = useCompany();

  /**
   * Gera contas a pagar do fornecedor (NF-e) e da transportadora (CT-e)
   */
  async function generatePayables(params: GeneratePayablesParams): Promise<{
    supplierPayablesCount: number;
    carrierPayableCreated: boolean;
    errors: string[];
  }> {
    const {
      nfeData,
      cteData,
      orderId,
      supplierId,
      carrierId,
      chartAccountId,
      costCenterId,
      skipForecasts = false,
    } = params;

    if (!currentCompany?.id) {
      return { supplierPayablesCount: 0, carrierPayableCreated: false, errors: ["Empresa não selecionada"] };
    }

    const errors: string[] = [];
    let supplierPayablesCount = 0;
    let carrierPayableCreated = false;

    try {
      // 1. CONTA(S) DO FORNECEDOR (NF-e)
      // Usar parcelas da NF-e se disponíveis, senão criar uma única parcela
      const parcelas = nfeData.financeiro?.parcelas || [];
      
      if (parcelas.length > 0) {
        // Criar uma conta a pagar para cada parcela
        // Notas importadas via XML SEMPRE geram contas reais (não previsões)
        const payables: PayableInsert[] = parcelas.map((parcela, index) => ({
          company_id: currentCompany.id,
          supplier_id: supplierId,
          purchase_order_id: orderId,
          amount: parcela.valor,
          due_date: parcela.dataVencimento,
          document_type: "nfe",
          document_number: `${nfeData.nota.numero}/${parcela.numero || index + 1}`,
          description: `NF-e ${nfeData.nota.numero} - Parcela ${parcela.numero || index + 1}`,
          chart_account_id: chartAccountId || undefined,
          cost_center_id: costCenterId || undefined,
          is_forecast: false, // Notas XML sempre geram contas reais, não previsões
          recipient_name: nfeData.fornecedor.razaoSocial,
          recipient_document: nfeData.fornecedor.cnpj,
        }));

        const { data, error } = await supabase
          .from("payables")
          .insert(payables)
          .select("id");

        if (error) {
          errors.push(`Erro ao criar contas do fornecedor: ${error.message}`);
        } else {
          supplierPayablesCount = data?.length || 0;
        }
      } else if (nfeData.nota.valorTotal > 0) {
        // Se não há parcelas, criar uma única conta com vencimento padrão (30 dias)
        const dueDate = format(addDays(new Date(nfeData.nota.dataEmissao || new Date()), 30), 'yyyy-MM-dd');

        // Notas importadas via XML SEMPRE geram contas reais (não previsões)
        const { error } = await supabase
          .from("payables")
          .insert({
            company_id: currentCompany.id,
            supplier_id: supplierId,
            purchase_order_id: orderId,
            amount: nfeData.nota.valorTotal,
            due_date: dueDate,
            document_type: "nfe",
            document_number: nfeData.nota.numero,
            description: `NF-e ${nfeData.nota.numero} - ${nfeData.fornecedor.razaoSocial}`,
            chart_account_id: chartAccountId || undefined,
            cost_center_id: costCenterId || undefined,
            is_forecast: false, // Notas XML sempre geram contas reais, não previsões
            recipient_name: nfeData.fornecedor.razaoSocial,
            recipient_document: nfeData.fornecedor.cnpj,
          });

        if (error) {
          errors.push(`Erro ao criar conta do fornecedor: ${error.message}`);
        } else {
          supplierPayablesCount = 1;
        }
      }

      // 2. CONTA DA TRANSPORTADORA (CT-e)
      // Apenas se houver CT-e importado com valor > 0 E a transportadora estiver cadastrada
      if (cteData && cteData.valorTotal > 0 && carrierId) {
        // Vencimento padrão: 30 dias da emissão do CT-e
        const cteDueDate = cteData.dataEmissao 
          ? format(addDays(new Date(cteData.dataEmissao), 30), 'yyyy-MM-dd')
          : format(addDays(new Date(), 30), 'yyyy-MM-dd');

        const carrierPayable: PayableInsert = {
          company_id: currentCompany.id,
          supplier_id: carrierId,
          purchase_order_id: orderId,
          amount: cteData.valorTotal,
          due_date: cteDueDate,
          document_type: "cte",
          document_number: cteData.numero,
          description: `CT-e ${cteData.numero} - Frete - ${cteData.emit?.razaoSocial || 'Transportadora'}`,
          chart_account_id: chartAccountId || undefined,
          cost_center_id: costCenterId || undefined,
          is_forecast: false,
          recipient_name: cteData.emit?.razaoSocial || 'Transportadora',
          recipient_document: cteData.emit?.cnpj || '',
        };

        const { error } = await supabase
          .from("payables")
          .insert(carrierPayable);

        if (error) {
          errors.push(`Erro ao criar conta da transportadora: ${error.message}`);
        } else {
          carrierPayableCreated = true;
        }
      } else if (cteData && cteData.valorTotal > 0 && !carrierId) {
        // Se tem CT-e mas a transportadora não foi vinculada, adiciona um erro informativo
        errors.push("A conta a pagar do frete (CT-e) não foi gerada porque a transportadora não foi cadastrada ou vinculada.");
        toast.warning("Conta do frete não gerada: vincule a transportadora primeiro.");
      }

      return { supplierPayablesCount, carrierPayableCreated, errors };

    } catch (error: any) {
      errors.push(`Erro geral: ${error.message}`);
      return { supplierPayablesCount, carrierPayableCreated, errors };
    }
  }

  /**
   * Verifica se já existem contas a pagar para um pedido
   */
  async function checkExistingPayables(orderId: string): Promise<number> {
    const { count } = await supabase
      .from("payables")
      .select("id", { count: 'exact', head: true })
      .eq("purchase_order_id", orderId);
    
    return count || 0;
  }

  /**
   * Remove contas a pagar de um pedido (para reimportação)
   */
  async function deletePayables(orderId: string): Promise<boolean> {
    const { error } = await supabase
      .from("payables")
      .delete()
      .eq("purchase_order_id", orderId)
      .eq("is_paid", false);
    
    if (error) {
      toast.error(`Erro ao remover contas a pagar: ${error.message}`);
      return false;
    }
    return true;
  }

  return {
    generatePayables,
    checkExistingPayables,
    deletePayables,
  };
}
