import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface DecisionOption {
  label: string;
  risk_level: "low" | "medium" | "high";
  economic_effect: string;
}

export function useAiDecisionLog() {
  const { currentCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(false);

  const recordDecision = async (
    alertId: string,
    decisionType: string,
    decisionLabel: string,
    notes?: string
  ): Promise<boolean> => {
    if (!currentCompany) {
      toast.error("Empresa não selecionada");
      return false;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("ai_decision_log")
        .insert({
          company_id: currentCompany.id,
          alert_id: alertId,
          decision_type: decisionType,
          decision_label: decisionLabel,
          decided_by: user?.id || null,
          notes: notes || null,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from("ai_observer_alerts")
        .update({
          is_actioned: true,
          actioned_at: new Date().toISOString(),
          actioned_by: user?.id || null,
          action_taken: decisionLabel,
        })
        .eq("id", alertId);

      if (updateError) throw updateError;

      toast.success("Decisão registrada com sucesso");
      return true;
    } catch (error) {
      console.error("Error recording decision:", error);
      toast.error("Erro ao registrar decisão");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { recordDecision, isLoading };
}
