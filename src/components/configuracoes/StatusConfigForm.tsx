import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/dialog";

export type StockBehavior = 'none' | 'reserve';
export type FinancialBehavior = 'none' | 'forecast' | 'effective';
export type CheckoutBehavior = 'none' | 'required';

export interface StatusFormData {
  name: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  stock_behavior: StockBehavior;
  financial_behavior: FinancialBehavior;
  checkout_behavior: CheckoutBehavior;
  display_order: number;
  opens_field_activity?: boolean; // Novo campo para integração Field Control
}

interface StatusConfigFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: StatusFormData & { id?: string };
  onSave: (data: StatusFormData) => void;
  title?: string;
}

const STOCK_BEHAVIOR_OPTIONS = [
  { value: 'none', label: 'Nenhum', description: 'Não afeta o estoque' },
  { value: 'reserve', label: 'Reservar', description: 'Reserva o estoque (previsão)' },
];

const FINANCIAL_BEHAVIOR_OPTIONS = [
  { value: 'none', label: 'Nenhum', description: 'Não gera lançamento' },
  { value: 'forecast', label: 'Previsão', description: 'Gera previsão financeira' },
  { value: 'effective', label: 'Efetivo', description: 'Gera lançamento efetivo' },
];

const CHECKOUT_BEHAVIOR_OPTIONS = [
  { value: 'none', label: 'Não', description: 'Não requer checkout' },
  { value: 'required', label: 'Sim', description: 'Requer conferência de produtos' },
];

const COLOR_OPTIONS = [
  '#6b7280', // gray
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function StatusConfigForm({ 
  open, 
  onOpenChange, 
  initialData,
  onSave,
  title = "Status"
}: StatusConfigFormProps) {
  const getDefaultFormData = (): StatusFormData => ({
    name: '',
    color: '#6b7280',
    is_default: false,
    is_active: true,
    stock_behavior: 'none',
    financial_behavior: 'none',
    checkout_behavior: 'none',
    display_order: 0,
    opens_field_activity: false,
  });

  const [formData, setFormData] = useState<StatusFormData>(
    initialData || getDefaultFormData()
  );

  // Sync form data when initialData changes or dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          color: initialData.color || '#6b7280',
          is_default: initialData.is_default ?? false,
          is_active: initialData.is_active ?? true,
          stock_behavior: initialData.stock_behavior || 'none',
          financial_behavior: initialData.financial_behavior || 'none',
          checkout_behavior: initialData.checkout_behavior || 'none',
          display_order: initialData.display_order || 0,
          opens_field_activity: initialData.opens_field_activity ?? false,
        });
      } else {
        setFormData(getDefaultFormData());
      }
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? `Editar ${title}` : `Novo ${title}`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Status</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Aguardando Pagamento"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color 
                        ? 'border-foreground scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enviar para Checkout?</Label>
            <Select
              value={formData.checkout_behavior}
              onValueChange={(value: CheckoutBehavior) => 
                setFormData({ ...formData, checkout_behavior: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHECKOUT_BEHAVIOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reservar Estoque?</Label>
            <Select
              value={formData.stock_behavior}
              onValueChange={(value: StockBehavior) => 
                setFormData({ ...formData, stock_behavior: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_BEHAVIOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Comportamento Financeiro</Label>
            <Select
              value={formData.financial_behavior}
              onValueChange={(value: FinancialBehavior) => 
                setFormData({ ...formData, financial_behavior: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_BEHAVIOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Ordem de Exibição</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>

          {/* Integração Field Control */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Switch
                id="opens_field_activity"
                checked={formData.opens_field_activity ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, opens_field_activity: checked })}
              />
              <div>
                <Label htmlFor="opens_field_activity" className="text-base font-medium">
                  Abre atividade no Field Control?
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando uma OS entrar neste status, será criada uma atividade no Field Control automaticamente
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <Label htmlFor="is_default">Status padrão</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.name.trim()} className="w-full sm:w-auto">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
