import { useState, useRef } from "react";
import { useClienteAcesso, TecnicoAcesso } from "@/hooks/useClienteAcesso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Plus, Download, Edit, Ban, CheckCircle, AlertTriangle, XCircle, 
  User, FileText, Upload, Loader2, RotateCcw, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clienteId: string;
  exigeIntegracao: boolean;
  regrasAcesso: string;
  onConfigChange: (exige: boolean, regras: string) => void;
}

function StatusBadge({ status }: { status: TecnicoAcesso['statusAcesso'] }) {
  switch (status) {
    case 'AUTORIZADO':
      return (
        <Badge className="bg-green-600 text-white text-sm px-3 py-1">
          <CheckCircle className="h-4 w-4 mr-1" />
          AUTORIZADO
        </Badge>
      );
    case 'A_VENCER':
      return (
        <Badge className="bg-yellow-600 text-white text-sm px-3 py-1">
          <AlertTriangle className="h-4 w-4 mr-1" />
          A VENCER
        </Badge>
      );
    case 'BLOQUEADO':
      return (
        <Badge variant="destructive" className="text-sm px-3 py-1">
          <XCircle className="h-4 w-4 mr-1" />
          BLOQUEADO
        </Badge>
      );
  }
}

export function ClienteFormTecnicosIntegrados({ clienteId, exigeIntegracao, regrasAcesso, onConfigChange }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    colaborador_id: '',
    data_validade: '',
    observacoes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    tecnicos,
    isLoading,
    addTecnico,
    updateTecnico,
    revogarAcesso,
    reativarAcesso,
    deleteTecnico,
    uploadComprovante,
    colaboradoresDisponiveis,
    allColaboradores,
  } = useClienteAcesso(clienteId);

  const handleOpenDialog = (tecnico?: TecnicoAcesso) => {
    if (tecnico) {
      setEditingId(tecnico.id);
      setFormData({
        colaborador_id: tecnico.colaborador_id,
        data_validade: tecnico.data_validade,
        observacoes: tecnico.observacoes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        colaborador_id: '',
        data_validade: '',
        observacoes: '',
      });
    }
    setSelectedFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.colaborador_id || !formData.data_validade) return;

    setUploading(true);
    try {
      if (editingId) {
        await updateTecnico.mutateAsync({
          id: editingId,
          data: {
            data_validade: formData.data_validade,
            observacoes: formData.observacoes || null,
          },
        });
        
        // Upload de arquivo se selecionado
        if (selectedFile) {
          await uploadComprovante(selectedFile, editingId);
        }
      } else {
        // Primeiro criar o registro
        await addTecnico.mutateAsync({
          colaborador_id: formData.colaborador_id,
          data_validade: formData.data_validade,
          observacoes: formData.observacoes,
        });
      }
      setDialogOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRevogar = async (id: string) => {
    const motivo = prompt('Motivo do bloqueio (opcional):');
    await revogarAcesso.mutateAsync({ id, motivo: motivo || undefined });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover este registro de acesso?')) {
      await deleteTecnico.mutateAsync(id);
    }
  };

  // Contadores
  const autorizados = tecnicos.filter(t => t.statusAcesso === 'AUTORIZADO').length;
  const aVencer = tecnicos.filter(t => t.statusAcesso === 'A_VENCER').length;
  const bloqueados = tecnicos.filter(t => t.statusAcesso === 'BLOQUEADO').length;

  return (
    <div className="space-y-6">
      {/* Configuração da Unidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração de Acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Esta unidade exige integração?</Label>
              <p className="text-sm text-muted-foreground">
                Se ativado, apenas técnicos integrados poderão ser alocados
              </p>
            </div>
            <Switch
              checked={exigeIntegracao}
              onCheckedChange={(checked) => onConfigChange(checked, regrasAcesso)}
            />
          </div>

          {!exigeIntegracao ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Acesso Livre</AlertTitle>
              <AlertDescription className="text-green-700">
                Qualquer técnico com documentação em dia pode atender esta unidade
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label>Instruções / Regras de Acesso</Label>
              <Textarea
                placeholder="Ex: Portaria exige ASO e CNH impressos. Procurar Sr. Carlos na recepção."
                value={regrasAcesso}
                onChange={(e) => onConfigChange(exigeIntegracao, e.target.value)}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de Técnicos (só mostra se exige integração) */}
      {exigeIntegracao && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Técnicos Autorizados
              </CardTitle>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-green-600">✓ {autorizados} autorizados</span>
                <span className="text-yellow-600">⚠ {aVencer} a vencer</span>
                <span className="text-red-600">✕ {bloqueados} bloqueados</span>
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Técnico
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : tecnicos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum técnico integrado nesta unidade</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Técnico
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead className="w-[150px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tecnicos.map(tecnico => (
                    <TableRow key={tecnico.id} className={tecnico.statusAcesso === 'BLOQUEADO' ? 'bg-red-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {tecnico.colaborador?.nome_fantasia || tecnico.colaborador?.razao_social || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={tecnico.statusAcesso} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {format(new Date(tecnico.data_validade), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          {tecnico.diasParaVencer > 0 && tecnico.diasParaVencer <= 30 && (
                            <p className="text-xs text-yellow-600">
                              {tecnico.diasParaVencer} dias restantes
                            </p>
                          )}
                          {tecnico.diasParaVencer < 0 && (
                            <p className="text-xs text-red-600">
                              Vencido há {Math.abs(tecnico.diasParaVencer)} dias
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tecnico.comprovante_url ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(tecnico.comprovante_url!, tecnico.nome_arquivo || 'comprovante.pdf')}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {tecnico.nome_arquivo?.substring(0, 15) || 'Baixar'}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem arquivo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(tecnico)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {tecnico.is_blocked ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => reativarAcesso.mutate(tecnico.id)}
                              title="Reativar acesso"
                            >
                              <RotateCcw className="h-4 w-4 text-green-600" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRevogar(tecnico.id)}
                              title="Revogar acesso"
                            >
                              <Ban className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(tecnico.id)}
                            title="Excluir registro"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Acesso' : 'Adicionar Técnico'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Atualize a validade e documentos' : 'Cadastre um técnico integrado nesta unidade'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Técnico</Label>
              <Select 
                value={formData.colaborador_id} 
                onValueChange={(v) => setFormData({ ...formData, colaborador_id: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {(editingId ? allColaboradores : colaboradoresDisponiveis).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Data de Validade</Label>
              <Input 
                type="date"
                value={formData.data_validade}
                onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Comprovante/Certificado</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações opcionais"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.colaborador_id || !formData.data_validade || uploading || addTecnico.isPending || updateTecnico.isPending}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
