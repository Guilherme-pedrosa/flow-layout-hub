import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { addDays, isBefore, isAfter, differenceInDays } from "date-fns";
import JSZip from "jszip";

export interface UnitIntegrationRecord {
  id: string;
  unit_id: string;
  technician_id: string;
  company_id: string;
  integration_date: string;
  expires_at: string | null;
  certificate_file_url: string | null;
  certificate_file_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessKit {
  id: string;
  unit_id: string;
  company_id: string;
  technician_ids: string[];
  status: 'GENERATED' | 'SENT';
  zip_file_url: string | null;
  zip_file_name: string | null;
  files_manifest: any[];
  sent_to: string[] | null;
  sent_at: string | null;
  sent_message_id: string | null;
  created_by: string | null;
  created_at: string;
}

export type DocStatus = 'OK' | 'EXPIRED' | 'MISSING';

export interface ChecklistItem {
  doc_type_id: string;
  doc_type_code: string;
  doc_type_name: string;
  required: boolean;
  found: boolean;
  expires_at: string | null;
  state: DocStatus;
  file_url: string | null;
  file_name: string | null;
}

export interface TechnicianChecklist {
  technician_id: string;
  technician_name: string;
  integration: {
    required: boolean;
    expires_at: string | null;
    state: DocStatus;
    certificate_file_url: string | null;
  } | null;
  docs: ChecklistItem[];
}

export interface AccessPreview {
  unit_id: string;
  unit_name: string;
  status: 'AUTHORIZED' | 'BLOCKED';
  block_reasons: { scope: string; entity_id: string; doc_type: string; reason: string }[];
  checklist: {
    company: ChecklistItem[];
    technicians: TechnicianChecklist[];
  };
}

function getDocStatus(expiresAt: string | null, hasFile: boolean): DocStatus {
  if (!hasFile) return 'MISSING';
  if (!expiresAt) return 'OK';
  return isBefore(new Date(expiresAt), new Date()) ? 'EXPIRED' : 'OK';
}

export function useAccessIntegration() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  // Fetch unit integration records
  const useUnitIntegrations = (unitId?: string) => useQuery({
    queryKey: ['unit_integration_records', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const { data, error } = await supabase
        .from('unit_integration_records')
        .select(`
          *,
          technician:rh_colaboradores(id, nome)
        `)
        .eq('unit_id', unitId);
      if (error) throw error;
      return data;
    },
    enabled: !!unitId,
  });

  // Generate access preview
  const generatePreview = async (
    unitId: string,
    technicianIds: string[]
  ): Promise<AccessPreview> => {
    if (!currentCompany?.id) throw new Error('Empresa não selecionada');

    // 1. Get unit info and requirements
    const { data: unit, error: unitErr } = await supabase
      .from('client_units')
      .select(`
        *,
        client:clientes(razao_social, nome_fantasia)
      `)
      .eq('id', unitId)
      .single();
    if (unitErr) throw unitErr;

    const { data: requirements, error: reqErr } = await supabase
      .from('unit_policy_requirements')
      .select(`
        *,
        document_type:document_types(id, code, name, scope, requires_expiry)
      `)
      .eq('unit_id', unitId);
    if (reqErr) throw reqErr;

    const companyReqs = requirements?.filter(r => r.required_for === 'COMPANY') || [];
    const technicianReqs = requirements?.filter(r => r.required_for === 'TECHNICIAN') || [];

    // 2. Get company documents
    const { data: companyDocs, error: compDocsErr } = await supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', currentCompany.id);
    if (compDocsErr) throw compDocsErr;

    // 3. Get technician documents
    const { data: technicianDocs, error: techDocsErr } = await supabase
      .from('technician_documents')
      .select('*')
      .in('technician_id', technicianIds);
    if (techDocsErr) throw techDocsErr;

    // 4. Get technician info
    const { data: technicians, error: techErr } = await supabase
      .from('rh_colaboradores')
      .select('id, nome')
      .in('id', technicianIds);
    if (techErr) throw techErr;

    // 5. Get integration records if required
    let integrationRecords: any[] = [];
    if (unit.requires_local_integration) {
      const { data: intRecs, error: intErr } = await supabase
        .from('unit_integration_records')
        .select('*')
        .eq('unit_id', unitId)
        .in('technician_id', technicianIds);
      if (intErr) throw intErr;
      integrationRecords = intRecs || [];
    }

    // Build checklist
    const blockReasons: AccessPreview['block_reasons'] = [];

    // Company checklist
    const companyChecklist: ChecklistItem[] = companyReqs.map(req => {
      const doc = companyDocs?.find(d => d.document_type_id === req.document_type_id);
      const state = getDocStatus(doc?.expires_at || null, !!doc?.file_url);
      
      if (req.is_required && state !== 'OK') {
        blockReasons.push({
          scope: 'COMPANY',
          entity_id: currentCompany.id,
          doc_type: req.document_type?.code || '',
          reason: state,
        });
      }

      return {
        doc_type_id: req.document_type_id,
        doc_type_code: req.document_type?.code || '',
        doc_type_name: req.document_type?.name || '',
        required: req.is_required,
        found: !!doc,
        expires_at: doc?.expires_at || null,
        state,
        file_url: doc?.file_url || null,
        file_name: doc?.file_name || null,
      };
    });

    // Technicians checklist
    const techniciansChecklist: TechnicianChecklist[] = (technicians || []).map(tech => {
      // Integration status
      let integration: TechnicianChecklist['integration'] = null;
      if (unit.requires_local_integration) {
        const intRec = integrationRecords.find(r => r.technician_id === tech.id);
        const intState = getDocStatus(intRec?.expires_at || null, !!intRec);
        integration = {
          required: true,
          expires_at: intRec?.expires_at || null,
          state: intState,
          certificate_file_url: intRec?.certificate_file_url || null,
        };
        if (intState !== 'OK') {
          blockReasons.push({
            scope: 'TECHNICIAN',
            entity_id: tech.id,
            doc_type: 'INTEGRATION',
            reason: intState,
          });
        }
      }

      // Technician docs
      const techDocs = technicianDocs?.filter(d => d.technician_id === tech.id) || [];
      const docs: ChecklistItem[] = technicianReqs.map(req => {
        const doc = techDocs.find(d => d.document_type_id === req.document_type_id);
        const state = getDocStatus(doc?.expires_at || null, !!doc?.file_url);

        if (req.is_required && state !== 'OK') {
          blockReasons.push({
            scope: 'TECHNICIAN',
            entity_id: tech.id,
            doc_type: req.document_type?.code || '',
            reason: state,
          });
        }

        return {
          doc_type_id: req.document_type_id,
          doc_type_code: req.document_type?.code || '',
          doc_type_name: req.document_type?.name || '',
          required: req.is_required,
          found: !!doc,
          expires_at: doc?.expires_at || null,
          state,
          file_url: doc?.file_url || null,
          file_name: doc?.file_name || null,
        };
      });

      return {
        technician_id: tech.id,
        technician_name: tech.nome,
        integration,
        docs,
      };
    });

    return {
      unit_id: unitId,
      unit_name: unit.unit_name,
      status: blockReasons.length === 0 ? 'AUTHORIZED' : 'BLOCKED',
      block_reasons: blockReasons,
      checklist: {
        company: companyChecklist,
        technicians: techniciansChecklist,
      },
    };
  };

