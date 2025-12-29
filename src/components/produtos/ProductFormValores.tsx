import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect } from "react";

interface ProductFormValoresProps {
  formData: {
    purchase_price: number;
    accessory_expenses: number;
    other_expenses: number;
    final_cost: number;
    sale_price: number;
  };
  onChange: (field: string, value: any) => void;
  isFromXml?: boolean;
}

const LabelWithTooltip = ({ label, tooltip, required }: { label: string; tooltip: string; required?: boolean }) => (
  <div className="flex items-center gap-1">
    <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
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

export function ProductFormValores({ formData, onChange, isFromXml }: ProductFormValoresProps) {
  // Calcular custo final automaticamente
  useEffect(() => {
    const finalCost = (formData.purchase_price || 0) + 
                      (formData.accessory_expenses || 0) + 
                      (formData.other_expenses || 0);
    onChange('final_cost', finalCost);
  }, [formData.purchase_price, formData.accessory_expenses, formData.other_expenses]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  return (
    <div className="space-y-6">
      {/* Valores de custo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            💰 Valores de custo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFromXml && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                Este produto foi cadastrado via XML. O custo de aquisição inclui impostos e frete proporcionais do documento fiscal.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <LabelWithTooltip 
              label="Valor de custo" 
              tooltip="Custo de aquisição do produto (valor unitário do fornecedor)" 
              required
            />
            <Input
              type="number"
              step="0.0001"
              value={formData.purchase_price}
              onChange={(e) => onChange('purchase_price', parseFloat(e.target.value) || 0)}
              className="text-right"
              placeholder="0,0000"
            />
          </div>

          <div className="space-y-2">
            <LabelWithTooltip 
              label="Despesas acessórias" 
              tooltip="Custos adicionais como frete, seguro, embalagem (proporcional por item quando via XML)" 
            />
            <Input
              type="number"
              step="0.0001"
              value={formData.accessory_expenses}
              onChange={(e) => onChange('accessory_expenses', parseFloat(e.target.value) || 0)}
              className="text-right"
              placeholder="0,0000"
            />
          </div>

          <div className="space-y-2">
            <LabelWithTooltip 
              label="Outras despesas" 
              tooltip="Impostos e outros custos relacionados à aquisição (proporcional por item quando via XML)" 
            />
            <Input
              type="number"
              step="0.0001"
              value={formData.other_expenses}
              onChange={(e) => onChange('other_expenses', parseFloat(e.target.value) || 0)}
              className="text-right"
              placeholder="0,0000"
            />
          </div>

          <div className="space-y-2">
            <LabelWithTooltip 
              label="Custo final" 
              tooltip="Soma do valor de custo + despesas acessórias + outras despesas" 
              required
            />
            <Input
              type="number"
              value={formData.final_cost}
              className="text-right bg-muted"
              disabled
              placeholder="0,0000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Valores de venda */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            🏷️ Valores de venda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-muted/50">
            <AlertDescription>
              O valor de venda é a valoração monetária dos produtos comercializados pelo estabelecimento.
              Ele pode ser calculado ou indicado livremente.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <LabelWithTooltip 
              label="Preço de venda" 
              tooltip="Valor pelo qual o produto será vendido aos clientes" 
            />
            <Input
              type="number"
              step="0.01"
              value={formData.sale_price}
              onChange={(e) => onChange('sale_price', parseFloat(e.target.value) || 0)}
              className="text-right"
              placeholder="0,00"
            />
          </div>

          {formData.final_cost > 0 && formData.sale_price > 0 && (
            <div className="text-sm text-muted-foreground">
              Margem de lucro: {' '}
              <span className={formData.sale_price > formData.final_cost ? 'text-green-600' : 'text-destructive'}>
                {((formData.sale_price - formData.final_cost) / formData.final_cost * 100).toFixed(2)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
