import { useState, useRef } from "react";
import { useCompanyDocuments, getDocumentStatus } from "@/hooks/useCompanyDocuments";
import { useDocumentTypes } from "@/hooks/useDocumentTypes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared";
import { Upload, FileText, ExternalLink, Trash2, CheckCircle, XCircle, AlertTriangle, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatusBadge({ status, color }: { status: string; color: 'green' | 'yellow' | 'red' }) {
  if (color === 'green') return <Badge className="bg-green-600">{status}</Badge>;
  if (color === 'yellow') return <Badge className="bg-yellow-600">{status}</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
}

export default function DocumentosEmpresaPage() {
  const { checklist, stats, isLoading, uploadDocument, deleteDocument } = useCompanyDocuments();
  const { companyTypes, isLoading: loadingTypes } = useDocumentTypes();
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!selectedTypeId || !selectedFile) return;
    
    const docType = companyTypes.find(dt => dt.id === selectedTypeId);
    let finalExpiresAt = expiresAt;
    
    // Se modo é ISSUE_PLUS_DAYS, calcular vencimento
    if (docType?.expiry_mode === 'ISSUE_PLUS_DAYS' && issueDate && docType.default_validity_days) {
      const issue = new Date(issueDate);
      issue.setDate(issue.getDate() + docType.default_validity_days);
      finalExpiresAt = issue.toISOString().split('T')[0];
    }
    
    await uploadDocument.mutateAsync({
      documentTypeId: selectedTypeId,
      file: selectedFile,
      expiresAt: finalExpiresAt || undefined,
      notes: notes || undefined,
    });
    
    setUploadDialogOpen(false);
    setSelectedTypeId('');
    setExpiresAt('');
    setIssueDate('');
    setNotes('');
    setSelectedFile(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover este documento?')) {
      await deleteDocument.mutateAsync(id);
    }
  };

  const openUploadForType = (typeId: string) => {
    setSelectedTypeId(typeId);
    const docType = companyTypes.find(dt => dt.id === typeId);
    
    // Reset dates
    setExpiresAt('');
    setIssueDate('');
    
    // Se modo ISSUE_PLUS_DAYS, pré-preencher data de emissão com hoje
    if (docType?.expiry_mode === 'ISSUE_PLUS_DAYS') {
      setIssueDate(new Date().toISOString().split('T')[0]);
    }
    
    setUploadDialogOpen(true);
  };

  if (isLoading || loadingTypes) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Documentos da Empresa"
        description="Documentação obrigatória da WeDo para acesso em clientes"
        breadcrumbs={[
          { label: "RH" },
          { label: "Documentos Empresa" },
        ]}
        actions={
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Enviar Documento
          </Button>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Tipos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-sm text-green-700">OK</p>
            <p className="text-2xl font-bold text-green-700">{stats.ok}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-700">Vencendo (30d)</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">Vencidos</p>
            <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">Faltando</p>
            <p className="text-2xl font-bold text-gray-700">{stats.missing}</p>
          </CardContent>
        </Card>
      </div>

      {/* Checklist de Documentos */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Documentos Obrigatórios
          </CardTitle>
          <CardDescription>
            Documentação global da empresa para liberação de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklist.map(item => (
                <TableRow key={item.document_type.id}>
                  <TableCell>
                    {item.color === 'green' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {item.color === 'yellow' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                    {item.color === 'red' && <XCircle className="h-5 w-5 text-red-600" />}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.document_type.name}</p>
                      <p className="text-xs text-muted-foreground">{item.document_type.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.document ? (
                      <a 
                        href={item.document.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {item.document.file_name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground italic">Não enviado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.document?.expires_at ? (
                      <StatusBadge status={item.label} color={item.color} />
                    ) : item.document ? (
                      <span className="text-muted-foreground">Sem validade</span>
                    ) : (
                      <span className="text-red-600">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openUploadForType(item.document_type.id)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      {item.document && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(item.document!.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>
              Faça upload de um documento da empresa
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo de Documento</Label>
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {companyTypes.map(dt => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Arquivo</Label>
              <Input 
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* Campos de data baseados no modo */}
            {(() => {
              const docType = companyTypes.find(dt => dt.id === selectedTypeId);
              if (!docType || docType.expiry_mode === 'NONE') return null;
              
              if (docType.expiry_mode === 'ISSUE_PLUS_DAYS') {
                return (
                  <div className="grid gap-2">
                    <Label>Data de Emissão *</Label>
                    <Input 
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Vencimento será calculado: emissão + {docType.default_validity_days} dias
                    </p>
                  </div>
                );
              }
              
              // EXPIRES_AT mode
              return (
                <div className="grid gap-2">
                  <Label>Data de Vencimento *</Label>
                  <Input 
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              );
            })()}

            <div className="grid gap-2">
              <Label>Observações (opcional)</Label>
              <Input 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Versão 2026"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!selectedTypeId || !selectedFile || uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
