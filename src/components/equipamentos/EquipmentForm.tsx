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

interface EquipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  clientes: Array<{ id: string; razao_social?: string; nome_fantasia?: string }>;
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

// Tipos de equipamento comuns
const EQUIPMENT_TYPES = [
  "Ar Condicionado",
  "Split",
  "Multi Split",
  "VRF/VRV",
  "Chiller",
  "Fancoil",
  "Self Contained",
  "Rooftop",
  "Condensadora",
  "Evaporadora",
  "Câmara Fria",
  "Balcão Refrigerado",
  "Geladeira Industrial",
  "Freezer",
  "Expositor",
  "Máquina de Gelo",
  "Bomba de Calor",
  "Aquecedor",
  "Ventilador",
  "Exaustor",
  "Outro",
];

// Marcas comuns
const COMMON_BRANDS = [
  "Carrier",
  "Springer",
  "Midea",
  "LG",
  "Samsung",
  "Daikin",
  "Trane",
  "Hitachi",
  "Elgin",
  "Gree",
  "Fujitsu",
  "York",
  "Komeco",
  "Philco",
  "Consul",
  "Electrolux",
  "Brastemp",
  "Hussmann",
  "Metalfrio",
  "Outro",
];

export function EquipmentForm({
  open,
  onOpenChange,
  equipment,
  clientes,
  onSave,
  isSaving,
}: EquipmentFormProps) {
  const [formData, setFormData] = useState<EquipmentFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("dados");
  const [customBrand, setCustomBrand] = useState("");
  const [customType, setCustomType] = useState("");

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
      // Check if brand/type are custom
      if (equipment.brand && !COMMON_BRANDS.includes(equipment.brand)) {
        setCustomBrand(equipment.brand);
      }
      if (equipment.equipment_type && !EQUIPMENT_TYPES.includes(equipment.equipment_type)) {
        setCustomType(equipment.equipment_type);
      }
    } else {
      setFormData(initialFormData);
      setCustomBrand("");
      setCustomType("");
    }
    setActiveTab("dados");
  }, [equipment, open]);

  const handleSubmit = async () => {
    if (!formData.serial_number.trim()) {
      return;
    }
    
    // Apply custom values if "Outro" is selected
    const finalData = {
      ...formData,
      brand: formData.brand === "Outro" ? customBrand : formData.brand,
      equipment_type: formData.equipment_type === "Outro" ? customType : formData.equipment_type,
    };
    
    await onSave(finalData);
  };

  const isEditing = !!equipment;

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
                    <Select
                      value={COMMON_BRANDS.includes(formData.brand) ? formData.brand : (formData.brand ? "Outro" : "")}
                      onValueChange={(value) => {
                        if (value === "Outro") {
                          setFormData({ ...formData, brand: "Outro" });
                        } else {
                          setFormData({ ...formData, brand: value });
                          setCustomBrand("");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_BRANDS.map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(formData.brand === "Outro" || (formData.brand && !COMMON_BRANDS.includes(formData.brand))) && (
                      <Input
                        placeholder="Digite a marca"
                        value={customBrand || (formData.brand !== "Outro" ? formData.brand : "")}
                        onChange={(e) => setCustomBrand(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input
                      id="model"
                      placeholder="Ex: Split Inverter 12000 BTU"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="equipment_type">Tipo de Equipamento</Label>
                  <Select
                    value={EQUIPMENT_TYPES.includes(formData.equipment_type) ? formData.equipment_type : (formData.equipment_type ? "Outro" : "")}
                    onValueChange={(value) => {
                      if (value === "Outro") {
                        setFormData({ ...formData, equipment_type: "Outro" });
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
                      {EQUIPMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(formData.equipment_type === "Outro" || (formData.equipment_type && !EQUIPMENT_TYPES.includes(formData.equipment_type))) && (
                    <Input
                      placeholder="Digite o tipo"
                      value={customType || (formData.equipment_type !== "Outro" ? formData.equipment_type : "")}
                      onChange={(e) => setCustomType(e.target.value)}
                    />
                  )}
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
                    Vincule o equipamento a um cliente para facilitar ordens de serviço
                  </p>
                </div>

                {formData.client_id && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      ✓ O equipamento será sincronizado com o cliente no Field Control
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
                      placeholder="Ex: Produção, Administrativo"
                      value={formData.sector}
                      onChange={(e) =>
                        setFormData({ ...formData, sector: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Setor ou departamento onde está instalado
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="environment">Ambiente</Label>
                    <Input
                      id="environment"
                      placeholder="Ex: Sala de Reunião, CPD"
                      value={formData.environment}
                      onChange={(e) =>
                        setFormData({ ...formData, environment: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Ambiente específico de instalação
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location_description">Descrição da Localização</Label>
                  <Textarea
                    id="location_description"
                    placeholder="Ex: 2º andar, próximo à escada, lado esquerdo"
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
                    Detalhes para facilitar a localização do equipamento pelo técnico
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
