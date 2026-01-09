import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export type IntegrationStatus = 'draft' | 'blocked' | 'authorized' | 'sent' | 'expired';

export interface BlockReason {
  scope: 'EMPRESA' | 'TÉCNICO';
  entity_name?: string;
  doc_type: string;
  reason: string;
}

export interface Integration {
  id: string;
  company_id: string;
  client_id: string;
  unit_id: string | null;
  technician_ids: string[];
  status: IntegrationStatus;
  validated_at: string | null;
  validated_by: string | null;
  blocked_reasons: BlockReason[];
  zip_url: string | null;
  zip_file_name: string | null;
  manifest: Record<string, unknown> | null;
  sent_at: string | null;
  sent_to: string[] | null;
  sent_by: string | null;
  earliest_expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationWithRelations extends Integration {
  client?: {
    id: string;
    razao_social: string | null;
    nome_fantasia: string | null;
  };
  unit?: {
    id: string;
    unit_name: string;
  } | null;
  technicians?: Array<{
    id: string;
    razao_social: string | null;
    nome_fantasia: string | null;
  }>;
}

// Helper to convert DB row to typed Integration
function parseIntegration(row: unknown): Integration {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    company_id: r.company_id as string,
    client_id: r.client_id as string,
    unit_id: r.unit_id as string | null,
    technician_ids: (r.technician_ids as string[]) || [],
    status: r.status as IntegrationStatus,
    validated_at: r.validated_at as string | null,
    validated_by: r.validated_by as string | null,
    blocked_reasons: (r.blocked_reasons as BlockReason[]) || [],
    zip_url: r.zip_url as string | null,
    zip_file_name: r.zip_file_name as string | null,
    manifest: r.manifest as Record<string, unknown> | null,
    sent_at: r.sent_at as string | null,
    sent_to: r.sent_to as string[] | null,
    sent_by: r.sent_by as string | null,
    earliest_expiry_date: r.earliest_expiry_date as string | null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function useIntegrationsModule() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all integrations
  const { data: integrations = [], isLoading, refetch } = useQuery({
    queryKey: ['integrations_module', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(parseIntegration);
    },
    enabled: !!currentCompany?.id,
  });

  // Create integration
  const createIntegration = useMutation({
    mutationFn: async (data: {
      client_id: string;
      unit_id?: string | null;
      technician_ids: string[];
      status: IntegrationStatus;
      blocked_reasons?: BlockReason[];
      earliest_expiry_date?: string | null;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('integrations')
        .insert({
          company_id: currentCompany.id,
          client_id: data.client_id,
          unit_id: data.unit_id || null,
          technician_ids: data.technician_ids,
          status: data.status,
          blocked_reasons: (data.blocked_reasons || []) as unknown as Json,
          earliest_expiry_date: data.earliest_expiry_date || null,
          validated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const integration = parseIntegration(result);
      
      // Log event
      await logEvent('integration_created', integration.id, { status: data.status });
      
      return integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations_module'] });
    },
    onError: (error: Error) => toast.error('Erro ao criar integração: ' + error.message),
  });

  // Update integration
  const updateIntegration = useMutation({
    mutationFn: async ({ id, data }: { 
      id: string; 
      data: Partial<Integration>;
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (data.status !== undefined) updateData.status = data.status;
      if (data.blocked_reasons !== undefined) updateData.blocked_reasons = data.blocked_reasons as unknown as Json;
      if (data.zip_url !== undefined) updateData.zip_url = data.zip_url;
      if (data.zip_file_name !== undefined) updateData.zip_file_name = data.zip_file_name;
      if (data.manifest !== undefined) updateData.manifest = data.manifest as unknown as Json;
      if (data.sent_at !== undefined) updateData.sent_at = data.sent_at;
      if (data.sent_to !== undefined) updateData.sent_to = data.sent_to;
      if (data.sent_by !== undefined) updateData.sent_by = data.sent_by;
      if (data.earliest_expiry_date !== undefined) updateData.earliest_expiry_date = data.earliest_expiry_date;
      if (data.validated_at !== undefined) updateData.validated_at = data.validated_at;
      
      const { error } = await supabase
        .from('integrations')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Log appropriate event
      if (data.status === 'authorized') {
        await logEvent('integration_authorized', id, {});
      } else if (data.status === 'blocked') {
        await logEvent('integration_blocked', id, { reasons: data.blocked_reasons });
      } else if (data.status === 'sent') {
        await logEvent('email_sent', id, { sent_to: data.sent_to });
      }
      if (data.zip_url) {
        await logEvent('zip_generated', id, { zip_file_name: data.zip_file_name });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations_module'] });
    },
    onError: (error: Error) => toast.error('Erro ao atualizar integração: ' + error.message),
  });

  // Delete integration
  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations_module'] });
      toast.success('Integração removida');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Helper to log events
  const logEvent = async (eventType: string, integrationId: string | null, eventData: Record<string, unknown>) => {
    if (!currentCompany?.id) return;
    
    try {
      await supabase.rpc('log_integration_event', {
        p_company_id: currentCompany.id,
        p_integration_id: integrationId,
        p_event_type: eventType,
        p_event_data: eventData as unknown as Json,
        p_performed_by: null,
      });
    } catch (e) {
      console.warn('Failed to log integration event:', e);
    }
  };

  // Get stats
  const stats = {
    total: integrations.length,
    authorized: integrations.filter(i => i.status === 'authorized').length,
    blocked: integrations.filter(i => i.status === 'blocked').length,
    sent: integrations.filter(i => i.status === 'sent').length,
    expiringSoon: integrations.filter(i => {
      if (!i.earliest_expiry_date) return false;
      const expiry = new Date(i.earliest_expiry_date);
      const now = new Date();
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 15;
    }).length,
    expired: integrations.filter(i => {
      if (i.status === 'expired') return true;
      if (!i.earliest_expiry_date) return false;
      return new Date(i.earliest_expiry_date) < new Date();
    }).length,
  };

  return {
    integrations,
    isLoading,
    refetch,
    stats,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    logEvent,
  };
}

// Hook to fetch integration with relations
export function useIntegrationDetail(integrationId: string | undefined) {
  const { currentCompany } = useCompany();

  return useQuery({
    queryKey: ['integration_detail', integrationId],
    queryFn: async () => {
      if (!integrationId || !currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('integrations')
        .select(`
          *,
          client:pessoas!integrations_client_id_fkey(id, razao_social, nome_fantasia),
          unit:client_units!integrations_unit_id_fkey(id, unit_name)
        `)
        .eq('id', integrationId)
        .single();
      
      if (error) throw error;
      
      const base = parseIntegration(data);
      const result: IntegrationWithRelations = {
        ...base,
        client: data.client as IntegrationWithRelations['client'],
        unit: data.unit as IntegrationWithRelations['unit'],
      };
      
      // Fetch technicians
      if (base.technician_ids && base.technician_ids.length > 0) {
        const { data: techs } = await supabase
          .from('pessoas')
          .select('id, razao_social, nome_fantasia')
          .in('id', base.technician_ids);
        
        result.technicians = techs || [];
      } else {
        result.technicians = [];
      }
      
      return result;
    },
    enabled: !!integrationId && !!currentCompany?.id,
  });
}

// Hook for dashboard KPIs
export function useIntegrationsDashboard() {
  const { currentCompany } = useCompany();

  return useQuery({
    queryKey: ['integrations_dashboard', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      // Get integrations with expiry info
      const { data: rows, error } = await supabase
        .from('integrations')
        .select('id, status, validated_at, sent_at, created_at, earliest_expiry_date, client_id, technician_ids')
        .eq('company_id', currentCompany.id);
      
      if (error) throw error;
      
      const integrations = (rows || []).map(r => ({
        id: r.id as string,
        status: r.status as IntegrationStatus,
        validated_at: r.validated_at as string | null,
        sent_at: r.sent_at as string | null,
        created_at: r.created_at as string,
        earliest_expiry_date: r.earliest_expiry_date as string | null,
        client_id: r.client_id as string,
        technician_ids: (r.technician_ids as string[]) || [],
      }));
      
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const stats = {
        total: integrations.length,
        percentAuthorized: integrations.length > 0 
          ? Math.round((integrations.filter(i => i.status === 'authorized' || i.status === 'sent').length / integrations.length) * 100)
          : 0,
        percentBlocked: integrations.length > 0
          ? Math.round((integrations.filter(i => i.status === 'blocked').length / integrations.length) * 100)
          : 0,
        expiringIn7Days: integrations.filter(i => {
          if (!i.earliest_expiry_date) return false;
          const exp = new Date(i.earliest_expiry_date);
          return exp > now && exp <= in7Days;
        }).length,
        expiringIn15Days: integrations.filter(i => {
          if (!i.earliest_expiry_date) return false;
          const exp = new Date(i.earliest_expiry_date);
          return exp > now && exp <= in15Days;
        }).length,
        expiringIn30Days: integrations.filter(i => {
          if (!i.earliest_expiry_date) return false;
          const exp = new Date(i.earliest_expiry_date);
          return exp > now && exp <= in30Days;
        }).length,
        avgValidationTimeMs: 0,
        avgSendTimeMs: 0,
      };
      
      // Calculate average times
      const validatedIntegrations = integrations.filter(i => i.validated_at && i.created_at);
      if (validatedIntegrations.length > 0) {
        const totalValidationTime = validatedIntegrations.reduce((acc, i) => {
          return acc + (new Date(i.validated_at!).getTime() - new Date(i.created_at).getTime());
        }, 0);
        stats.avgValidationTimeMs = totalValidationTime / validatedIntegrations.length;
      }
      
      const sentIntegrations = integrations.filter(i => i.sent_at && i.validated_at);
      if (sentIntegrations.length > 0) {
        const totalSendTime = sentIntegrations.reduce((acc, i) => {
          return acc + (new Date(i.sent_at!).getTime() - new Date(i.validated_at!).getTime());
        }, 0);
        stats.avgSendTimeMs = totalSendTime / sentIntegrations.length;
      }
      
      return {
        stats,
        recentIntegrations: integrations.slice(0, 20),
      };
    },
    enabled: !!currentCompany?.id,
  });
}
