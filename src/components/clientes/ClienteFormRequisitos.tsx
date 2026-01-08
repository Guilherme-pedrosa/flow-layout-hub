import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Building2, User, FileCheck, Loader2 } from "lucide-react";
import { useClientDocumentRequirements } from "@/hooks/useClientDocumentRequirements";

interface ClienteFormRequisitosProps {
  clienteId: string;
}

export function ClienteFormRequisitos({ clienteId }: ClienteFormRequisitosProps) {
  const {
    companyRequirements,
    technicianRequirements,
    availableCompanyTypes,
    availableTechnicianTypes,
    isLoading,
    addRequirement,
    removeRequirement,
    toggleRequired,
  } = useClientDocumentRequirements(clienteId);

  const [selectedCompanyType, setSelectedCompanyType] = useState<string>('');
  const [selectedTechnicianType, setSelectedTechnicianType] = useState<string>('');

  const handleAddCompanyReq = () => {
    if (!selectedCompanyType) return;
    addRequirement.mutate({ documentTypeId: selectedCompanyType, requiredFor: 'COMPANY' });
    setSelectedCompanyType('');
  };

  const handleAddTechnicianReq = () => {
    if (!selectedTechnicianType) return;
    addRequirement.mutate({ documentTypeId: selectedTechnicianType, requiredFor: 'TECHNICIAN' });
    setSelectedTechnicianType('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FileCheck className="h-5 w-5" />
        <p className="text-sm">
          Defina quais documentos são exigidos por este cliente para liberação de integração.
        </p>
      </div>

      {/* Documentos da Empresa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Documentos Exigidos da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de requisitos */}
          {companyRequirements.length > 0 ? (
            <div className="space-y-2">
              {companyRequirements.map(req => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{req.document_type?.code}</Badge>
                    <span className="text-sm font-medium">{req.document_type?.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={req.is_required}
                        onCheckedChange={(checked) => toggleRequired.mutate({ id: req.id, isRequired: checked })}
                      />
                      <Label className="text-xs text-muted-foreground">Obrigatório</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequirement.mutate(req.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum documento da empresa exigido.
            </p>
          )}

          {/* Adicionar novo */}
          {availableCompanyTypes.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedCompanyType} onValueChange={setSelectedCompanyType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um tipo de documento..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanyTypes.map(dt => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.code} - {dt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddCompanyReq} disabled={!selectedCompanyType || addRequirement.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentos do Técnico */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Documentos Exigidos do Técnico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de requisitos */}
          {technicianRequirements.length > 0 ? (
            <div className="space-y-2">
              {technicianRequirements.map(req => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{req.document_type?.code}</Badge>
                    <span className="text-sm font-medium">{req.document_type?.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={req.is_required}
                        onCheckedChange={(checked) => toggleRequired.mutate({ id: req.id, isRequired: checked })}
                      />
                      <Label className="text-xs text-muted-foreground">Obrigatório</Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequirement.mutate(req.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum documento do técnico exigido.
            </p>
          )}

          {/* Adicionar novo */}
          {availableTechnicianTypes.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedTechnicianType} onValueChange={setSelectedTechnicianType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um tipo de documento..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTechnicianTypes.map(dt => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.code} - {dt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddTechnicianReq} disabled={!selectedTechnicianType || addRequirement.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
