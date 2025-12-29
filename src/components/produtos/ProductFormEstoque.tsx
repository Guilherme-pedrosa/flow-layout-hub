import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductFormEstoqueProps {
  formData: {
    min_stock: number;
    max_stock: number;
    quantity: number;
    unit: string;
  };
  onChange: (field: string, value: any) => void;
}

const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <div className="flex items-center gap-1">
    <Label className="text-sm">{label}</Label>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

export function ProductFormEstoque({ formData, onChange }: ProductFormEstoqueProps) {
  return (
    <div className="space-y-6">
      {/* Unidade de medida */}
      <div className="space-y-2">
        <Label>Unidade de medida</Label>
        <Input
          value={formData.unit}
          onChange={(e) => onChange('unit', e.target.value.toUpperCase())}
          placeholder="UN"
          className="w-32"
        />
      </div>

      {/* Estoque principal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Matriz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <LabelWithTooltip 
                label="Estoque mínimo" 
                tooltip="Quantidade mínima que deve ser mantida em estoque. O sistema alertará quando atingir este nível." 
              />
              <Input
                type="number"
                value={formData.min_stock}
                onChange={(e) => onChange('min_stock', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <LabelWithTooltip 
                label="Estoque máximo" 
                tooltip="Quantidade máxima recomendada em estoque para evitar excesso de capital parado." 
              />
              <Input
                type="number"
                value={formData.max_stock}
                onChange={(e) => onChange('max_stock', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <LabelWithTooltip 
                label="Quantidade atual" 
                tooltip="Quantidade atual em estoque. Atualizada automaticamente pelas movimentações." 
              />
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => onChange('quantity', parseFloat(e.target.value) || 0)}
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicador visual de estoque */}
      {formData.min_stock > 0 && (
        <div className="p-4 rounded-lg border">
          <div className="text-sm font-medium mb-2">Status do estoque</div>
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                formData.quantity <= 0 
                  ? 'bg-destructive' 
                  : formData.quantity <= formData.min_stock 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
              }`}
            />
            <span className="text-sm">
              {formData.quantity <= 0 
                ? 'Sem estoque' 
                : formData.quantity <= formData.min_stock 
                  ? 'Estoque baixo - considere reabastecer' 
                  : 'Estoque adequado'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
