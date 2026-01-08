import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface ClientUnit {
  id: string;
  client_id: string;
  company_id: string;
  unit_name: string;
  address: string | null;
  integration_validity_days: number | null;
  requires_local_integration: boolean;
  access_email_to: string[];
  access_email_cc: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitPolicyRequirement {
  id: string;
  unit_id: string;
  document_type_id: string;
  required_for: 'COMPANY' | 'TECHNICIAN';
  is_required: boolean;
  applies_to_role: string | null;
  sort_order: number;
  created_at: string;
  document_type?: {
    id: string;
    code: string;
    name: string;
    scope: string;
  };
}

export function useClientUnits(clientId?: string) {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading, refetch } = useQuery({
    queryKey: ['client_units', clientId, currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id || !clientId) return [];
      const { data, error } = await supabase
        .from('client_units')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('client_id', clientId)
        .order('unit_name');
      if (error) throw error;
      return data as ClientUnit[];
    },
    enabled: !!currentCompany?.id && !!clientId,
  });

  const createUnit = useMutation({
    mutationFn: async (data: Omit<ClientUnit, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('client_units')
        .insert({ ...data, company_id: currentCompany.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_units'] });
      toast.success('Unidade criada!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientUnit> }) => {
      const { error } = await supabase
        .from('client_units')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_units'] });
      toast.success('Unidade atualizada!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_units')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_units'] });
      toast.success('Unidade removida!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    units,
    isLoading,
    refetch,
    createUnit,
    updateUnit,
    deleteUnit,
  };
}

export function useUnitPolicyRequirements(unitId?: string) {
  const queryClient = useQueryClient();

  const { data: requirements = [], isLoading, refetch } = useQuery({
    queryKey: ['unit_policy_requirements', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('unit_policy_requirements')
        .select(`
          *,
          document_type:document_types(id, code, name, scope)
        `)
        .eq('unit_id', unitId)
        .order('required_for')
        .order('sort_order');
      if (error) throw error;
      return data as UnitPolicyRequirement[];
    },
    enabled: !!unitId,
  });

  const companyRequirements = requirements.filter(r => r.required_for === 'COMPANY');
  const technicianRequirements = requirements.filter(r => r.required_for === 'TECHNICIAN');

  const addRequirement = useMutation({
    mutationFn: async (data: { unit_id: string; document_type_id: string; required_for: 'COMPANY' | 'TECHNICIAN'; is_required?: boolean }) => {
      const { error } = await supabase
        .from('unit_policy_requirements')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit_policy_requirements'] });
      toast.success('Requisito adicionado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const removeRequirement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unit_policy_requirements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit_policy_requirements'] });
      toast.success('Requisito removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const syncRequirements = useMutation({
    mutationFn: async ({ unitId, companyDocTypeIds, technicianDocTypeIds }: { 
      unitId: string; 
      companyDocTypeIds: string[]; 
      technicianDocTypeIds: string[];
    }) => {
      // Remove all existing
      await supabase.from('unit_policy_requirements').delete().eq('unit_id', unitId);
      
      // Insert company requirements
      if (companyDocTypeIds.length > 0) {
        const companyReqs = companyDocTypeIds.map((docTypeId, i) => ({
          unit_id: unitId,
          document_type_id: docTypeId,
          required_for: 'COMPANY' as const,
          sort_order: i,
        }));
        const { error: compErr } = await supabase.from('unit_policy_requirements').insert(companyReqs);
        if (compErr) throw compErr;
      }
      
      // Insert technician requirements
      if (technicianDocTypeIds.length > 0) {
        const techReqs = technicianDocTypeIds.map((docTypeId, i) => ({
          unit_id: unitId,
          document_type_id: docTypeId,
          required_for: 'TECHNICIAN' as const,
          sort_order: i,
        }));
        const { error: techErr } = await supabase.from('unit_policy_requirements').insert(techReqs);
        if (techErr) throw techErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit_policy_requirements'] });
      toast.success('Requisitos atualizados!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    requirements,
    companyRequirements,
    technicianRequirements,
    isLoading,
    refetch,
    addRequirement,
    removeRequirement,
    syncRequirements,
  };
}
