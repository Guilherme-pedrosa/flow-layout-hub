import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, Plus, Trash2, ChevronsUpDown, Check, PlusCircle } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { ServiceOrderServiceItem } from "@/hooks/useServiceOrders";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ServiceOrderFormServicosProps {
  items: ServiceOrderServiceItem[];
  onChange: (items: ServiceOrderServiceItem[]) => void;
}

function CadastrarServicoRapido({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', sale_price: 0, unit: 'SV' });

  const handleSave = async () => {
    if (!form.code || !form.description) {
      toast.error("Código e descrição são obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("services").insert({
      code: form.code,
      description: form.description,
      sale_price: form.sale_price,
      unit: form.unit,
      is_active: true,
      company_id: '00000000-0000-0000-0000-000000000001'
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao cadastrar serviço");
    } else {
      toast.success("Serviço cadastrado!");
      setOpen(false);
      setForm({ code: '', description: '', sale_price: 0, unit: 'SV' });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary">
          <PlusCircle className="h-4 w-4" />
          Cadastrar novo serviço
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastro rápido de serviço</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Código *</Label>
            <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço de venda</Label>
              <NumericInput value={form.sale_price} onChange={(val) => setForm(f => ({ ...f, sale_price: val }))} />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Input value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceComboboxProps {
  value: string;
  onSelect: (serviceId: string) => void;
  services: Array<{
    id: string;
    code: string;
    description: string;
    sale_price?: number | null;
    unit?: string | null;
  }>;
  onRefetch: () => void;
}

function ServiceCombobox({ value, onSelect, services, onRefetch }: ServiceComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedService = services.find(s => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selectedService 
              ? `${selectedService.code} - ${selectedService.description}`
              : "Selecione um serviço..."
            }
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar serviço..." />
          <CommandList>
            <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
            <CommandGroup>
              {services.slice(0, 30).map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.code} ${s.description}`}
                  onSelect={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === s.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium">{s.code}</span>
                  <span className="ml-1 text-muted-foreground truncate">- {s.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="border-t p-1">
              <CadastrarServicoRapido onSuccess={onRefetch} />
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ServiceOrderFormServicos({ items, onChange }: ServiceOrderFormServicosProps) {
  const { services, refetch: refetchServices } = useServices();

  const activeServices = services?.filter(s => s.is_active) ?? [];

  const addItem = () => {
    onChange([
      ...items,
      {
        service_id: '',
        service_description: '',
        quantity: 1,
        unit_price: 0,
        cost_price: 0,
        discount_value: 0,
        discount_type: 'value',
        subtotal: 0,
      }
    ]);
  };

  const updateItem = (index: number, field: keyof ServiceOrderServiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'service_id') {
      const service = activeServices.find(s => s.id === value);
      if (service) {
        item.unit_price = service.sale_price ?? 0;
        item.service_description = service.description;
        item.service = {
          id: service.id,
          code: service.code,
          description: service.description,
          unit: service.unit ?? 'SV',
          sale_price: service.sale_price ?? 0
        };
      }
    }

    const price = item.unit_price * item.quantity;
    if (item.discount_type === 'percent') {
      item.subtotal = price - (price * (item.discount_value / 100));
    } else {
      item.subtotal = price - item.discount_value;
    }

    newItems[index] = item;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  // Calcular custo total de mão de obra
  const totalLaborCost = items.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);

  // Mobile card view
  const renderMobileItem = (item: ServiceOrderServiceItem, index: number) => {
    return (
      <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <ServiceCombobox
              value={item.service_id || ''}
              onSelect={(serviceId) => updateItem(index, 'service_id', serviceId)}
              services={activeServices}
              onRefetch={refetchServices}
            />
          </div>
          <Button variant="destructive" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Quantidade</Label>
            <NumericInput
              value={item.quantity}
              onChange={(val) => updateItem(index, 'quantity', val)}
              step={0.001}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Valor Unit.</Label>
            <NumericInput
              value={item.unit_price}
              onChange={(val) => updateItem(index, 'unit_price', val)}
              step={0.01}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Custo M.O.</Label>
            <NumericInput
              value={item.cost_price}
              onChange={(val) => updateItem(index, 'cost_price', val)}
              step={0.01}
              className="h-9 bg-muted"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Desconto</Label>
            <div className="flex gap-1">
              <NumericInput
                value={item.discount_value}
                onChange={(val) => updateItem(index, 'discount_value', val)}
                step={0.01}
                className="flex-1 h-9"
              />
              <Select
                value={item.discount_type}
                onValueChange={(value) => updateItem(index, 'discount_type', value)}
              >
                <SelectTrigger className="w-14 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">R$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Detalhes</Label>
          <Input
            value={item.details ?? ''}
            onChange={(e) => updateItem(index, 'details', e.target.value)}
            placeholder="Observações..."
            className="h-9"
          />
        </div>

        <div className="pt-2 border-t flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Subtotal:</span>
          <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-lg">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Serviços
          </div>
          <span className="text-sm text-muted-foreground">
            Custo de mão de obra: {formatCurrency(totalLaborCost)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile view - Cards */}
        <div className="md:hidden space-y-4">
          {items.map((item, index) => renderMobileItem(item, index))}
        </div>

        {/* Desktop view - Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Serviço <span className="text-destructive">*</span></TableHead>
                <TableHead className="min-w-[120px]">Detalhes</TableHead>
                <TableHead className="w-[80px]">Qtd.</TableHead>
                <TableHead className="w-[100px]">Valor</TableHead>
                <TableHead className="w-[100px]">Custo</TableHead>
                <TableHead className="w-[130px]">Desconto</TableHead>
                <TableHead className="w-[100px]">Subtotal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <ServiceCombobox
                      value={item.service_id || ''}
                      onSelect={(serviceId) => updateItem(index, 'service_id', serviceId)}
                      services={activeServices}
                      onRefetch={refetchServices}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.details ?? ''}
                      onChange={(e) => updateItem(index, 'details', e.target.value)}
                      placeholder="Detalhes..."
                      className="text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <NumericInput
                      value={item.quantity}
                      onChange={(val) => updateItem(index, 'quantity', val)}
                      step={0.001}
                      className="text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <NumericInput
                      value={item.unit_price}
                      onChange={(val) => updateItem(index, 'unit_price', val)}
                      step={0.01}
                      className="text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <NumericInput
                      value={item.cost_price}
                      onChange={(val) => updateItem(index, 'cost_price', val)}
                      step={0.01}
                      className="text-xs bg-muted"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <NumericInput
                        value={item.discount_value}
                        onChange={(val) => updateItem(index, 'discount_value', val)}
                        step={0.01}
                        className="w-16 text-xs"
                      />
                      <Select
                        value={item.discount_type}
                        onValueChange={(value) => updateItem(index, 'discount_type', value)}
                      >
                        <SelectTrigger className="w-14 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="value">R$</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-xs">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                  <TableCell>
                    <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeItem(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button variant="default" className="mt-4 w-full sm:w-auto" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar serviço
        </Button>
      </CardContent>
    </Card>
  );
}
