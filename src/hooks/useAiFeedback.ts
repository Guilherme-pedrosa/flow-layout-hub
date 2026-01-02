import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FeedbackAction = "dismissed" | "actioned" | "ignored" | "escalated";

interface RecordFeedbackParams {
  alertId: string;
  action: FeedbackAction;
  feedbackScore?: number; // -2 a 2
  notes?: string;
}

export function useAiFeedback() {
  /**
   * Registra feedback humano no sistema
   * A IA aprende com base nessas ações:
   * - dismissed = falso positivo (reduz sensibilidade)
   * - actioned = alerta válido (mantém/aumenta sensibilidade)
   * - ignored = baixo valor (reduz prioridade)
   * - escalated = problema grave (aumenta severidade)
   */
  const recordFeedback = useCallback(async ({
    alertId,
    action,
    feedbackScore,
    notes,
  }: RecordFeedbackParams) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Usar chamada direta pois a função foi criada recentemente
      const { data, error } = await supabase.rpc(
        "ai_record_feedback" as any,
        {
          p_alert_id: alertId,
          p_action: action,
          p_feedback_score: feedbackScore ?? null,
          p_notes: notes ?? null,
          p_user_id: userData?.user?.id ?? null,
        }
      );

      if (error) throw error;

      const result = data as { success: boolean; action?: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || "Erro ao registrar feedback");
      }

      // Mensagens específicas por tipo de ação
      const messages: Record<FeedbackAction, string> = {
        dismissed: "Alerta marcado como falso positivo",
        actioned: "Ação registrada com sucesso",
        ignored: "Alerta ignorado",
        escalated: "Alerta escalado para decisão humana",
      };

      toast.success(messages[action]);
      return true;
    } catch (error) {
      console.error("[useAiFeedback] Error:", error);
      toast.error("Erro ao registrar feedback");
      return false;
    }
  }, []);

  /**
   * Dispensa alerta como falso positivo
   */
  const dismissAsFalsePositive = useCallback(async (alertId: string, notes?: string) => {
    return recordFeedback({
      alertId,
      action: "dismissed",
      feedbackScore: -1,
      notes: notes || "Falso positivo identificado pelo usuário",
    });
  }, [recordFeedback]);

  /**
   * Marca alerta como acionado (ação tomada)
   */
  const markAsActioned = useCallback(async (alertId: string, actionDescription: string) => {
    return recordFeedback({
      alertId,
      action: "actioned",
      feedbackScore: 1,
      notes: actionDescription,
    });
  }, [recordFeedback]);

  /**
   * Ignora alerta (baixa prioridade)
   */
  const ignoreAlert = useCallback(async (alertId: string) => {
    return recordFeedback({
      alertId,
      action: "ignored",
      feedbackScore: 0,
    });
  }, [recordFeedback]);

  /**
   * Escala alerta para decisão humana obrigatória
   */
  const escalateAlert = useCallback(async (alertId: string, notes?: string) => {
    return recordFeedback({
      alertId,
      action: "escalated",
      feedbackScore: 2,
      notes,
    });
  }, [recordFeedback]);

  return {
    recordFeedback,
    dismissAsFalsePositive,
    markAsActioned,
    ignoreAlert,
    escalateAlert,
  };
}
