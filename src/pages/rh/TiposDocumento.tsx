import { useState } from "react";
import { useDocumentTypes, DocumentType, DocumentScope } from "@/hooks/useDocumentTypes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared";
import { Plus, Edit, Trash2, Building2, User } from "lucide-react";

export default function TiposDocumentoPage() {
  const { documentTypes, companyTypes, technicianTypes, isLoading, createDocumentType, updateDocumentType, deleteDocumentType } = useDocumentTypes();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    scope: 'COMPANY' as DocumentScope,
    requires_expiry: false,
    default_validity_days: null as number | null,
    is_active: true,
    sort_order: 0,
  });

  const handleOpenDialog = (docType?: DocumentType) => {
    if (docType) {
      setEditingId(docType.id);
      setFormData({
        code: docType.code,
        name: docType.name,
        scope: docType.scope,
        requires_expiry: docType.requires_expiry,
        default_validity_days: docType.default_validity_days,
        is_active: docType.is_active,
        sort_order: docType.sort_order,
      });
    } else {
      setEditingId(null);
      setFormData({
        code: '',
        name: '',
        scope: 'COMPANY',
        requires_expiry: false,
        default_validity_days: null,
        is_active: true,
        sort_order: documentTypes.length + 1,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) return;

    if (editingId) {
      await updateDocumentType.mutateAsync({
        id: editingId,
        data: formData,
      });
    } else {
      await createDocumentType.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover este tipo de documento?')) {
      await deleteDocumentType.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  const renderTable = (types: DocumentType[], icon: React.ReactNode) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Validade</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {types.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
              Nenhum tipo de documento cadastrado
            </TableCell>
          </TableRow>
        ) : (
          types.map((dt, idx) => (
            <TableRow key={dt.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell>
                <code className="bg-muted px-2 py-1 rounded text-xs">{dt.code}</code>
              </TableCell>
              <TableCell className="font-medium">{dt.name}</TableCell>
              <TableCell>
                {dt.requires_expiry ? (
                  <Badge variant="outline">
                    {dt.default_validity_days ? `${dt.default_validity_days} dias` : 'Sim'}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Não expira</span>
                )}
              </TableCell>
              <TableCell>
                {dt.is_active ? (
                  <Badge className="bg-green-600">Ativo</Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(dt)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(dt.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Catálogo de Tipos de Documento"
        description="Configure os tipos de documentos exigidos para empresa e técnicos"
        breadcrumbs={[
          { label: "RH" },
          { label: "Tipos de Documento" },
        ]}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Tipo
          </Button>
        }
      />

      <Tabs defaultValue="company" className="mt-6">
        <TabsList>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa ({companyTypes.length})
          </TabsTrigger>
          <TabsTrigger value="technician" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Técnico ({technicianTypes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Documentos da Empresa</CardTitle>
              <CardDescription>
                Documentos globais da empresa (CNPJ, Contrato Social, LTCAT, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTable(companyTypes, <Building2 className="h-4 w-4" />)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technician">
          <Card>
            <CardHeader>
              <CardTitle>Documentos do Técnico</CardTitle>
              <CardDescription>
                Documentos individuais de cada colaborador (ASO, NRs, Ficha de EPI, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTable(technicianTypes, <User className="h-4 w-4" />)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Novo/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Tipo' : 'Novo Tipo de Documento'}</DialogTitle>
            <DialogDescription>
              Configure as propriedades do tipo de documento
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Código</Label>
                <Input 
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                  placeholder="Ex: NR10"
                  disabled={!!editingId}
                />
              </div>
              <div className="grid gap-2">
                <Label>Escopo</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={(v) => setFormData({ ...formData, scope: v as DocumentScope })}
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY">Empresa</SelectItem>
                    <SelectItem value="TECHNICIAN">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Certificado NR-10"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Exige Validade</Label>
                <p className="text-xs text-muted-foreground">O documento tem data de vencimento?</p>
              </div>
              <Switch 
                checked={formData.requires_expiry}
                onCheckedChange={(v) => setFormData({ ...formData, requires_expiry: v })}
              />
            </div>

            {formData.requires_expiry && (
              <div className="grid gap-2">
                <Label>Validade Padrão (dias)</Label>
                <Input 
                  type="number"
                  value={formData.default_validity_days || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    default_validity_days: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="Ex: 365"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Ativo</Label>
                <p className="text-xs text-muted-foreground">Disponível para seleção</p>
              </div>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.code || !formData.name || createDocumentType.isPending || updateDocumentType.isPending}
            >
              {editingId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
