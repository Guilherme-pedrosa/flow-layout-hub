import { useState, useRef } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  ShieldCheck, ShieldX, Download, Mail, Building2, Users, FileCheck, FileX, 
  CheckCircle, Clock, Loader2, Upload, AlertCircle, Save
} from "lucide-react";
import { usePessoas } from "@/hooks/usePessoas";
import { useRh } from "@/hooks/useRh";
import { useClientDocumentRequirements } from "@/hooks/useClientDocumentRequirements";
import { useCompanyDocuments, getDocumentStatus } from "@/hooks/useCompanyDocuments";
import { useTechnicianDocsByRequirement, DocState } from "@/hooks/useTechnicianDocsByRequirement";
import { useColaboradorDocs } from "@/hooks/useColaboradorDocs";
import { useIntegrationsModule, BlockReason } from "@/hooks/useIntegrationsModule";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { SearchableMultiSelect } from "@/components/shared/SearchableMultiSelect";
import { toast } from "sonner";
import JSZip from "jszip";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CompanyDocItem {
  doc_type_id: string;
  doc_type_code: string;
  doc_type_name: string;
  state: DocState;
  file_url?: string;
  file_name?: string;
  expires_at?: string;
  is_required: boolean;
  requires_expiry: boolean;
}

type ValidationStatus = 'INITIAL' | 'AUTHORIZED' | 'BLOCKED';

