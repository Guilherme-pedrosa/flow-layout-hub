import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldX, Download, Mail, Building2, Users, FileCheck, FileX, 
  AlertTriangle, CheckCircle, Clock, Loader2 
} from "lucide-react";
import { usePessoas } from "@/hooks/usePessoas";
import { useClientUnits } from "@/hooks/useClientUnits";
import { useRh } from "@/hooks/useRh";
import { useAccessIntegration, AccessPreview } from "@/hooks/useAccessIntegration";
import { toast } from "sonner";

export default function NovaIntegracao() {
  const navigate = useNavigate();
  const { clientes } = usePessoas();
  const { colaboradores } = useRh();
  const { generatePreview, generateKit, saveKit } = useAccessIntegration();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<AccessPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { units } = useClientUnits(selectedClientId || undefined);

  // Active technicians only
  const activeTechnicians = colaboradores.filter(c => c.status === 'ativo');

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedUnitId('');
    setPreview(null);
  };

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    setPreview(null);
  };

  const toggleTechnician = (techId: string) => {
    setSelectedTechnicianIds(prev =>
      prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
    );
    setPreview(null);
  };

  const handlePreview = async () => {
    if (!selectedUnitId || selectedTechnicianIds.length === 0) {
      toast.error('Selecione uma unidade e ao menos um técnico');
      return;
    }
    setLoading(true);
    try {
      const result = await generatePreview(selectedUnitId, selectedTechnicianIds);
      setPreview(result);
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
      const { blob, fileName, manifest } = await generateKit(preview);
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Save kit record (we'd need to upload to storage first in production)
      // For now, just show success
      toast.success('Kit ZIP gerado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao gerar kit: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!preview || preview.status === 'BLOCKED') {
      toast.error('Não é possível enviar kit com bloqueios');
      return;
    }

    const unit = units.find(u => u.id === selectedUnitId);
    if (!unit?.access_email_to?.length) {
      toast.error('Unidade não tem e-mails de envio cadastrados');
      return;
    }

    // Generate kit first
    setGenerating(true);
    try {
      const { blob, fileName } = await generateKit(preview);
      
      // For mailto, we can't attach files, but we open the email client
      const subject = encodeURIComponent(`WeDo | Kit de Documentação - ${preview.unit_name} - ${new Date().toLocaleDateString('pt-BR')}`);
      const body = encodeURIComponent(
        `Prezados,\n\nSegue em anexo o kit de documentação da WeDo e do(s) colaborador(es) para liberação de acesso na unidade ${preview.unit_name}.\n\nQualquer ajuste necessário, favor informar.\n\nAtenciosamente,\nWeDo`
      );
      const to = unit.access_email_to.join(',');
      const cc = unit.access_email_cc?.join(',') || '';
      
      window.open(`mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`, '_blank');
      
      // Also download the kit for manual attachment
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Kit baixado e e-mail aberto. Anexe o ZIP manualmente.');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
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

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'OK': return <Badge className="bg-green-500">OK</Badge>;
      case 'EXPIRED': return <Badge variant="outline" className="text-orange-500 border-orange-500">VENCIDO</Badge>;
      case 'MISSING': return <Badge variant="destructive">FALTANDO</Badge>;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Nova Integração"
        description="Gere o kit de acesso para técnicos em unidades de clientes"
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Selection Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Seleção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client */}
            <div>
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={handleSelectClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.filter(c => c.status === 'ativo').map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit */}
            {selectedClientId && (
              <div>
                <Label>Unidade</Label>
                <Select value={selectedUnitId} onValueChange={handleSelectUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.filter(u => u.is_active).map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.unit_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {units.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhuma unidade cadastrada para este cliente.
                  </p>
                )}
              </div>
            )}

            {/* Technicians */}
            {selectedUnitId && (
              <div>
                <Label>Técnicos ({selectedTechnicianIds.length} selecionados)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2 mt-1">
                  {activeTechnicians.map(tech => (
                    <div
                      key={tech.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => toggleTechnician(tech.id)}
                    >
                      <Checkbox checked={selectedTechnicianIds.includes(tech.id)} />
                      <span className="text-sm">{tech.nome_fantasia || tech.razao_social}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handlePreview}
              disabled={!selectedUnitId || selectedTechnicianIds.length === 0 || loading}
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
                <p>Selecione unidade e técnicos, depois clique em "Validar Documentação"</p>
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
                          {getStatusBadge(doc.state)}
                        </div>
                      </div>
                    ))}
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
                      
                      {/* Integration status */}
                      {tech.integration && (
                        <div className="flex items-center justify-between p-2 bg-muted rounded mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(tech.integration.state)}
                            <span className="text-sm">Integração Local</span>
                          </div>
                          {getStatusBadge(tech.integration.state)}
                        </div>
                      )}

                      {/* Tech docs */}
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
                            {getStatusBadge(doc.state)}
                          </div>
                        ))}
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
                      onClick={handleSendEmail}
                      disabled={generating}
                      variant="outline"
                      className="flex-1"
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
