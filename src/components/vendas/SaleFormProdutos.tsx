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
import { Package, Plus, Trash2, Truck, ChevronsUpDown, Check, PlusCircle } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { usePriceTables } from "@/hooks/useServices";
import { useInTransitStock, SaleProductItem } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SaleFormProdutosProps {
  items: SaleProductItem[];
  onChange: (items: SaleProductItem[]) => void;
}

function StockPopover({ productId, currentStock, unit, requestedQuantity }: { 
  productId: string; 
  currentStock: number; 
  unit: string;
  requestedQuantity: number;
}) {
  const { data: inTransit } = useInTransitStock(productId);
  
  const isOutOfStock = currentStock < requestedQuantity;
  const hasInTransit = inTransit && inTransit.quantity > 0;

  return (
    <PopoverContent className="w-auto p-3" align="start">
      <div className="space-y-2">
        <div 
          className={`text-xs px-2 py-1 rounded ${
            isOutOfStock 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-green-600 text-white'
          }`}
        >
          Estoque: {currentStock.toLocaleString('pt-BR')} {unit}
        </div>

        {hasInTransit && (
          <div className="text-xs px-2 py-1 rounded bg-blue-500 text-white flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Em trânsito: {inTransit.quantity.toLocaleString('pt-BR')}
            {inTransit.nextArrivalDate && (
              <span className="ml-1">
                (Prev: {new Date(inTransit.nextArrivalDate).toLocaleDateString('pt-BR')})
              </span>
            )}
          </div>
        )}
      </div>
    </PopoverContent>
  );
}

function CadastrarProdutoRapido({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', sale_price: 0, unit: 'UN' });

  const handleSave = async () => {
    if (!form.code || !form.description) {
      toast.error("Código e descrição são obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      code: form.code,
      description: form.description,
      sale_price: form.sale_price,
      unit: form.unit,
      is_active: true
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao cadastrar produto");
    } else {
      toast.success("Produto cadastrado!");
      setOpen(false);
      setForm({ code: '', description: '', sale_price: 0, unit: 'UN' });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary">
          <PlusCircle className="h-4 w-4" />
          Cadastrar novo produto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastro rápido de produto</DialogTitle>
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

interface ProductComboboxProps {
  value: string;
  onSelect: (productId: string) => void;
  products: Array<{
    id: string;
    code: string;
    description: string;
    quantity?: number | null;
    sale_price?: number | null;
    unit?: string | null;
    barcode?: string | null;
  }>;
  isOutOfStock?: boolean;
  onRefetch: () => void;
}

function ProductCombobox({ value, onSelect, products, isOutOfStock, onRefetch }: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedProduct = products.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            isOutOfStock && "border-destructive",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selectedProduct 
              ? `${selectedProduct.code} - ${selectedProduct.description}`
              : "Selecione um produto..."
            }
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome, código ou referência..." />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {products.slice(0, 30).map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.code} ${p.description} ${p.barcode || ''}`}
                  onSelect={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium">{p.code}</span>
                  <span className="ml-1 text-muted-foreground truncate">- {p.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="border-t p-1">
              <CadastrarProdutoRapido onSuccess={onRefetch} />
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SaleFormProdutos({ items, onChange }: SaleFormProdutosProps) {
  const { products, refetch: refetchProducts } = useProducts();
  const { priceTables } = usePriceTables();

  const activeProducts = products?.filter(p => p.is_active) ?? [];
  const activePriceTables = priceTables?.filter(pt => pt.is_active) ?? [];

  const addItem = () => {
    onChange([
      ...items,
      {
        product_id: '',
        quantity: 1,
        unit_price: 0,
        discount_value: 0,
        discount_type: 'value',
        subtotal: 0,
        price_table_id: ''
      }
    ]);
  };

  const updateItem = (index: number, field: keyof SaleProductItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'product_id') {
      const product = activeProducts.find(p => p.id === value);
      if (product) {
        item.unit_price = product.sale_price ?? 0;
        item.product = {
          id: product.id,
          code: product.code,
          description: product.description,
          quantity: product.quantity ?? 0,
          sale_price: product.sale_price ?? 0,
          unit: product.unit ?? 'UN',
          barcode: product.barcode
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

  // Mobile card view
  const renderMobileItem = (item: SaleProductItem, index: number) => {
    const product = item.product || activeProducts.find(p => p.id === item.product_id);
    const isOutOfStock = product && item.quantity > (product.quantity ?? 0);

    return (
      <div key={index} className="border rounded-lg p-4 space-y-3 bg-card">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <ProductCombobox
              value={item.product_id}
              onSelect={(productId) => updateItem(index, 'product_id', productId)}
              products={activeProducts}
              isOutOfStock={isOutOfStock}
              onRefetch={refetchProducts}
            />
          </div>
          <Button variant="destructive" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Tabela</Label>
            <Select
              value={item.price_table_id || 'default'}
              onValueChange={(value) => updateItem(index, 'price_table_id', value === 'default' ? '' : value)}
            >
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão</SelectItem>
                {activePriceTables.map(pt => (
                  <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Quantidade</Label>
            <NumericInput
              value={item.quantity}
              onChange={(val) => updateItem(index, 'quantity', val)}
              step={0.001}
              className={cn("h-9", isOutOfStock && 'border-destructive bg-destructive/10')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Valor Unit.</Label>
            <NumericInput
              value={item.unit_price}
              onChange={(val) => updateItem(index, 'unit_price', val)}
              step={0.01}
              className="h-9"
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
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Produtos
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
                <TableHead className="min-w-[200px]">Produto <span className="text-destructive">*</span></TableHead>
                <TableHead className="w-[120px]">Tabela de Preço</TableHead>
                <TableHead className="min-w-[120px]">Detalhes</TableHead>
                <TableHead className="w-[100px]">Quant. <span className="text-destructive">*</span></TableHead>
                <TableHead className="w-[100px]">Valor <span className="text-destructive">*</span></TableHead>
                <TableHead className="w-[140px]">Desconto</TableHead>
                <TableHead className="w-[100px]">Subtotal</TableHead>
                <TableHead className="w-[60px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const product = item.product || activeProducts.find(p => p.id === item.product_id);
                const isOutOfStock = product && item.quantity > (product.quantity ?? 0);

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <ProductCombobox
                        value={item.product_id}
                        onSelect={(productId) => updateItem(index, 'product_id', productId)}
                        products={activeProducts}
                        isOutOfStock={isOutOfStock}
                        onRefetch={refetchProducts}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.price_table_id || 'default'}
                        onValueChange={(value) => updateItem(index, 'price_table_id', value === 'default' ? '' : value)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Padrão" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Preço padrão</SelectItem>
                          {activePriceTables.map(pt => (
                            <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        className={cn("text-xs", isOutOfStock && 'border-destructive bg-destructive/10')}
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
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Button variant="default" className="mt-4 w-full sm:w-auto" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar produto
        </Button>
      </CardContent>
    </Card>
  );
}
