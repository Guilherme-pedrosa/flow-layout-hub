import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, QrCode, MapPin, Wrench, Calendar, Building2 } from "lucide-react";
import { Equipment } from "@/hooks/useEquipments";
import { supabase } from "@/integrations/supabase/client";

interface EquipmentFormData {
  serial_number: string;
  brand: string;
  model: string;
  equipment_type: string;
  client_id: string;
  sector: string;
  environment: string;
  location_description: string;
  qr_code: string;
  warranty_start: string;
  warranty_end: string;
  notes: string;
}

interface EquipmentType {
  id: string;
  name: string;
}

interface EquipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  clientes: Array<{ id: string; razao_social?: string; nome_fantasia?: string }>;
  companyId: string | undefined;
  onSave: (data: EquipmentFormData) => Promise<void>;
  isSaving: boolean;
}

const initialFormData: EquipmentFormData = {
  serial_number: "",
  brand: "",
  model: "",
  equipment_type: "",
  client_id: "",
  sector: "",
  environment: "",
  location_description: "",
  qr_code: "",
  warranty_start: "",
  warranty_end: "",
  notes: "",
};

export function EquipmentForm({
  open,
  onOpenChange,
  equipment,
  clientes,
  companyId,
  onSave,
  isSaving,
}: EquipmentFormProps) {
  const [formData, setFormData] = useState<EquipmentFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("dados");
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [customType, setCustomType] = useState("");

  // Buscar tipos do Field Control
  useEffect(() => {
    const fetchTypes = async () => {
      if (!companyId || !open) return;
      
      setLoadingTypes(true);
      try {
        const { data, error } = await supabase.functions.invoke('field-equipment-types', {
          body: { company_id: companyId }
        });
        
        if (data?.types && Array.isArray(data.types)) {
          setEquipmentTypes(data.types);
        }
      } catch (err) {
        console.error("Erro ao buscar tipos:", err);
      } finally {
        setLoadingTypes(false);
      }
    };
    
    fetchTypes();
  }, [companyId, open]);

  useEffect(() => {
    if (equipment) {
      setFormData({
        serial_number: equipment.serial_number || "",
        brand: equipment.brand || "",
        model: equipment.model || "",
        equipment_type: equipment.equipment_type || "",
        client_id: equipment.client_id || "",
        sector: equipment.sector || "",
        environment: equipment.environment || "",
        location_description: equipment.location_description || "",
        qr_code: equipment.qr_code || "",
        warranty_start: equipment.warranty_start || "",
        warranty_end: equipment.warranty_end || "",
        notes: equipment.notes || "",
      });
      setCustomType("");
    } else {
      setFormData(initialFormData);
      setCustomType("");
    }
    setActiveTab("dados");
  }, [equipment, open]);

  const handleSubmit = async () => {
    if (!formData.serial_number.trim()) {
      return;
    }
    
    // Apply custom type if selected "outro"
    const finalData = {
      ...formData,
      equipment_type: formData.equipment_type === "__custom__" ? customType : formData.equipment_type,
    };
    
    await onSave(finalData);
  };

  const isEditing = !!equipment;
  
  // Verifica se o tipo atual está na lista ou é customizado
  const isTypeInList = equipmentTypes.some(t => t.name === formData.equipment_type);
  const showCustomInput = formData.equipment_type === "__custom__" || 
    (formData.equipment_type && !isTypeInList && equipmentTypes.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {isEditing ? "Editar Equipamento" : "Novo Equipamento"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do equipamento. Campos com * são obrigatórios.
            {isEditing && equipment?.field_equipment_id && (
              <Badge variant="secondary" className="ml-2">
                Sincronizado com Field Control
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados" className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="cliente" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Cliente
            </TabsTrigger>
            <TabsTrigger value="localizacao" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Local
            </TabsTrigger>
            <TabsTrigger value="garantia" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Garantia
            </TabsTrigger>
          </TabsList>

          {/* Aba Dados Básicos */}
          <TabsContent value="dados" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Identificação do Equipamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="serial_number">
                    Número de Série / Identificação *
                  </Label>
                  <Input
                    id="serial_number"
                    placeholder="Ex: SN123456789"
                    value={formData.serial_number}
                    onChange={(e) =>
                      setFormData({ ...formData, serial_number: e.target.value })
                    }
                    className={!formData.serial_number.trim() ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Identificador único do equipamento (número de série, patrimônio, etc.)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      placeholder="Ex: Tramontina, Rational, Electrolux"
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input
                      id="model"
                      placeholder="Ex: Forno Combinado 10 GN"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="equipment_type">Tipo de Equipamento</Label>
                  {loadingTypes ? (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Carregando tipos...</span>
                    </div>
                  ) : equipmentTypes.length > 0 ? (
                    <>
                      <Select
                        value={isTypeInList ? formData.equipment_type : (formData.equipment_type ? "__custom__" : "")}
                        onValueChange={(value) => {
                          if (value === "__custom__") {
                            setFormData({ ...formData, equipment_type: "__custom__" });
                            setCustomType(formData.equipment_type !== "__custom__" ? formData.equipment_type : "");
                          } else {
                            setFormData({ ...formData, equipment_type: value });
                            setCustomType("");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {equipmentTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__">Outro...</SelectItem>
                        </SelectContent>
                      </Select>
                      {showCustomInput && (
                        <Input
                          placeholder="Digite o tipo"
                          value={customType || (formData.equipment_type !== "__custom__" ? formData.equipment_type : "")}
                          onChange={(e) => setCustomType(e.target.value)}
                        />
                      )}
                    </>
                  ) : (
                    <Input
                      id="equipment_type"
                      placeholder="Ex: Fogão Industrial, Forno Combinado"
                      value={formData.equipment_type}
                      onChange={(e) =>
                        setFormData({ ...formData, equipment_type: e.target.value })
                      }
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {equipmentTypes.length > 0 
                      ? "Tipos carregados do Field Control" 
                      : "Configure a API do Field Control para carregar os tipos"}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="qr_code" className="flex items-center gap-1">
                    <QrCode className="h-3 w-3" />
                    Código QR / Etiqueta
                  </Label>
                  <Input
                    id="qr_code"
                    placeholder="Código da etiqueta QR"
                    value={formData.qr_code}
                    onChange={(e) =>
                      setFormData({ ...formData, qr_code: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Código para leitura via QR Code no Field Control
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Cliente */}
          <TabsContent value="cliente" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Vinculação com Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="client_id">Cliente</Label>
                  <Select
                    value={formData.client_id || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        client_id: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem cliente vinculado</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.razao_social || c.nome_fantasia || "Cliente sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {clientes.length > 0 
                      ? `${clientes.length} clientes sincronizados com Field Control`
                      : "Sincronize clientes com o Field Control primeiro"}
                  </p>
                </div>

                {formData.client_id && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      ✓ O equipamento será vinculado ao cliente no Field Control
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Localização */}
          <TabsContent value="localizacao" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Localização do Equipamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sector">Setor</Label>
                    <Input
                      id="sector"
                      placeholder="Ex: Cozinha, Produção"
                      value={formData.sector}
                      onChange={(e) =>
                        setFormData({ ...formData, sector: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Setor ou departamento
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="environment">Ambiente</Label>
                    <Input
                      id="environment"
                      placeholder="Ex: Preparo, Cocção"
                      value={formData.environment}
                      onChange={(e) =>
                        setFormData({ ...formData, environment: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Ambiente específico
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location_description">Descrição da Localização</Label>
                  <Textarea
                    id="location_description"
                    placeholder="Ex: Próximo à área de lavagem, lado esquerdo"
                    value={formData.location_description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location_description: e.target.value,
                      })
                    }
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Detalhes para facilitar a localização pelo técnico
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Garantia */}
          <TabsContent value="garantia" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Informações de Garantia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="warranty_start">Início da Garantia</Label>
                    <Input
                      id="warranty_start"
                      type="date"
                      value={formData.warranty_start}
                      onChange={(e) =>
                        setFormData({ ...formData, warranty_start: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="warranty_end">Fim da Garantia</Label>
                    <Input
                      id="warranty_end"
                      type="date"
                      value={formData.warranty_end}
                      onChange={(e) =>
                        setFormData({ ...formData, warranty_end: e.target.value })
                      }
                    />
                  </div>
                </div>

                {formData.warranty_end && (
                  <div className={`p-3 rounded-lg ${
                    new Date(formData.warranty_end) > new Date() 
                      ? "bg-green-500/10 text-green-700" 
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    <p className="text-sm">
                      {new Date(formData.warranty_end) > new Date()
                        ? "✓ Equipamento dentro da garantia"
                        : "⚠ Garantia expirada"}
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Informações adicionais sobre o equipamento..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !formData.serial_number.trim()}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Atualizar" : "Cadastrar"} Equipamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
