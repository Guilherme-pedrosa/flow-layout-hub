import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { SaleServiceItem } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";

interface SaleFormServicosProps {
  items: SaleServiceItem[];
  onChange: (items: SaleServiceItem[]) => void;
}

export function SaleFormServicos({ items, onChange }: SaleFormServicosProps) {
  const addItem = () => {
    onChange([
      ...items,
      {
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
                  <Input
                    value={item.service_description}
                    onChange={(e) => updateItem(index, 'service_description', e.target.value)}
                    placeholder="Descrição do serviço"
                  />
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
