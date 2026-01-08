import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useDocumentTypes, DocumentType } from "./useDocumentTypes";
import { toast } from "sonner";

export type DocumentStatus = 'OK' | 'EXPIRED' | 'MISSING';

export interface CompanyDocument {
  id: string;
  company_id: string;
  document_type_id: string;
  file_url: string;
  file_name: string;
  expires_at: string | null;
  version: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // Enriched
  document_type?: DocumentType;
  status?: DocumentStatus;
  days_until_expiry?: number | null;
}

export function getDocumentStatus(expiresAt: string | null, requiresExpiry: boolean): { 
  status: DocumentStatus; 
  label: string; 
  daysUntil: number | null;
  color: 'green' | 'yellow' | 'red';
} {
  if (!requiresExpiry || !expiresAt) {
    return { status: 'OK', label: 'Válido', daysUntil: null, color: 'green' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return { status: 'EXPIRED', label: `Vencido há ${Math.abs(daysUntil)}d`, daysUntil, color: 'red' };
  }
  if (daysUntil <= 30) {
    return { status: 'OK', label: `Vence em ${daysUntil}d`, daysUntil, color: 'yellow' };
  }
  return { status: 'OK', label: 'Válido', daysUntil, color: 'green' };
}

export function useCompanyDocuments() {
  const { currentCompany } = useCompany();
  const { companyTypes } = useDocumentTypes();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['company_documents', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data as CompanyDocument[];
    },
    enabled: !!currentCompany?.id,
  });

  // Enrich with document type and status
  const documentsWithStatus: CompanyDocument[] = documents.map(doc => {
    const docType = companyTypes.find(dt => dt.id === doc.document_type_id);
    const statusInfo = docType 
      ? getDocumentStatus(doc.expires_at, docType.requires_expiry)
      : { status: 'OK' as DocumentStatus, daysUntil: null };
    
    return {
      ...doc,
      document_type: docType,
      status: statusInfo.status,
      days_until_expiry: statusInfo.daysUntil,
    };
  });

  // Create a checklist view: all company types with their document (or missing)
  const checklist = companyTypes.map(docType => {
    const doc = documentsWithStatus.find(d => d.document_type_id === docType.id);
    const statusInfo = doc 
      ? getDocumentStatus(doc.expires_at, docType.requires_expiry)
      : { status: 'MISSING' as DocumentStatus, label: 'Não enviado', daysUntil: null, color: 'red' as const };
    
    return {
      document_type: docType,
      document: doc || null,
      status: statusInfo.status,
      label: statusInfo.label,
      color: statusInfo.color,
    };
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ 
      documentTypeId, 
      file, 
      expiresAt,
      notes 
    }: { 
      documentTypeId: string; 
      file: File;
      expiresAt?: string;
      notes?: string;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Upload file
      const filePath = `company-docs/${currentCompany.id}/${documentTypeId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      // Check if document already exists
      const { data: existing } = await supabase
        .from('company_documents')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('document_type_id', documentTypeId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('company_documents')
          .update({
            file_url: urlData.publicUrl,
            file_name: file.name,
            expires_at: expiresAt || null,
            notes: notes || null,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('company_documents')
          .insert({
            company_id: currentCompany.id,
            document_type_id: documentTypeId,
            file_url: urlData.publicUrl,
            file_name: file.name,
            expires_at: expiresAt || null,
            notes: notes || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_documents'] });
      toast.success('Documento enviado!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_documents'] });
      toast.success('Documento removido!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  // Statistics
  const stats = {
    total: companyTypes.length,
    ok: checklist.filter(c => c.status === 'OK' && c.color === 'green').length,
    expiringSoon: checklist.filter(c => c.status === 'OK' && c.color === 'yellow').length,
    expired: checklist.filter(c => c.status === 'EXPIRED').length,
    missing: checklist.filter(c => c.status === 'MISSING').length,
  };

  return {
    documents: documentsWithStatus,
    checklist,
    stats,
    isLoading,
    refetch,
    uploadDocument,
    deleteDocument,
  };
}
