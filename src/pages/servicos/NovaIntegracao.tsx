import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShieldCheck, ShieldX, Download, Mail, Building2, Users, FileCheck, FileX, 
  AlertTriangle, CheckCircle, Clock, Loader2 
} from "lucide-react";
import { usePessoas } from "@/hooks/usePessoas";
import { useRh } from "@/hooks/useRh";
import { useClientDocumentRequirements } from "@/hooks/useClientDocumentRequirements";
import { useCompanyDocuments, getDocumentStatus } from "@/hooks/useCompanyDocuments";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { SearchableMultiSelect } from "@/components/shared/SearchableMultiSelect";
import { toast } from "sonner";
import JSZip from "jszip";

type DocState = 'OK' | 'EXPIRED' | 'MISSING';

interface DocItem {
  doc_type_id: string;
  doc_type_code: string;
  doc_type_name: string;
  state: DocState;
  file_url?: string;
  file_name?: string;
  expires_at?: string;
  is_required: boolean;
}

interface TechChecklist {
  technician_id: string;
  technician_name: string;
  docs: DocItem[];
}

interface PreviewResult {
  client_name: string;
  status: 'AUTHORIZED' | 'BLOCKED';
  block_reasons: { scope: string; doc_type: string; reason: string }[];
  checklist: {
    company: DocItem[];
    technicians: TechChecklist[];
  };
}

