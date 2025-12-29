import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemSetting {
  id: string;
  company_id: string;
  key: string;
  value_json: unknown;
  updated_at: string;
}

/**
 * Hook para gerenciar configurações do sistema
 * Fase 0 do Hardening: Feature flags e configurações globais
 */
export function useSystemSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*");

      if (error) throw error;
      return data as SystemSetting[];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const getSetting = (key: string): unknown => {
    const setting = settingsQuery.data?.find(s => s.key === key);
    return setting?.value_json ?? null;
  };

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data, error } = await supabase
        .from("system_settings")
        .update({ value_json: value as any })
        .eq("key", key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_settings"] });
    },
  });

  return {
    settings: settingsQuery.data ?? [],
    isLoading: settingsQuery.isLoading,
    getSetting,
    updateSetting,
    refetch: settingsQuery.refetch,
  };
}

/**
 * Hook específico para verificar o modo de hardening
 * Quando ativado, o sistema usa RPCs server-side e RLS restritivo
 */
export function useSecurityHardening() {
  const { getSetting, isLoading } = useSystemSettings();
  
  const isHardeningEnabled = getSetting("security_hardening_enabled") === true;

  return {
    isHardeningEnabled,
    isLoading,
  };
}
