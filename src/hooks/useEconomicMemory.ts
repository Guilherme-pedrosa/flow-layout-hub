import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface EconomicMemoryEntry {
  id: string;
  company_id: string;
  entity_type: "product" | "client" | "supplier" | "service_order" | "sale" | "purchase_order";
  entity_id: string;
  entity_name: string | null;
  total_alerts: number;
  critical_alerts: number;
  warning_alerts: number;
  total_potential_loss: number;
  avg_margin_impact: number;
  recurring_issues: Array<{ type: string; count: number }>;
  last_alert_types: string[];
  first_alert_at: string | null;
  last_alert_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopProblemEntity {
  entity_type: string;
  entity_name: string | null;
  total_alerts: number;
  critical_alerts: number;
  total_potential_loss: number;
}

export function useEconomicMemory() {
  const { currentCompany } = useCompany();
  const [topProblems, setTopProblems] = useState<TopProblemEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTopProblems = useCallback(async (limit = 10) => {
    if (!currentCompany) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ai_economic_memory")
        .select("entity_type, entity_name, total_alerts, critical_alerts, total_potential_loss")
        .eq("company_id", currentCompany.id)
        .order("total_potential_loss", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setTopProblems((data || []) as TopProblemEntity[]);
    } catch (error) {
      console.error("Error fetching top problems:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany]);

  const getEntityMemory = async (
    entityType: string,
    entityId: string
  ): Promise<EconomicMemoryEntry | null> => {
    if (!currentCompany) return null;

    try {
      const { data, error } = await supabase
        .from("ai_economic_memory")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();

      if (error) throw error;
      return data as EconomicMemoryEntry | null;
    } catch (error) {
      console.error("Error fetching entity memory:", error);
      return null;
    }
  };

  const getProblematicSuppliers = async (limit = 5): Promise<TopProblemEntity[]> => {
    if (!currentCompany) return [];

    try {
      const { data, error } = await supabase
        .from("ai_economic_memory")
        .select("entity_type, entity_name, total_alerts, critical_alerts, total_potential_loss")
        .eq("company_id", currentCompany.id)
        .eq("entity_type", "supplier")
        .order("total_potential_loss", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as TopProblemEntity[];
    } catch (error) {
      console.error("Error fetching problematic suppliers:", error);
      return [];
    }
  };

  const getProblematicProducts = async (limit = 5): Promise<TopProblemEntity[]> => {
    if (!currentCompany) return [];

    try {
      const { data, error } = await supabase
        .from("ai_economic_memory")
        .select("entity_type, entity_name, total_alerts, critical_alerts, total_potential_loss")
        .eq("company_id", currentCompany.id)
        .eq("entity_type", "product")
        .order("total_potential_loss", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as TopProblemEntity[];
    } catch (error) {
      console.error("Error fetching problematic products:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchTopProblems();
  }, [fetchTopProblems]);

  return {
    topProblems,
    isLoading,
    fetchTopProblems,
    getEntityMemory,
    getProblematicSuppliers,
    getProblematicProducts,
  };
}
