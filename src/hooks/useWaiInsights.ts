import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface WaiInsight {
  id: string;
  type: "opportunity" | "warning" | "info" | "critical";
  title: string;
  description: string;
  confidence: number;
  action: {
    label: string;
    href: string;
  };
  source: "ai_insights" | "ai_observer_alerts";
  createdAt: string;
}

export function useWaiInsights(category?: string) {
  const { currentCompany } = useCompany();
  const [insight, setInsight] = useState<WaiInsight | null>(null);
  const [allInsights, setAllInsights] = useState<WaiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!currentCompany?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from ai_insights
      let insightsQuery = supabase
        .from("ai_insights")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_dismissed", false)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (category) {
        insightsQuery = insightsQuery.eq("category", category);
      }

      // Fetch from ai_observer_alerts (critical ones)
      const alertsQuery = supabase
        .from("ai_observer_alerts")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_dismissed", false)
        .eq("is_read", false)
        .in("severity", ["critical", "warning"])
        .order("created_at", { ascending: false })
        .limit(5);

      const [insightsResult, alertsResult] = await Promise.all([
        insightsQuery,
        alertsQuery,
      ]);

      const insights: WaiInsight[] = [];

      // Convert ai_insights
      if (insightsResult.data) {
        for (const item of insightsResult.data) {
          insights.push({
            id: item.id,
            type: mapInsightType(item.type),
            title: item.title,
            description: item.message,
            confidence: item.priority * 20,
            action: {
              label: item.action_label || "Ver detalhes",
              href: item.action_url || "/configuracoes/alertas",
            },
            source: "ai_insights",
            createdAt: item.created_at,
          });
        }
      }

      // Convert ai_observer_alerts
      if (alertsResult.data) {
        for (const item of alertsResult.data) {
          insights.push({
            id: item.id,
            type: item.severity === "critical" ? "critical" : "warning",
            title: item.event_type,
            description: item.economic_reason,
            confidence: item.potential_loss ? 90 : 70,
            action: {
              label: item.recommendation ? "Ver ação" : "Ver detalhes",
              href: "/configuracoes/alertas",
            },
            source: "ai_observer_alerts",
            createdAt: item.created_at,
          });
        }
      }

      // Sort by priority (critical first, then by date)
      insights.sort((a, b) => {
        const typeOrder = { critical: 4, warning: 3, opportunity: 2, info: 1 };
        const orderDiff = typeOrder[b.type] - typeOrder[a.type];
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setAllInsights(insights);
      setInsight(insights[0] || null);
    } catch (err) {
      console.error("Error fetching WAI insights:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, category]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentCompany?.id) return;

    const channel = supabase
      .channel("wai-insights-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_insights",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => fetchInsights()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_observer_alerts",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => fetchInsights()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, fetchInsights]);

  const dismiss = async (insightId: string, source: "ai_insights" | "ai_observer_alerts") => {
    const table = source === "ai_insights" ? "ai_insights" : "ai_observer_alerts";
    await supabase
      .from(table)
      .update({ is_dismissed: true })
      .eq("id", insightId);

    setAllInsights((prev) => prev.filter((i) => i.id !== insightId));
    if (insight?.id === insightId) {
      setInsight(allInsights.find((i) => i.id !== insightId) || null);
    }
  };

  return {
    insight,
    allInsights,
    isLoading,
    error,
    refetch: fetchInsights,
    dismiss,
  };
}

function mapInsightType(type: string): "opportunity" | "warning" | "info" | "critical" {
  switch (type) {
    case "critical":
    case "error":
      return "critical";
    case "warning":
    case "attention":
      return "warning";
    case "opportunity":
    case "success":
      return "opportunity";
    default:
      return "info";
  }
}
