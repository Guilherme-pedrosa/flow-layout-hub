import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useDocumentTypes, DocumentType } from "./useDocumentTypes";
import { toast } from "sonner";

export type RequiredFor = 'COMPANY' | 'TECHNICIAN';

export interface ClientDocumentRequirement {
  id: string;
  client_id: string;
  document_type_id: string;
  required_for: RequiredFor;
  is_required: boolean;
  sort_order: number;
  company_id: string;
  created_at: string;
  updated_at: string;
  // Enriched
  document_type?: DocumentType;
}

export function useClientDocumentRequirements(clientId?: string) {
  const { currentCompany } = useCompany();
  const { documentTypes } = useDocumentTypes();
  const queryClient = useQueryClient();

  const { data: requirements = [], isLoading, refetch } = useQuery({
    queryKey: ['client_document_requirements', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_document_requirements')
        .select('*')
        .eq('client_id', clientId)
        .order('required_for')
        .order('sort_order');
      if (error) throw error;
      return data as ClientDocumentRequirement[];
    },
    enabled: !!clientId,
  });

  // Enrich with document type
  const enrichedRequirements = requirements.map(req => ({
    ...req,
    document_type: documentTypes.find(dt => dt.id === req.document_type_id),
  }));

  const companyRequirements = enrichedRequirements.filter(r => r.required_for === 'COMPANY');
  const technicianRequirements = enrichedRequirements.filter(r => r.required_for === 'TECHNICIAN');

  // Available types for adding (not yet added)
  const availableCompanyTypes = documentTypes.filter(
    dt => dt.scope === 'COMPANY' && dt.is_active && !companyRequirements.find(r => r.document_type_id === dt.id)
  );
  const availableTechnicianTypes = documentTypes.filter(
    dt => dt.scope === 'TECHNICIAN' && dt.is_active && !technicianRequirements.find(r => r.document_type_id === dt.id)
  );

  const addRequirement = useMutation({
    mutationFn: async ({ documentTypeId, requiredFor }: { documentTypeId: string; requiredFor: RequiredFor }) => {
      if (!clientId || !currentCompany?.id) throw new Error('Cliente ou empresa não selecionado');
      const { error } = await supabase
        .from('client_document_requirements')
        .insert({
          client_id: clientId,
          document_type_id: documentTypeId,
          required_for: requiredFor,
          is_required: true,
          company_id: currentCompany.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_document_requirements', clientId] });
      toast.success('Requisito adicionado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const removeRequirement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_document_requirements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_document_requirements', clientId] });
      toast.success('Requisito removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const toggleRequired = useMutation({
    mutationFn: async ({ id, isRequired }: { id: string; isRequired: boolean }) => {
      const { error } = await supabase
        .from('client_document_requirements')
        .update({ is_required: isRequired })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_document_requirements', clientId] });
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    requirements: enrichedRequirements,
    companyRequirements,
    technicianRequirements,
    availableCompanyTypes,
    availableTechnicianTypes,
    isLoading,
    refetch,
    addRequirement,
    removeRequirement,
    toggleRequired,
  };
}
