import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Plus, Trash2, Building2, Users, FileCheck, AlertCircle, GripVertical
} from "lucide-react";
import { usePessoas } from "@/hooks/usePessoas";
import { useClientDocumentRequirements, RequiredFor } from "@/hooks/useClientDocumentRequirements";
import { useDocumentTypes } from "@/hooks/useDocumentTypes";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { toast } from "sonner";

export default function GerenciarRequisitos() {
  const { clientes } = usePessoas();
  const { documentTypes } = useDocumentTypes();
  
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addScope, setAddScope] = useState<RequiredFor>('COMPANY');
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>('');
  const [isRequired, setIsRequired] = useState(true);

  const activeClients = clientes.filter(c => c.status === 'ativo');
  
  const {
    companyRequirements,
    technicianRequirements,
    availableCompanyTypes,
    availableTechnicianTypes,
    isLoading,
    addRequirement,
    removeRequirement,
    toggleRequired,
    refetch,
  } = useClientDocumentRequirements(selectedClientId || undefined);

  const clientOptions = activeClients.map(c => ({
    value: c.id,
    label: c.nome_fantasia || c.razao_social || '',
    sublabel: c.cpf_cnpj || undefined,
  }));

  const handleOpenAddDialog = (scope: RequiredFor) => {
    setAddScope(scope);
    setSelectedDocTypeId('');
    setIsRequired(true);
    setAddDialogOpen(true);
  };

  const handleAddRequirement = async () => {
    if (!selectedDocTypeId) {
      toast.error('Selecione um tipo de documento');
      return;
    }

    try {
      await addRequirement.mutateAsync({
        documentTypeId: selectedDocTypeId,
        requiredFor: addScope,
      });
      setAddDialogOpen(false);
      toast.success('Requisito adicionado');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remover este requisito?')) return;
    try {
      await removeRequirement.mutateAsync(id);
      toast.success('Requisito removido');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const handleToggleRequired = async (id: string, currentValue: boolean) => {
    try {
      await toggleRequired.mutateAsync({ id, isRequired: !currentValue });
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const availableTypes = addScope === 'COMPANY' ? availableCompanyTypes : availableTechnicianTypes;

  const selectedClient = activeClients.find(c => c.id === selectedClientId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gerenciar Requisitos por Cliente"
        description="Configure quais documentos são exigidos por cada cliente"
        breadcrumbs={[
          { label: "RH" },
          { label: "Integrações", href: "/rh/integracoes" },
          { label: "Requisitos" },
        ]}
      />

      {/* Seleção de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione o Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <SearchableSelect
              options={clientOptions}
              value={selectedClientId}
              onChange={setSelectedClientId}
              placeholder="Digite para buscar cliente..."
              searchPlaceholder="Buscar por nome ou CNPJ..."
              emptyMessage="Nenhum cliente encontrado"
            />
          </div>
        </CardContent>
      </Card>

      {/* Requisitos do Cliente Selecionado */}
      {selectedClientId && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Requisitos de: {selectedClient?.nome_fantasia || selectedClient?.razao_social}
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Documentos da Empresa */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Documentos da Empresa
                </CardTitle>
                <Button size="sm" onClick={() => handleOpenAddDialog('COMPANY')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-4">Carregando...</p>
                ) : companyRequirements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum requisito cadastrado</p>
                    <p className="text-sm">Clique em "Adicionar" para configurar</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-center w-24">Obrigatório</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyRequirements.map(req => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{req.document_type?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {req.document_type?.requires_expiry ? 'Com vencimento' : 'Sem vencimento'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={req.is_required}
                              onCheckedChange={() => handleToggleRequired(req.id, req.is_required)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(req.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Documentos do Técnico */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Documentos do Técnico
                </CardTitle>
                <Button size="sm" onClick={() => handleOpenAddDialog('TECHNICIAN')}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-4">Carregando...</p>
                ) : technicianRequirements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum requisito cadastrado</p>
                    <p className="text-sm">Clique em "Adicionar" para configurar</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead className="text-center w-24">Obrigatório</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {technicianRequirements.map(req => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{req.document_type?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {req.document_type?.requires_expiry ? 'Com vencimento' : 'Sem vencimento'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={req.is_required}
                              onCheckedChange={() => handleToggleRequired(req.id, req.is_required)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(req.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{companyRequirements.length} documento(s) da empresa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{technicianRequirements.length} documento(s) do técnico</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {companyRequirements.filter(r => r.is_required).length + technicianRequirements.filter(r => r.is_required).length} obrigatório(s)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Adicionar Requisito */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Adicionar Requisito - {addScope === 'COMPANY' ? 'Empresa' : 'Técnico'}
            </DialogTitle>
            <DialogDescription>
              Selecione o tipo de documento que será exigido
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Tipo de Documento</Label>
              <Select value={selectedDocTypeId} onValueChange={setSelectedDocTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map(dt => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.name}
                      {dt.requires_expiry && <span className="text-muted-foreground ml-2">(com vencimento)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableTypes.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Todos os tipos disponíveis já foram adicionados ou não há tipos cadastrados para este escopo.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Obrigatório para validação</Label>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddRequirement}
              disabled={!selectedDocTypeId || addRequirement.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
