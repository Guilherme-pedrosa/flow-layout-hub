import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExtraField {
  name: string;
  value: string;
}

interface ProductFormDetalhesProps {
  formData: {
    weight: number;
    width: number;
    height: number;
    length: number;
    description_long: string;
    is_active: boolean;
    is_sold_separately: boolean;
    is_pdv_available: boolean;
    extra_fields: ExtraField[];
  };
  onChange: (field: string, value: any) => void;
}

const LabelWithUnit = ({ label, unit }: { label: string; unit: string }) => (
  <Label className="text-sm">
    {label} <span className="text-muted-foreground text-xs">({unit})</span>
  </Label>
);

export function ProductFormDetalhes({ formData, onChange }: ProductFormDetalhesProps) {
  const addExtraField = () => {
    onChange('extra_fields', [...formData.extra_fields, { name: '', value: '' }]);
  };

  const updateExtraField = (index: number, field: 'name' | 'value', value: string) => {
    const updated = [...formData.extra_fields];
    updated[index] = { ...updated[index], [field]: value };
    onChange('extra_fields', updated);
  };

  const removeExtraField = (index: number) => {
    onChange('extra_fields', formData.extra_fields.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Pesos e dimensões */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            ✚ Pesos e dimensões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <LabelWithUnit label="Peso" unit="kg" />
            <Input
              type="number"
              step="0.001"
              value={formData.weight}
              onChange={(e) => onChange('weight', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <LabelWithUnit label="Largura" unit="m" />
            <Input
              type="number"
              step="0.001"
              value={formData.width}
              onChange={(e) => onChange('width', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <LabelWithUnit label="Altura" unit="m" />
            <Input
              type="number"
              step="0.001"
              value={formData.height}
              onChange={(e) => onChange('height', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <LabelWithUnit label="Comprimento" unit="m" />
            <Input
              type="number"
              step="0.001"
              value={formData.length}
              onChange={(e) => onChange('length', parseFloat(e.target.value) || 0)}
              className="text-right"
            />
          </div>
        </CardContent>
      </Card>

      {/* Campos extras e descrição */}
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📋 Campos extras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-muted/50">
              <AlertDescription>
                Você pode definir alguns campos extras para este produto, como por exemplo uma marca, modelo e etc... Ex. Marca =&gt; Adidas.
              </AlertDescription>
            </Alert>

            {formData.extra_fields.map((field, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={field.name}
                  onChange={(e) => updateExtraField(index, 'name', e.target.value)}
                  placeholder="Nome do campo"
                  className="flex-1"
                />
                <span className="text-muted-foreground">=&gt;</span>
                <Input
                  value={field.value}
                  onChange={(e) => updateExtraField(index, 'value', e.target.value)}
                  placeholder="Valor"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExtraField(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addExtraField}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar campo extra
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📝 Descrição do produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.description_long}
              onChange={(e) => onChange('description_long', e.target.value)}
              placeholder="Descrição detalhada do produto..."
              rows={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📦 Detalhes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => onChange('is_active', checked)}
              />
              <label htmlFor="is_active" className="text-sm cursor-pointer">
                Produto ativo
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_sold_separately"
                checked={formData.is_sold_separately}
                onCheckedChange={(checked) => onChange('is_sold_separately', checked)}
              />
              <label htmlFor="is_sold_separately" className="text-sm cursor-pointer">
                Vendido separadamente
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_pdv_available"
                checked={formData.is_pdv_available}
                onCheckedChange={(checked) => onChange('is_pdv_available', checked)}
              />
              <label htmlFor="is_pdv_available" className="text-sm cursor-pointer">
                Comercializável no PDV
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
