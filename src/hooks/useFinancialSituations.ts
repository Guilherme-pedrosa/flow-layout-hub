import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

export interface FinancialSituation {
  id: string;
  company_id: string;
  name: string;
  color: string;
  is_default: boolean;
  confirms_payment: boolean;
  allows_editing: boolean;
  allows_manual_change: boolean;
  is_active: boolean;
  sort_order: number;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialSituationInput {
  name: string;
  color: string;
  is_default?: boolean;
  confirms_payment?: boolean;
  allows_editing?: boolean;
  allows_manual_change?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export function useFinancialSituations() {
  const { currentCompany } = useCompany();
  const [situations, setSituations] = useState<FinancialSituation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSituations = useCallback(async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("financial_situations")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setSituations((data as FinancialSituation[]) || []);
    } catch (error) {
      console.error("Erro ao carregar situações:", error);
      toast.error("Erro ao carregar situações financeiras");
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchSituations();
  }, [fetchSituations]);

  const createSituation = async (input: FinancialSituationInput) => {
    if (!currentCompany?.id) {
      toast.error("Empresa não selecionada");
      return null;
    }

    try {
      // Se marcando como padrão, desmarcar os outros
      if (input.is_default) {
        await supabase
          .from("financial_situations")
          .update({ is_default: false })
          .eq("company_id", currentCompany.id);
      }

      const { data, error } = await supabase
        .from("financial_situations")
        .insert({
          company_id: currentCompany.id,
          name: input.name,
          color: input.color,
          is_default: input.is_default ?? false,
          confirms_payment: input.confirms_payment ?? false,
          allows_editing: input.allows_editing ?? true,
          allows_manual_change: input.allows_manual_change ?? true,
          is_active: input.is_active ?? true,
          sort_order: input.sort_order ?? (situations.length + 1),
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Situação criada com sucesso");
      await fetchSituations();
      return data as FinancialSituation;
    } catch (error) {
      console.error("Erro ao criar situação:", error);
      toast.error("Erro ao criar situação");
      return null;
    }
  };

  const updateSituation = async (id: string, input: Partial<FinancialSituationInput>) => {
    if (!currentCompany?.id) return false;

    try {
      // Se marcando como padrão, desmarcar os outros
      if (input.is_default) {
        await supabase
          .from("financial_situations")
          .update({ is_default: false })
          .eq("company_id", currentCompany.id)
          .neq("id", id);
      }

      const { error } = await supabase
        .from("financial_situations")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Situação atualizada");
      await fetchSituations();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar situação:", error);
      toast.error("Erro ao atualizar situação");
      return false;
    }
  };

  const deleteSituation = async (id: string) => {
    try {
      // Verificar se está em uso
      const { count: payablesCount } = await supabase
        .from("payables")
        .select("id", { count: "exact", head: true })
        .eq("financial_situation_id", id);

      const { count: receivablesCount } = await supabase
        .from("accounts_receivable")
        .select("id", { count: "exact", head: true })
        .eq("situation_id", id);

      const totalUsage = (payablesCount || 0) + (receivablesCount || 0);

      if (totalUsage > 0) {
        toast.error(`Não é possível excluir: situação em uso em ${totalUsage} registro(s)`);
        return false;
      }

      const { error } = await supabase
        .from("financial_situations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Situação excluída");
      await fetchSituations();
      return true;
    } catch (error) {
      console.error("Erro ao excluir situação:", error);
      toast.error("Erro ao excluir situação");
      return false;
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    return updateSituation(id, { is_active: isActive });
  };

  // Buscar situação padrão (para novas contas)
  const getDefaultSituation = useCallback(() => {
    return situations.find(s => s.is_default && s.is_active);
  }, [situations]);

  // Buscar situação "Enviado para Aprovação"
  const getSentForApprovalSituation = useCallback(() => {
    return situations.find(s => s.name === "Enviado para Aprovação" && s.is_active);
  }, [situations]);

  // Buscar situação "Pago" (confirms_payment = true, allows_manual_change = false)
  const getPaidSituation = useCallback(() => {
    return situations.find(s => s.confirms_payment && !s.allows_manual_change && s.is_active);
  }, [situations]);

  // Buscar situações que permitem mudança manual
  const getManualChangeableSituations = useCallback(() => {
    return situations.filter(s => s.allows_manual_change && s.is_active);
  }, [situations]);

  // Buscar situação de "Vencido"
  const getOverdueSituation = useCallback(() => {
    return situations.find(s => s.name.toLowerCase().includes("vencido") && s.is_active);
  }, [situations]);

  return {
    situations,
    loading,
    fetchSituations,
    createSituation,
    updateSituation,
    deleteSituation,
    toggleActive,
    getDefaultSituation,
    getSentForApprovalSituation,
    getPaidSituation,
    getManualChangeableSituations,
    getOverdueSituation,
  };
}
