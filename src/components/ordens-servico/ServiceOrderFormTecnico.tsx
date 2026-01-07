import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ServiceOrderFormTecnicoProps {
  formData: {
    diagnosis: string;
    solution: string;
    started_at: string;
    finished_at: string;
    warranty_until: string;
    labor_cost: string;
    parts_cost: string;
    external_service_cost: string;
  };
  onChange: (field: string, value: string) => void;
  calculatedPartsCost: number;
  calculatedLaborCost: number;
}

export function ServiceOrderFormTecnico({ 
  formData, 
  onChange, 
  calculatedPartsCost, 
  calculatedLaborCost 
}: ServiceOrderFormTecnicoProps) {
  const laborCost = parseFloat(formData.labor_cost) || calculatedLaborCost;
  const partsCost = parseFloat(formData.parts_cost) || calculatedPartsCost;
  const externalCost = parseFloat(formData.external_service_cost) || 0;
  const totalCost = laborCost + partsCost + externalCost;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Textarea 
                value={formData.diagnosis} 
                onChange={(e) => onChange('diagnosis', e.target.value)} 
                rows={3}
                placeholder="Descreva o diagnóstico técnico..." 
              />
            </div>
            <div className="space-y-2">
              <Label>Solução aplicada</Label>
              <Textarea 
                value={formData.solution} 
                onChange={(e) => onChange('solution', e.target.value)} 
                rows={3}
                placeholder="Descreva a solução aplicada..." 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Início do atendimento</Label>
                <Input 
                  type="datetime-local" 
                  value={formData.started_at} 
                  onChange={(e) => onChange('started_at', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Fim do atendimento</Label>
                <Input 
                  type="datetime-local" 
                  value={formData.finished_at} 
                  onChange={(e) => onChange('finished_at', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Garantia até</Label>
                <Input 
                  type="date" 
                  value={formData.warranty_until} 
                  onChange={(e) => onChange('warranty_until', e.target.value)} 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Custos (Para análise de margem)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Estes valores são usados para calcular a margem de lucro da OS. 
            Os custos de peças e mão de obra são calculados automaticamente a partir dos itens, 
            mas podem ser ajustados manualmente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Custo de Mão de Obra</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.labor_cost !== '' ? formData.labor_cost : calculatedLaborCost.toFixed(2)} 
                onChange={(e) => onChange('labor_cost', e.target.value)} 
                placeholder={calculatedLaborCost.toString()}
              />
              <p className="text-xs text-muted-foreground">
                Calculado: {formatCurrency(calculatedLaborCost)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Custo de Peças</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.parts_cost !== '' ? formData.parts_cost : calculatedPartsCost.toFixed(2)} 
                onChange={(e) => onChange('parts_cost', e.target.value)} 
                placeholder={calculatedPartsCost.toString()}
              />
              <p className="text-xs text-muted-foreground">
                Calculado: {formatCurrency(calculatedPartsCost)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Serviços Externos</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.external_service_cost} 
                onChange={(e) => onChange('external_service_cost', e.target.value)} 
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Ex: terceirização
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Custo Total</Label>
              <Input 
                value={formatCurrency(totalCost)} 
                disabled 
                className="bg-muted font-bold" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
