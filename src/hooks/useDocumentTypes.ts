import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export type DocumentScope = 'COMPANY' | 'TECHNICIAN';
export type ExpiryMode = 'NONE' | 'EXPIRES_AT' | 'ISSUE_PLUS_DAYS';

export interface DocumentType {
  id: string;
  code: string;
  name: string;
  scope: DocumentScope;
  requires_expiry: boolean;
  expiry_mode: ExpiryMode;
  default_validity_days: number | null;
  is_active: boolean;
  sort_order: number;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export function useDocumentTypes() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: documentTypes = [], isLoading, refetch } = useQuery({
    queryKey: ['document_types', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('scope')
        .order('sort_order');
      if (error) throw error;
      return data as DocumentType[];
    },
    enabled: !!currentCompany?.id,
  });

  const companyTypes = documentTypes.filter(dt => dt.scope === 'COMPANY');
  const technicianTypes = documentTypes.filter(dt => dt.scope === 'TECHNICIAN');

  const createDocumentType = useMutation({
    mutationFn: async (data: Omit<DocumentType, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      const { error } = await supabase
        .from('document_types')
        .insert({ ...data, company_id: currentCompany.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document_types'] });
      toast.success('Tipo de documento criado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const updateDocumentType = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DocumentType> }) => {
      const { error } = await supabase
        .from('document_types')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document_types'] });
      toast.success('Tipo de documento atualizado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteDocumentType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document_types'] });
      toast.success('Tipo de documento removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    documentTypes,
    companyTypes,
    technicianTypes,
    isLoading,
    refetch,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
  };
}