export default function NovaIntegracao() {
  const navigate = useNavigate();
  const { clientes } = usePessoas();
  const { colaboradores } = useRh();
  const { documents: companyDocs, uploadDocument, refetch: refetchCompanyDocs } = useCompanyDocuments();
  const { createIntegration, updateIntegration } = useIntegrationsModule();
  
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('INITIAL');
  const [blockReasons, setBlockReasons] = useState<BlockReason[]>([]);
  const [companyChecklist, setCompanyChecklist] = useState<CompanyDocItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentIntegrationId, setCurrentIntegrationId] = useState<string | null>(null);
  const [earliestExpiry, setEarliestExpiry] = useState<string | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{
    type: 'company' | 'technician';
    docTypeId: string;
    docTypeName: string;
    requiresExpiry: boolean;
    technicianId?: string;
    technicianName?: string;
  } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExpiresAt, setUploadExpiresAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    companyRequirements, 
    technicianRequirements, 
    isLoading: loadingReqs 
  } = useClientDocumentRequirements(selectedClientId || undefined);

  const activeTechnicians = colaboradores.filter(c => c.status === 'ativo');
  const activeClients = clientes.filter(c => c.status === 'ativo');

  const { 
    techniciansWithDocs, 
    refetch: refetchTechDocs 
  } = useTechnicianDocsByRequirement(
    selectedTechnicianIds,
    technicianRequirements,
    activeTechnicians
  );

  const { upsertDocComArquivo } = useColaboradorDocs();

  const clientOptions = activeClients.map(c => ({
    value: c.id,
    label: c.nome_fantasia || c.razao_social || '',
    sublabel: c.cpf_cnpj || undefined,
  }));

  const technicianOptions = activeTechnicians.map(t => ({
    value: t.id,
    label: t.nome_fantasia || t.razao_social || '',
    sublabel: t.cpf_cnpj || undefined,
  }));

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedTechnicianIds([]);
    setValidationStatus('INITIAL');
    setBlockReasons([]);
    setCompanyChecklist([]);
    setCurrentIntegrationId(null);
    setEarliestExpiry(null);
  };

  const runValidation = async () => {
    if (!selectedClientId) {
      toast.error('Selecione um cliente');
      return;
    }
    if (selectedTechnicianIds.length === 0) {
      toast.error('Selecione ao menos um técnico');
      return;
    }

    const reasons: BlockReason[] = [];
    let minExpiry: Date | null = null;

    // Build company checklist
    const companyList: CompanyDocItem[] = companyRequirements.map(req => {
      const doc = companyDocs.find(d => d.document_type_id === req.document_type_id);
      const docType = req.document_type;
      const requiresExpiry = docType?.requires_expiry ?? false;
      
      let state: DocState = 'MISSING';
      let expiresAt: string | undefined;
      let fileUrl: string | undefined;
      let fileName: string | undefined;

      if (doc && doc.file_url) {
        fileUrl = doc.file_url;
        fileName = doc.file_name;
        expiresAt = doc.expires_at || undefined;
        
        const statusInfo = getDocumentStatus(doc.expires_at, requiresExpiry);
        state = statusInfo.status;
        
        // Track earliest expiry
        if (expiresAt && state === 'OK') {
          const expDate = new Date(expiresAt);
          if (!minExpiry || expDate < minExpiry) {
            minExpiry = expDate;
          }
        }
      }

      if (req.is_required && state !== 'OK') {
        reasons.push({
          scope: 'EMPRESA',
          doc_type: docType?.name || 'Documento',
          reason: state === 'MISSING' ? 'Não anexado' : 'Vencido'
        });
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
      };
    });

    // Check technician docs
    techniciansWithDocs.forEach(tech => {
      tech.docs.forEach(doc => {
        if (doc.is_required && doc.state !== 'OK') {
          reasons.push({
            scope: 'TÉCNICO',
            entity_name: tech.technician_name,
            doc_type: doc.doc_type_name,
            reason: doc.state === 'MISSING' ? 'Não anexado' : 'Vencido'
          });
        }
        
        // Track earliest expiry for technician docs
        if (doc.state === 'OK' && doc.expires_at) {
          const expDate = new Date(doc.expires_at);
          if (!minExpiry || expDate < minExpiry) {
            minExpiry = expDate;
          }
        }
      });
    });

    setCompanyChecklist(companyList);
    setBlockReasons(reasons);
    
    const newStatus = reasons.length > 0 ? 'BLOCKED' : 'AUTHORIZED';
    setValidationStatus(newStatus);
    
    const expiryStr = minExpiry ? format(minExpiry, 'yyyy-MM-dd') : null;
    setEarliestExpiry(expiryStr);

    // Create or update integration record
    try {
      if (currentIntegrationId) {
        // Update existing
        await updateIntegration.mutateAsync({
          id: currentIntegrationId,
          data: {
            status: newStatus === 'AUTHORIZED' ? 'authorized' : 'blocked',
            blocked_reasons: reasons,
            earliest_expiry_date: expiryStr,
            validated_at: new Date().toISOString(),
          }
        });
      } else {
        // Create new
        const result = await createIntegration.mutateAsync({
          client_id: selectedClientId,
          technician_ids: selectedTechnicianIds,
          status: newStatus === 'AUTHORIZED' ? 'authorized' : 'blocked',
          blocked_reasons: reasons,
          earliest_expiry_date: expiryStr,
        });
        setCurrentIntegrationId(result.id);
      }
    } catch (error) {
      console.error('Failed to save integration:', error);
    }
  };

  const handleOpenUploadModal = (
    type: 'company' | 'technician',
    docTypeId: string,
    docTypeName: string,
    requiresExpiry: boolean,
    technicianId?: string,
    technicianName?: string
  ) => {
    setUploadTarget({ type, docTypeId, docTypeName, requiresExpiry, technicianId, technicianName });
    setUploadFile(null);
    setUploadExpiresAt('');
    setUploadModalOpen(true);
  };

  const handleUpload = async () => {
    if (!uploadTarget || !uploadFile) return;
    if (uploadTarget.requiresExpiry && !uploadExpiresAt) {
      toast.error('Data de vencimento obrigatória');
      return;
    }

    setUploading(true);
    try {
      if (uploadTarget.type === 'company') {
        await uploadDocument.mutateAsync({
          documentTypeId: uploadTarget.docTypeId,
          file: uploadFile,
          expiresAt: uploadExpiresAt || null,
        });
        await refetchCompanyDocs();
      } else if (uploadTarget.technicianId) {
        const docType = technicianRequirements.find(r => r.document_type_id === uploadTarget.docTypeId)?.document_type;
        const tipoCode = docType?.code?.toUpperCase() as any || 'OUTROS';
        
        await upsertDocComArquivo.mutateAsync({
          colaborador_id: uploadTarget.technicianId,
          tipo: tipoCode,
          data_vencimento: uploadExpiresAt,
          arquivo: uploadFile,
        });
        await refetchTechDocs();
      }

      setUploadModalOpen(false);
      toast.success('Documento enviado com sucesso!');
      
      // Re-run validation after upload
      setTimeout(() => runValidation(), 500);
    } catch (error: any) {
      toast.error('Erro ao enviar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadKit = async () => {
    if (validationStatus !== 'AUTHORIZED') {
      toast.error('Não é possível gerar kit com bloqueios');
      return;
    }
    
    setGenerating(true);
    try {
      const zip = new JSZip();
      const empresaFolder = zip.folder('EMPRESA');
      const tecnicosFolder = zip.folder('TECNICOS');

      const manifest: Record<string, unknown> = {
        generated_at: new Date().toISOString(),
        client_id: selectedClientId,
        technician_ids: selectedTechnicianIds,
        company_docs: [] as string[],
        technician_docs: {} as Record<string, string[]>,
      };

      // Add company docs
      for (const doc of companyChecklist) {
        if (doc.file_url && doc.state === 'OK') {
          try {
            const response = await fetch(doc.file_url);
            const blob = await response.blob();
            const fileName = doc.file_name || `${doc.doc_type_code}.pdf`;
            empresaFolder?.file(fileName, blob);
            (manifest.company_docs as string[]).push(fileName);
          } catch (e) {
            console.warn('Failed to fetch company doc:', doc.doc_type_name);
          }
        }
      }

      // Add technician docs
      for (const tech of techniciansWithDocs) {
        const techFolderName = tech.technician_name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
        const techFolder = tecnicosFolder?.folder(techFolderName);
        const techDocs: string[] = [];
        
        for (const doc of tech.docs) {
          if (doc.file_url && doc.state === 'OK') {
            try {
              const response = await fetch(doc.file_url);
              const blob = await response.blob();
              const fileName = doc.file_name || `${doc.doc_type_code}.pdf`;
              techFolder?.file(fileName, blob);
              techDocs.push(fileName);
            } catch (e) {
              console.warn('Failed to fetch tech doc:', doc.doc_type_name);
            }
          }
        }
        (manifest.technician_docs as Record<string, string[]>)[tech.technician_id] = techDocs;
      }

      // Add manifest
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      const client = activeClients.find(c => c.id === selectedClientId);
      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `Kit_${(client?.nome_fantasia || client?.razao_social || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.zip`;
      
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Update integration with ZIP info
      if (currentIntegrationId) {
        await updateIntegration.mutateAsync({
          id: currentIntegrationId,
          data: {
            zip_file_name: fileName,
            manifest: manifest,
          }
        });
      }

      toast.success('Kit ZIP gerado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao gerar kit: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    const client = activeClients.find(c => c.id === selectedClientId);
    const subject = encodeURIComponent(`WeDo | Kit de Documentação - ${client?.nome_fantasia || client?.razao_social}`);
    const body = encodeURIComponent(`Prezados,\n\nSegue em anexo o kit de documentação.\n\nAtenciosamente,\nWeDo`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    
    // Mark as sent
    if (currentIntegrationId) {
      await updateIntegration.mutateAsync({
        id: currentIntegrationId,
        data: {
          status: 'sent',
          sent_at: new Date().toISOString(),
        }
      });
      toast.success('Integração marcada como enviada');
    } else {
      toast.info('Baixe o ZIP e anexe ao e-mail');
    }
  };

  const getStatusIcon = (state: DocState) => {
    switch (state) {
      case 'OK': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'EXPIRED': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'MISSING': return <FileX className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (state: DocState) => {
    switch (state) {
      case 'OK': return <Badge className="bg-green-500 text-white">OK</Badge>;
      case 'EXPIRED': return <Badge variant="outline" className="text-orange-500 border-orange-500">VENCIDO</Badge>;
      case 'MISSING': return <Badge variant="destructive">FALTANDO</Badge>;
    }
  };

  const hasRequirements = companyRequirements.length > 0 || technicianRequirements.length > 0;
  const canValidate = selectedClientId && hasRequirements && selectedTechnicianIds.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Nova Integração"
        description="Gere o kit de documentação para acesso"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA - SELEÇÃO */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Seleção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <SearchableSelect
                options={clientOptions}
                value={selectedClientId}
                onChange={handleSelectClient}
                placeholder="Digite para buscar cliente..."
                searchPlaceholder="Buscar por nome ou CNPJ..."
                emptyMessage="Nenhum cliente encontrado"
              />
            </div>

            {selectedClientId && !loadingReqs && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Requisitos do cliente:</p>
                <p className="text-muted-foreground">
                  • {companyRequirements.length} documento(s) da empresa
                </p>
                <p className="text-muted-foreground">
                  • {technicianRequirements.length} documento(s) do técnico
                </p>
                {!hasRequirements && (
                  <p className="text-amber-600 mt-2 text-xs">
                    ⚠️ Nenhum requisito cadastrado. Configure na aba "Requisitos" do cliente.
                  </p>
                )}
              </div>
            )}

            {selectedClientId && hasRequirements && (
              <div>
                <Label>Técnicos</Label>
                <SearchableMultiSelect
                  options={technicianOptions}
                  values={selectedTechnicianIds}
                  onChange={setSelectedTechnicianIds}
                  placeholder="Digite para buscar técnicos..."
                  searchPlaceholder="Buscar por nome..."
                  emptyMessage="Nenhum técnico encontrado"
                />
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={runValidation}
              disabled={!canValidate}
            >
              <Save className="h-4 w-4 mr-2" />
              Validar Documentação
            </Button>
            
            {currentIntegrationId && (
              <p className="text-xs text-muted-foreground text-center">
                ID: {currentIntegrationId.slice(0, 8)}...
              </p>
            )}
          </CardContent>
        </Card>

        {/* COLUNA DIREITA - RESULTADO */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {validationStatus === 'AUTHORIZED' ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <span className="text-green-600">AUTORIZADO</span>
                  {earliestExpiry && (
                    <span className="text-muted-foreground text-sm font-normal ml-2">
                      (válido até {format(new Date(earliestExpiry), 'dd/MM/yyyy')})
                    </span>
                  )}
                </>
              ) : validationStatus === 'BLOCKED' ? (
                <>
                  <ShieldX className="h-5 w-5 text-destructive" />
                  <span className="text-destructive">BLOQUEADO</span>
                  <span className="text-muted-foreground text-sm font-normal ml-2">
                    Documentos com problema ({blockReasons.length})
                  </span>
                </>
              ) : (
                'Resultado da Validação'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationStatus === 'INITIAL' && (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione cliente e técnicos</p>
                <p>e clique em "Validar Documentação"</p>
              </div>
            )}

            {validationStatus !== 'INITIAL' && (
              <div className="space-y-6">
                {blockReasons.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-destructive font-medium mb-3">
                      <AlertCircle className="h-4 w-4" />
                      Documentos pendentes
                    </div>
                    <ul className="space-y-1 text-sm">
                      {blockReasons.map((r, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {r.scope}{r.entity_name ? `: ${r.entity_name}` : ''} — {r.doc_type} — {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {companyChecklist.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4" />
                      Documentos da Empresa
                    </h4>
                    <div className="space-y-2">
                      {companyChecklist.map(doc => (
                        <div 
                          key={doc.doc_type_id} 
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(doc.state)}
                            <span className="font-medium">{doc.doc_type_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {doc.state === 'OK' && doc.expires_at && (
                              <span className="text-xs text-muted-foreground">
                                vence em {format(new Date(doc.expires_at), 'MM/yyyy')}
                              </span>
                            )}
                            {doc.state !== 'OK' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenUploadModal(
                                  'company',
                                  doc.doc_type_id,
                                  doc.doc_type_name,
                                  doc.requires_expiry
                                )}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Enviar agora
                              </Button>
                            ) : (
                              getStatusBadge(doc.state)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {techniciansWithDocs.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      Documentos dos Técnicos
                    </h4>
                    <div className="space-y-4">
                      {techniciansWithDocs.map(tech => (
                        <div key={tech.technician_id} className="border rounded-lg p-4">
                          <h5 className="font-medium mb-3">{tech.technician_name}</h5>
                          <div className="space-y-2">
                            {tech.docs.map(doc => (
                              <div 
                                key={doc.doc_type_id} 
                                className="flex items-center justify-between p-2 bg-muted/50 rounded"
                              >
                                <div className="flex items-center gap-3">
                                  {getStatusIcon(doc.state)}
                                  <span className="text-sm">{doc.doc_type_name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {doc.state === 'OK' && doc.expires_at && (
                                    <span className="text-xs text-muted-foreground">
                                      vence em {format(new Date(doc.expires_at), 'MM/yyyy')}
                                    </span>
                                  )}
                                  {doc.state !== 'OK' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenUploadModal(
                                        'technician',
                                        doc.doc_type_id,
                                        doc.doc_type_name,
                                        doc.requires_expiry,
                                        tech.technician_id,
                                        tech.technician_name
                                      )}
                                    >
                                      <Upload className="h-3 w-3 mr-1" />
                                      Enviar agora
                                    </Button>
                                  ) : (
                                    getStatusBadge(doc.state)
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {validationStatus === 'AUTHORIZED' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      onClick={handleDownloadKit}
                      disabled={generating}
                      className="flex-1"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Gerar ZIP
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={handleSendEmail}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar por e-mail
                    </Button>
                  </div>
                )}

                {validationStatus === 'BLOCKED' && (
                  <div className="flex gap-3 pt-4 border-t opacity-50">
                    <Button disabled className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Gerar ZIP
                    </Button>
                    <Button variant="outline" disabled className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar por e-mail
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE UPLOAD */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Tipo de Documento</Label>
              <p className="font-medium">{uploadTarget?.docTypeName}</p>
              {uploadTarget?.technicianName && (
                <p className="text-sm text-muted-foreground">
                  Técnico: {uploadTarget.technicianName}
                </p>
              )}
            </div>

            <div>
              <Label>Arquivo *</Label>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>

            {uploadTarget?.requiresExpiry && (
              <div>
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={uploadExpiresAt}
                  onChange={(e) => setUploadExpiresAt(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!uploadFile || (uploadTarget?.requiresExpiry && !uploadExpiresAt) || uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
