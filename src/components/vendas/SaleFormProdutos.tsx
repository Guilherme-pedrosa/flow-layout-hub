import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Package, Plus, Trash2, Truck, Search, PlusCircle } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { usePriceTables } from "@/hooks/useServices";
import { useInTransitStock, SaleProductItem } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
              <Input type="number" value={form.sale_price} onChange={(e) => setForm(f => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))} />
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

export function SaleFormProdutos({ items, onChange }: SaleFormProdutosProps) {
  const { products, refetch: refetchProducts } = useProducts();
  const { priceTables } = usePriceTables();
  const [searchTerm, setSearchTerm] = useState("");

  const activeProducts = products?.filter(p => p.is_active) ?? [];
  const activePriceTables = priceTables?.filter(pt => pt.is_active) ?? [];

  const filteredProducts = searchTerm 
    ? activeProducts.filter(p => 
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : activeProducts;

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

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          Produtos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Produto <span className="text-destructive">*</span></TableHead>
              <TableHead className="w-[120px]">Tabela de Preço</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead className="w-[120px]">Quant. <span className="text-destructive">*</span></TableHead>
              <TableHead className="w-[120px]">Valor <span className="text-destructive">*</span></TableHead>
              <TableHead className="w-[150px]">Desconto</TableHead>
              <TableHead className="w-[120px]">Subtotal</TableHead>
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
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateItem(index, 'product_id', value)}
                    >
                      <SelectTrigger className={isOutOfStock ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Digite para buscar" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar por nome, código ou referência..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        {filteredProducts.slice(0, 20).map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-medium">{p.code}</span> - {p.description}
                          </SelectItem>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhum produto encontrado
                          </div>
                        )}
                        <div className="border-t mt-2 pt-2">
                          <CadastrarProdutoRapido onSuccess={refetchProducts} />
                        </div>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.price_table_id || 'default'}
                      onValueChange={(value) => updateItem(index, 'price_table_id', value === 'default' ? '' : value)}
                    >
                      <SelectTrigger>
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
                    />
                  </TableCell>
                  <TableCell>
                    {product ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className={isOutOfStock ? 'border-destructive bg-destructive/10 cursor-pointer' : 'cursor-pointer'}
                          />
                        </PopoverTrigger>
                        <StockPopover
                          productId={item.product_id}
                          currentStock={product.quantity ?? 0}
                          unit={product.unit ?? 'UN'}
                          requestedQuantity={item.quantity}
                        />
                      </Popover>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    )}
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
                    <Button variant="destructive" size="icon" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Button variant="default" className="mt-4" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar produto
        </Button>
      </CardContent>
    </Card>
  );
}
