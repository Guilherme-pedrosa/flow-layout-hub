import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, Trash2, Search } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { SaleServiceItem } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";

interface SaleFormServicosProps {
  items: SaleServiceItem[];
  onChange: (items: SaleServiceItem[]) => void;
}

export function SaleFormServicos({ items, onChange }: SaleFormServicosProps) {
  const { services } = useServices();
  const [searchTerm, setSearchTerm] = useState("");

  const activeServices = services?.filter(s => s.is_active) ?? [];

  // Filtrar por descrição ou código
  const filteredServices = searchTerm 
    ? activeServices.filter(s => 
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : activeServices;

  const addItem = () => {
    onChange([
      ...items,
      {
        service_id: '',
        service_description: '',
        details: '',
        quantity: 1,
        unit_price: 0,
        discount_value: 0,
        discount_type: 'value',
        subtotal: 0
      }
    ]);
  };

  const updateItem = (index: number, field: keyof SaleServiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Se mudou o serviço selecionado, atualizar dados
    if (field === 'service_id') {
      const service = activeServices.find(s => s.id === value);
      if (service) {
        item.service_description = service.description;
        item.unit_price = service.sale_price ?? 0;
        item.service = {
          id: service.id,
          code: service.code,
          description: service.description,
          unit: service.unit,
          sale_price: service.sale_price
        };
      }
    }

    // Recalcular subtotal
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

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5" />
          Serviços
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                Serviço <span className="text-destructive">*</span>
              </TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead className="w-[100px]">
                Quant. <span className="text-destructive">*</span>
              </TableHead>
              <TableHead className="w-[120px]">
                Valor <span className="text-destructive">*</span>
              </TableHead>
              <TableHead className="w-[150px]">Desconto</TableHead>
              <TableHead className="w-[120px]">Subtotal</TableHead>
              <TableHead className="w-[60px]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Select
                    value={item.service_id || ''}
                    onValueChange={(value) => updateItem(index, 'service_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por código ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      {filteredServices.slice(0, 20).map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="font-medium">{s.code}</span> - {s.description}
                        </SelectItem>
                      ))}
                      {filteredServices.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum serviço encontrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={item.details ?? ''}
                    onChange={(e) => updateItem(index, 'details', e.target.value)}
                    placeholder="Detalhes..."
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount_value}
                      onChange={(e) => updateItem(index, 'discount_value', parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Select
                      value={item.discount_type}
                      onValueChange={(value) => updateItem(index, 'discount_type', value)}
                    >
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="value">R$</SelectItem>
                        <SelectItem value="percent">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(item.subtotal)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button
          variant="default"
          className="mt-4"
          onClick={addItem}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar serviço
        </Button>
      </CardContent>
    </Card>
  );
}