  // Generate ZIP kit
  const generateKit = async (preview: AccessPreview): Promise<{ blob: Blob; fileName: string; manifest: any[] }> => {
    const zip = new JSZip();
    const manifest: any[] = [];

    // Add company docs
    const empresaFolder = zip.folder('EMPRESA');
    for (const doc of preview.checklist.company) {
      if (doc.file_url && doc.state === 'OK') {
        try {
          const response = await fetch(doc.file_url);
          const blob = await response.blob();
          const fileName = `${doc.doc_type_code} - ${doc.file_name || 'documento'}`;
          empresaFolder?.file(fileName, blob);
          manifest.push({
            scope: 'COMPANY',
            doc_type: doc.doc_type_code,
            file_name: fileName,
            expires_at: doc.expires_at,
          });
        } catch (e) {
          console.error('Error fetching company doc:', e);
        }
      }
    }

    // Add technician docs
    const tecnicosFolder = zip.folder('TECNICOS');
    for (const tech of preview.checklist.technicians) {
      const techFolder = tecnicosFolder?.folder(tech.technician_name.replace(/[/\\?%*:|"<>]/g, '-'));
      
      // Add integration certificate if exists
      if (tech.integration?.certificate_file_url && tech.integration.state === 'OK') {
        try {
          const response = await fetch(tech.integration.certificate_file_url);
          const blob = await response.blob();
          techFolder?.file('INTEGRACAO_LOCAL.pdf', blob);
          manifest.push({
            scope: 'TECHNICIAN',
            technician_id: tech.technician_id,
            doc_type: 'INTEGRATION',
            file_name: 'INTEGRACAO_LOCAL.pdf',
            expires_at: tech.integration.expires_at,
          });
        } catch (e) {
          console.error('Error fetching integration cert:', e);
        }
      }

      // Add technician docs
      for (const doc of tech.docs) {
        if (doc.file_url && doc.state === 'OK') {
          try {
            const response = await fetch(doc.file_url);
            const blob = await response.blob();
            const fileName = `${doc.doc_type_code} - ${doc.file_name || 'documento'}`;
            techFolder?.file(fileName, blob);
            manifest.push({
              scope: 'TECHNICIAN',
              technician_id: tech.technician_id,
              doc_type: doc.doc_type_code,
              file_name: fileName,
              expires_at: doc.expires_at,
            });
          } catch (e) {
            console.error('Error fetching tech doc:', e);
          }
        }
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Kit_Acesso_${preview.unit_name.replace(/[/\\?%*:|"<>]/g, '-')}_${date}.zip`;

    return { blob, fileName, manifest };
  };

  // Save kit to database
  const saveKit = useMutation({
    mutationFn: async ({ 
      unitId, 
      technicianIds, 
      zipUrl, 
      zipName, 
      manifest 
    }: { 
      unitId: string; 
      technicianIds: string[]; 
      zipUrl: string; 
      zipName: string; 
      manifest: any[];
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');

      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('access_kits')
        .insert({
          unit_id: unitId,
          company_id: currentCompany.id,
          technician_ids: technicianIds,
          zip_file_url: zipUrl,
          zip_file_name: zipName,
          files_manifest: manifest,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Log audit
      await supabase.from('access_audit_logs').insert({
        company_id: currentCompany.id,
        event_type: 'KIT_GENERATED',
        entity_type: 'access_kit',
        entity_id: data.id,
        performed_by: userData.user?.id,
        payload: { unit_id: unitId, technician_ids: technicianIds, manifest },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access_kits'] });
      toast.success('Kit gerado com sucesso!');
    },
    onError: (error: Error) => toast.error('Erro: ' + error.message),
  });

  return {
    useUnitIntegrations,
    generatePreview,
    generateKit,
    saveKit,
  };
}
