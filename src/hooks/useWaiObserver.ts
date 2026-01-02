import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface WaiObserverAlert {
  id: string;
  company_id: string;
  event_type: string;
  event_source_id: string | null;
  event_source_type: string | null;
  severity: "info" | "warning" | "critical";
  mode: "proactive_event" | "reactive_question" | "economic_analysis";
  economic_reason: string;
  margin_before: number | null;
  margin_after: number | null;
  margin_change_percent: number | null;
  potential_loss: number | null;
  impacted_entities: Array<{ type: string; id: string; description: string }>;
  recommendation: string | null;
  requires_human_decision: boolean;
  is_read: boolean;
  is_dismissed: boolean;
  is_actioned: boolean;
  actioned_at: string | null;
  actioned_by: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}

interface TriggerEventParams {
  eventType: string;
  eventSourceId?: string;
  eventSourceType?: string;
}

interface AskQuestionParams {
  question: string;
}

export function useWaiObserver() {
  const { currentCompany } = useCompany();
  const [alerts, setAlerts] = useState<WaiObserverAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Buscar alertas
  const fetchAlerts = useCallback(async () => {
    if (!currentCompany?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_observer_alerts")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Type assertion para converter os dados
      const typedAlerts = (data || []).map((alert: Record<string, unknown>) => ({
        ...alert,
        severity: alert.severity as "info" | "warning" | "critical",
        mode: alert.mode as "proactive_event" | "reactive_question" | "economic_analysis",
        impacted_entities: (alert.impacted_entities as Array<{ type: string; id: string; description: string }>) || [],
      })) as WaiObserverAlert[];

      setAlerts(typedAlerts);
      setUnreadCount(typedAlerts.filter(a => !a.is_read).length);
    } catch (error) {
      console.error("[useWaiObserver] Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  // Disparar evento para IA analisar
  const triggerEvent = useCallback(async ({ eventType, eventSourceId, eventSourceType }: TriggerEventParams) => {
    if (!currentCompany?.id) return null;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wai-observer", {
        body: {
          mode: "proactive_event",
          companyId: currentCompany.id,
          eventType,
          eventSourceId,
          eventSourceType,
        },
      });

      if (error) throw error;

      if (data?.alert_generated) {
        toast.success("WAI Observer detectou algo importante", {
          description: data.alert?.economic_reason?.substring(0, 100) + "...",
        });
      }

      return data;
    } catch (error) {
      console.error("[useWaiObserver] Trigger error:", error);
      toast.error("Erro ao analisar evento");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentCompany?.id]);

  // Fazer pergunta para IA
  const askQuestion = useCallback(async ({ question }: AskQuestionParams) => {
    if (!currentCompany?.id) return null;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wai-observer", {
        body: {
          mode: "reactive_question",
          companyId: currentCompany.id,
          question,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("[useWaiObserver] Question error:", error);
      toast.error("Erro ao processar pergunta");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentCompany?.id]);

  // Análise econômica completa
  const runEconomicAnalysis = useCallback(async () => {
    if (!currentCompany?.id) return null;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wai-observer", {
        body: {
          mode: "economic_analysis",
          companyId: currentCompany.id,
        },
      });

      if (error) throw error;

      if (data?.alert_generated) {
        toast.success("Análise econômica concluída", {
          description: "Novos alertas foram gerados",
        });
        await fetchAlerts();
      } else {
        toast.info("Análise concluída", {
          description: data?.reason || "Nenhum problema detectado",
        });
      }

      return data;
    } catch (error) {
      console.error("[useWaiObserver] Analysis error:", error);
      toast.error("Erro na análise econômica");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentCompany?.id, fetchAlerts]);

  // Marcar como lido
  const markAsRead = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("ai_observer_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a => (a.id === alertId ? { ...a, is_read: true } : a))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("[useWaiObserver] Mark read error:", error);
    }
  }, []);

  // Dispensar alerta
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("ai_observer_alerts")
        .update({ is_dismissed: true })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setUnreadCount(prev => {
        const alert = alerts.find(a => a.id === alertId);
        return alert && !alert.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error("[useWaiObserver] Dismiss error:", error);
    }
  }, [alerts]);

  // Registrar ação tomada
  const recordAction = useCallback(async (alertId: string, actionTaken: string) => {
    try {
      const { error } = await supabase
        .from("ai_observer_alerts")
        .update({
          is_actioned: true,
          actioned_at: new Date().toISOString(),
          action_taken: actionTaken,
        })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(a =>
          a.id === alertId
            ? { ...a, is_actioned: true, action_taken: actionTaken }
            : a
        )
      );

      toast.success("Ação registrada");
    } catch (error) {
      console.error("[useWaiObserver] Record action error:", error);
    }
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!currentCompany?.id) return;

    fetchAlerts();

    const channel: RealtimeChannel = supabase
      .channel("wai-observer-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_observer_alerts",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        (payload) => {
          const newAlert = payload.new as Record<string, unknown>;
          const typedAlert: WaiObserverAlert = {
            ...newAlert,
            severity: newAlert.severity as "info" | "warning" | "critical",
            mode: newAlert.mode as "proactive_event" | "reactive_question" | "economic_analysis",
            impacted_entities: (newAlert.impacted_entities as Array<{ type: string; id: string; description: string }>) || [],
          } as WaiObserverAlert;
          
          setAlerts(prev => [typedAlert, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Toast para alertas críticos
          if (typedAlert.severity === "critical") {
            toast.error("⚠️ Alerta Crítico WAI", {
              description: typedAlert.economic_reason.substring(0, 100),
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, fetchAlerts]);

  return {
    alerts,
    unreadCount,
    isLoading,
    isAnalyzing,
    fetchAlerts,
    triggerEvent,
    askQuestion,
    runEconomicAnalysis,
    markAsRead,
    dismissAlert,
    recordAction,
  };
}