export default function NovaIntegracao() {
  const { clientes } = usePessoas();
  const { colaboradores } = useRh();
  const { documents: companyDocs } = useCompanyDocuments();
  
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [docScope, setDocScope] = useState<'both' | 'company' | 'technician'>('both');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { companyRequirements, technicianRequirements, isLoading: loadingReqs } = 
    useClientDocumentRequirements(selectedClientId || undefined);

  const activeTechnicians = colaboradores.filter(c => c.status === 'ativo');
  const activeClients = clientes.filter(c => c.status === 'ativo');

  // Options for searchable selects
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
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!selectedClientId) {
      toast.error('Selecione um cliente');
      return;
    }
    if (docScope !== 'company' && selectedTechnicianIds.length === 0) {
      toast.error('Selecione ao menos um técnico');
      return;
    }
    setLoading(true);
    try {
      const client = activeClients.find(c => c.id === selectedClientId);
      const blockReasons: { scope: string; doc_type: string; reason: string }[] = [];

      // Build company checklist (only if scope includes company)
      const companyChecklist: DocItem[] = docScope !== 'technician' 
        ? companyRequirements.map(req => {
            const doc = companyDocs.find(d => d.document_type_id === req.document_type_id);
            const docType = req.document_type;
            
            let state: DocState = 'MISSING';
            let expiresAt: string | undefined;
            let fileUrl: string | undefined;
            let fileName: string | undefined;

            if (doc) {
              fileUrl = doc.file_url;
              fileName = doc.file_name;
              expiresAt = doc.expires_at || undefined;
              
              const statusInfo = getDocumentStatus(doc.expires_at, docType?.requires_expiry ?? false);
              state = statusInfo.status;
            }

            if (req.is_required && state !== 'OK') {
              blockReasons.push({
                scope: 'COMPANY',
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
            };
          })
        : [];

      // Build technician checklists (only if scope includes technician)
      const techChecklists: TechChecklist[] = docScope !== 'company' 
        ? selectedTechnicianIds.map(techId => {
            const tech = activeTechnicians.find(t => t.id === techId);
            
            const techDocs: DocItem[] = technicianRequirements.map(req => {
              const docType = req.document_type;
              // TODO: Fetch actual docs for each technician from colaborador_docs
              const state: DocState = 'MISSING';

              if (req.is_required) {
                blockReasons.push({
                  scope: 'TECHNICIAN',
                  doc_type: `${tech?.nome_fantasia || tech?.razao_social}: ${docType?.name}`,
                  reason: 'Não anexado'
                });
              }

              return {
                doc_type_id: req.document_type_id,
                doc_type_code: docType?.code || '',
                doc_type_name: docType?.name || '',
                state,
                is_required: req.is_required,
              };
            });

            return {
              technician_id: techId,
              technician_name: tech?.nome_fantasia || tech?.razao_social || 'Técnico',
              docs: techDocs,
            };
          })
        : [];

      setPreview({
        client_name: client?.nome_fantasia || client?.razao_social || 'Cliente',
        status: blockReasons.length > 0 ? 'BLOCKED' : 'AUTHORIZED',
        block_reasons: blockReasons,
        checklist: {
          company: companyChecklist,
          technicians: techChecklists,
        },
      });
    } catch (error: any) {
      toast.error('Erro ao gerar preview: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadKit = async () => {
    if (!preview || preview.status === 'BLOCKED') {
      toast.error('Não é possível gerar kit com bloqueios');
      return;
    }
    setGenerating(true);
    try {
      const zip = new JSZip();
      const empresaFolder = zip.folder('EMPRESA');
      const tecnicosFolder = zip.folder('TECNICOS');

      // Add company docs
      for (const doc of preview.checklist.company) {
        if (doc.file_url && doc.state === 'OK') {
          try {
            const response = await fetch(doc.file_url);
            const blob = await response.blob();
            empresaFolder?.file(doc.file_name || `${doc.doc_type_code}.pdf`, blob);
          } catch (e) {
            console.warn('Failed to fetch company doc:', doc.doc_type_name);
          }
        }
      }

      // Add technician docs
      for (const tech of preview.checklist.technicians) {
        const techFolder = tecnicosFolder?.folder(tech.technician_name.replace(/[^a-zA-Z0-9]/g, '_'));
        for (const doc of tech.docs) {
          if (doc.file_url && doc.state === 'OK') {
            try {
              const response = await fetch(doc.file_url);
              const blob = await response.blob();
              techFolder?.file(doc.file_name || `${doc.doc_type_code}.pdf`, blob);
            } catch (e) {
              console.warn('Failed to fetch tech doc:', doc.doc_type_name);
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const fileName = `Kit_${preview.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
      
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Kit ZIP gerado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao gerar kit: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'OK': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'EXPIRED': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'MISSING': return <FileX className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (state: string, isRequired: boolean) => {
    const suffix = isRequired ? '' : ' (opcional)';
    switch (state) {
      case 'OK': return <Badge className="bg-green-500">OK</Badge>;
      case 'EXPIRED': return <Badge variant="outline" className="text-orange-500 border-orange-500">VENCIDO{suffix}</Badge>;
      case 'MISSING': return <Badge variant={isRequired ? "destructive" : "outline"}>FALTANDO{suffix}</Badge>;
      default: return null;
    }
  };

  const hasRequirements = companyRequirements.length > 0 || technicianRequirements.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Kit Documentação"
        description="Gere o kit de documentação para acesso de técnicos em clientes"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Selection Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Seleção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client - Searchable */}
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

            {/* Requirements info */}
            {selectedClientId && !loadingReqs && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Requisitos do cliente:</p>
                <p className="text-muted-foreground">
                  {companyRequirements.length} doc(s) empresa • {technicianRequirements.length} doc(s) técnico
                </p>
                {!hasRequirements && (
                  <p className="text-amber-600 mt-1">
                    ⚠️ Nenhum requisito cadastrado. Configure na aba "Requisitos" do cliente.
                  </p>
                )}
              </div>
            )}

            {/* Document scope selection */}
            {selectedClientId && hasRequirements && (
              <div>
                <Label className="mb-2 block">Tipo de Documentação</Label>
                <RadioGroup
                  value={docScope}
                  onValueChange={(v) => setDocScope(v as 'both' | 'company' | 'technician')}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="scope-both" />
                    <Label htmlFor="scope-both" className="font-normal cursor-pointer">
                      Empresa + Técnico
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="scope-company" />
                    <Label htmlFor="scope-company" className="font-normal cursor-pointer">
                      Somente Empresa
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="technician" id="scope-technician" />
                    <Label htmlFor="scope-technician" className="font-normal cursor-pointer">
                      Somente Técnico
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Technicians - Searchable Multi-select */}
            {selectedClientId && hasRequirements && docScope !== 'company' && (
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
              onClick={handlePreview}
              disabled={!selectedClientId || !hasRequirements || (docScope !== 'company' && selectedTechnicianIds.length === 0) || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Validar Documentação
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {preview?.status === 'AUTHORIZED' ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <span className="text-green-600">AUTORIZADO</span>
                </>
              ) : preview?.status === 'BLOCKED' ? (
                <>
                  <ShieldX className="h-5 w-5 text-red-500" />
                  <span className="text-red-600">BLOQUEADO</span>
                </>
              ) : (
                'Resultado da Validação'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione cliente e técnicos, depois clique em "Validar Documentação"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Block reasons */}
                {preview.block_reasons.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Documentos com problema ({preview.block_reasons.length})</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {preview.block_reasons.map((reason, i) => (
                          <li key={i}>
                            {reason.scope === 'COMPANY' ? 'Empresa' : 'Técnico'}: {reason.doc_type} - {reason.reason}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Company docs */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4" />
                    Documentos da Empresa
                  </h4>
                  <div className="grid gap-2">
                    {preview.checklist.company.map(doc => (
                      <div 
                        key={doc.doc_type_id} 
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.state)}
                          <span className="text-sm">{doc.doc_type_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.expires_at && (
                            <span className="text-xs text-muted-foreground">
                              Vence: {new Date(doc.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {getStatusBadge(doc.state, doc.is_required)}
                        </div>
                      </div>
                    ))}
                    {preview.checklist.company.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum documento de empresa exigido
                      </p>
                    )}
                  </div>
                </div>

                {/* Technician docs */}
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4" />
                    Documentos dos Técnicos
                  </h4>
                  {preview.checklist.technicians.map(tech => (
                    <div key={tech.technician_id} className="border rounded p-3 mb-3">
                      <h5 className="font-medium mb-2">{tech.technician_name}</h5>
                      <div className="grid gap-1">
                        {tech.docs.map(doc => (
                          <div 
                            key={doc.doc_type_id} 
                            className="flex items-center justify-between p-2 border rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.state)}
                              <span>{doc.doc_type_name}</span>
                            </div>
                            {getStatusBadge(doc.state, doc.is_required)}
                          </div>
                        ))}
                        {tech.docs.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhum documento exigido
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {preview.status === 'AUTHORIZED' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      onClick={handleDownloadKit}
                      disabled={generating}
                      className="flex-1"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                      Baixar Kit ZIP
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const client = activeClients.find(c => c.id === selectedClientId);
                        const subject = encodeURIComponent(`WeDo | Kit de Documentação - ${client?.nome_fantasia || client?.razao_social}`);
                        const body = encodeURIComponent(`Prezados,\n\nSegue em anexo o kit de documentação.\n\nAtenciosamente,\nWeDo`);
                        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                        toast.info('Baixe o ZIP e anexe ao e-mail');
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar por E-mail
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
