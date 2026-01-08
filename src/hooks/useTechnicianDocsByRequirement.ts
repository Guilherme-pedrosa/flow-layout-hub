import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { DocumentType } from "./useDocumentTypes";

export type DocState = 'OK' | 'EXPIRED' | 'MISSING';

export interface TechnicianDocItem {
  doc_type_id: string;
  doc_type_code: string;
  doc_type_name: string;
  state: DocState;
  file_url?: string;
  file_name?: string;
  expires_at?: string;
  is_required: boolean;
  requires_expiry: boolean;
  colaborador_doc_id?: string;
}

export interface TechnicianWithDocs {
  technician_id: string;
  technician_name: string;
  docs: TechnicianDocItem[];
}

function getDocState(expiresAt: string | null, requiresExpiry: boolean): DocState {
  if (!requiresExpiry) return 'OK';
  if (!expiresAt) return 'MISSING';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);
  
  if (expiry < today) return 'EXPIRED';
  return 'OK';
}

export function useTechnicianDocsByRequirement(
  technicianIds: string[],
  technicianRequirements: Array<{
    document_type_id: string;
    is_required: boolean;
    document_type?: DocumentType;
  }>,
  technicians: Array<{
    id: string;
    nome_fantasia?: string | null;
    razao_social?: string | null;
  }>
) {
  const { currentCompany } = useCompany();

  const { data: techDocs = [], isLoading, refetch } = useQuery({
    queryKey: ['technician_docs_by_requirement', technicianIds, currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id || technicianIds.length === 0) return [];
      
      // Fetch all docs for selected technicians
      const { data, error } = await supabase
        .from('colaborador_docs')
        .select('*')
        .eq('company_id', currentCompany.id)
        .in('colaborador_id', technicianIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id && technicianIds.length > 0,
  });

  // Build the structured data for each technician
  const techniciansWithDocs: TechnicianWithDocs[] = technicianIds.map(techId => {
    const tech = technicians.find(t => t.id === techId);
    const techDocsFiltered = techDocs.filter(d => d.colaborador_id === techId);
    
    const docs: TechnicianDocItem[] = technicianRequirements.map(req => {
      const docType = req.document_type;
      
      // Find matching doc by checking if the tipo matches the code
      // The colaborador_docs table uses 'tipo' field which should match document_type code
      const matchingDoc = techDocsFiltered.find(d => {
        // Match by code (tipo field)
        return d.tipo === docType?.code?.toUpperCase();
      });
      
      const requiresExpiry = docType?.requires_expiry ?? false;
      let state: DocState = 'MISSING';
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let expiresAt: string | undefined;
      let colaboradorDocId: string | undefined;
      
      if (matchingDoc) {
        fileUrl = matchingDoc.arquivo_url || undefined;
        fileName = matchingDoc.arquivo_nome || undefined;
        expiresAt = matchingDoc.data_vencimento || undefined;
        colaboradorDocId = matchingDoc.id;
        
        if (fileUrl) {
          state = getDocState(expiresAt || null, requiresExpiry);
        }
      }
      
      return {
        doc_type_id: req.document_type_id,
        doc_type_code: docType?.code || '',
        doc_type_name: docType?.name || '',
        state,
        file_url: fileUrl,
        file_name: fileName,
        expires_at: expiresAt,
        is_required: req.is_required,
        requires_expiry: requiresExpiry,
        colaborador_doc_id: colaboradorDocId,
      };
    });
    
    return {
      technician_id: techId,
      technician_name: tech?.nome_fantasia || tech?.razao_social || 'Técnico',
      docs,
    };
  });

  return {
    techniciansWithDocs,
    isLoading,
    refetch,
  };
}
