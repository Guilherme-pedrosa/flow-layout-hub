import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import type { WaiObserverAlert } from "./useWaiObserver";

export type AlertPriorityLevel = 
  | "strategic_risk"      // Bloquear avanço sem ciência do gestor
  | "economic_risk"       // Banner + alerta
  | "tactical_attention"  // Dashboard
  | "operational_noise";  // Não mostrar

export interface RankedAlert extends WaiObserverAlert {
  priority_rank: number;
  priority_level: AlertPriorityLevel;
  entity_total_loss: number;
  entity_recurrence_count: number;
}

const MAX_VISIBLE_ALERTS = 7;

/**
 * Hook para obter os alertas mais importantes (máximo 7)
 * Implementa a visão executiva: somente alertas com impacto econômico real
 */
export function useTopAlerts() {
  const { currentCompany } = useCompany();
  const [topAlerts, setTopAlerts] = useState<RankedAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTopAlerts = useCallback(async () => {
    if (!currentCompany?.id) return;

    setIsLoading(true);
    try {
      // Usar a função SQL que limita e prioriza
      const { data, error } = await supabase.rpc(
        "ai_get_top_alerts" as any,
        {
          p_company_id: currentCompany.id,
          p_max_alerts: MAX_VISIBLE_ALERTS,
        }
      );

      if (error) throw error;

      // Calcular priority_level para cada alerta
      const rankedAlerts = (data || []).map((alert: Record<string, unknown>, index: number) => {
        const severity = alert.severity as string;
        const potentialLoss = (alert.potential_loss as number) || 0;
        const marginChange = (alert.margin_change_percent as number) || 0;
        const requiresDecision = alert.requires_human_decision as boolean;
        
        // Determinar priority_level
        let priorityLevel: AlertPriorityLevel = "operational_noise";
        const score = (alert.economic_priority_score as number) || 0;
        
        if (score >= 80 || (severity === "critical" && requiresDecision)) {
          priorityLevel = "strategic_risk";
        } else if (score >= 60 || severity === "critical") {
          priorityLevel = "economic_risk";
        } else if (score >= 30 || potentialLoss > 100) {
          priorityLevel = "tactical_attention";
        }

        return {
          ...alert,
          severity: severity as "info" | "warning" | "critical",
          mode: alert.mode as "proactive_event" | "reactive_question" | "economic_analysis",
          impacted_entities: (alert.impacted_entities as Array<{ type: string; id: string; description: string }>) || [],
          priority_rank: index + 1,
          priority_level: priorityLevel,
          entity_total_loss: 0,
          entity_recurrence_count: 0,
        } as RankedAlert;
      });

      // Filtrar operational_noise
      const filteredAlerts = rankedAlerts.filter(
        (a: RankedAlert) => a.priority_level !== "operational_noise"
      );

      setTopAlerts(filteredAlerts);
    } catch (error) {
      console.error("[useTopAlerts] Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchTopAlerts();
  }, [fetchTopAlerts]);

  // Alertas por categoria
  const strategicRisks = topAlerts.filter(a => a.priority_level === "strategic_risk");
  const economicRisks = topAlerts.filter(a => a.priority_level === "economic_risk");
  const tacticalAttention = topAlerts.filter(a => a.priority_level === "tactical_attention");

  // Total de perda potencial
  const totalPotentialLoss = topAlerts.reduce(
    (sum, alert) => sum + (alert.potential_loss || 0),
    0
  );

  return {
    topAlerts,
    strategicRisks,
    economicRisks,
    tacticalAttention,
    totalPotentialLoss,
    isLoading,
    fetchTopAlerts,
    maxAlerts: MAX_VISIBLE_ALERTS,
  };
}
