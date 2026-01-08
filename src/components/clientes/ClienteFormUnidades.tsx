import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Building2, FileText, Users } from "lucide-react";
import { useClientUnits, useUnitPolicyRequirements, ClientUnit } from "@/hooks/useClientUnits";
import { useDocumentTypes } from "@/hooks/useDocumentTypes";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

interface Props {
  clienteId: string;
}

export function ClienteFormUnidades({ clienteId }: Props) {
  const { units, isLoading, createUnit, updateUnit, deleteUnit } = useClientUnits(clienteId);
  const { companyTypes, technicianTypes } = useDocumentTypes();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ClientUnit | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null);
  const [requirementsDialogOpen, setRequirementsDialogOpen] = useState(false);
  const [selectedUnitForReqs, setSelectedUnitForReqs] = useState<string | null>(null);

  const [form, setForm] = useState({
    unit_name: '',
    address: '',
    integration_validity_days: 365,
    requires_local_integration: false,
    access_email_to: '',
    access_email_cc: '',
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      unit_name: '',
      address: '',
      integration_validity_days: 365,
      requires_local_integration: false,
      access_email_to: '',
      access_email_cc: '',
      is_active: true,
    });
    setEditingUnit(null);
  };

  const handleOpenDialog = (unit?: ClientUnit) => {
    if (unit) {
      setEditingUnit(unit);
      setForm({
        unit_name: unit.unit_name,
        address: unit.address || '',
        integration_validity_days: unit.integration_validity_days || 365,
        requires_local_integration: unit.requires_local_integration,
        access_email_to: unit.access_email_to.join(', '),
        access_email_cc: unit.access_email_cc.join(', '),
        is_active: unit.is_active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      client_id: clienteId,
      unit_name: form.unit_name,
      address: form.address || null,
      integration_validity_days: form.integration_validity_days,
      requires_local_integration: form.requires_local_integration,
      access_email_to: form.access_email_to.split(',').map(e => e.trim()).filter(Boolean),
      access_email_cc: form.access_email_cc.split(',').map(e => e.trim()).filter(Boolean),
      is_active: form.is_active,
    };

    if (editingUnit) {
      await updateUnit.mutateAsync({ id: editingUnit.id, data: payload });
    } else {
      await createUnit.mutateAsync(payload);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (unitToDelete) {
      await deleteUnit.mutateAsync(unitToDelete);
      setDeleteDialogOpen(false);
      setUnitToDelete(null);
    }
  };

  const openRequirementsDialog = (unitId: string) => {
    setSelectedUnitForReqs(unitId);
    setRequirementsDialogOpen(true);
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando unidades...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Unidades do Cliente
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" /> Nova Unidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingUnit ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome da Unidade *</Label>
                <Input
                  value={form.unit_name}
                  onChange={e => setForm({ ...form, unit_name: e.target.value })}
                  placeholder="Ex: Brainfarma - Anápolis"
                />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Validade da Integração (dias)</Label>
                  <Input
                    type="number"
                    value={form.integration_validity_days}
                    onChange={e => setForm({ ...form, integration_validity_days: parseInt(e.target.value) || 365 })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={form.requires_local_integration}
                    onCheckedChange={checked => setForm({ ...form, requires_local_integration: checked })}
                  />
                  <Label>Exige Integração Local</Label>
                </div>
              </div>
              <div>
                <Label>E-mails para Envio (separados por vírgula)</Label>
                <Input
                  value={form.access_email_to}
                  onChange={e => setForm({ ...form, access_email_to: e.target.value })}
                  placeholder="portaria@cliente.com, sst@cliente.com"
                />
              </div>
              <div>
                <Label>E-mails CC (separados por vírgula)</Label>
                <Input
                  value={form.access_email_cc}
                  onChange={e => setForm({ ...form, access_email_cc: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={checked => setForm({ ...form, is_active: checked })}
                />
                <Label>Unidade Ativa</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!form.unit_name}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {units.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma unidade cadastrada.</p>
      ) : (
        <div className="grid gap-3">
          {units.map(unit => (
            <Card key={unit.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{unit.unit_name}</span>
                    {!unit.is_active && <Badge variant="secondary">Inativa</Badge>}
                    {unit.requires_local_integration && (
                      <Badge variant="outline">Integração Local</Badge>
                    )}
                  </div>
                  {unit.address && (
                    <p className="text-sm text-muted-foreground">{unit.address}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Validade: {unit.integration_validity_days} dias | 
                    E-mails: {unit.access_email_to.length || 0}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openRequirementsDialog(unit.id)}
                    title="Requisitos Documentais"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(unit)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setUnitToDelete(unit.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async () => { await handleDelete(); return true; }}
        title="Excluir Unidade"
        description="Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita."
      />

      {selectedUnitForReqs && (
        <UnitRequirementsDialog
          unitId={selectedUnitForReqs}
          open={requirementsDialogOpen}
          onOpenChange={setRequirementsDialogOpen}
          companyTypes={companyTypes}
          technicianTypes={technicianTypes}
        />
      )}
    </div>
  );
}

// Sub-component for requirements dialog
function UnitRequirementsDialog({
  unitId,
  open,
  onOpenChange,
  companyTypes,
  technicianTypes,
}: {
  unitId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyTypes: any[];
  technicianTypes: any[];
}) {
  const { requirements, syncRequirements } = useUnitPolicyRequirements(unitId);
  
  const [selectedCompanyDocs, setSelectedCompanyDocs] = useState<string[]>([]);
  const [selectedTechDocs, setSelectedTechDocs] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize selections from existing requirements
  if (open && !initialized && requirements.length > 0) {
    setSelectedCompanyDocs(
      requirements.filter(r => r.required_for === 'COMPANY').map(r => r.document_type_id)
    );
    setSelectedTechDocs(
      requirements.filter(r => r.required_for === 'TECHNICIAN').map(r => r.document_type_id)
    );
    setInitialized(true);
  }

  // Reset when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInitialized(false);
      setSelectedCompanyDocs([]);
      setSelectedTechDocs([]);
    }
    onOpenChange(newOpen);
  };

  const toggleCompanyDoc = (id: string) => {
    setSelectedCompanyDocs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTechDoc = (id: string) => {
    setSelectedTechDocs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    await syncRequirements.mutateAsync({
      unitId,
      companyDocTypeIds: selectedCompanyDocs,
      technicianDocTypeIds: selectedTechDocs,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Requisitos Documentais da Unidade</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4 mr-1" />
              Empresa ({selectedCompanyDocs.length})
            </TabsTrigger>
            <TabsTrigger value="technician">
              <Users className="h-4 w-4 mr-1" />
              Técnico ({selectedTechDocs.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="company">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {companyTypes.map(dt => (
                  <div
                    key={dt.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleCompanyDoc(dt.id)}
                  >
                    <Checkbox checked={selectedCompanyDocs.includes(dt.id)} />
                    <div>
                      <p className="font-medium">{dt.name}</p>
                      <p className="text-xs text-muted-foreground">{dt.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="technician">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {technicianTypes.map(dt => (
                  <div
                    key={dt.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleTechDoc(dt.id)}
                  >
                    <Checkbox checked={selectedTechDocs.includes(dt.id)} />
                    <div>
                      <p className="font-medium">{dt.name}</p>
                      <p className="text-xs text-muted-foreground">{dt.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={syncRequirements.isPending}>
            Salvar Requisitos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
