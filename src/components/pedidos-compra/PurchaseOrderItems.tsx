import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package, ChevronsUpDown, Check, Loader2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useChartOfAccounts, useCostCenters } from "@/hooks/useFinanceiro";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LocalItem {
  id?: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  chart_account_id: string;
  cost_center_id: string;
  freight_allocated?: number; // Frete rateado para este item
  calculated_unit_cost?: number; // Custo unitário calculado (valor + frete)
}

interface PurchaseOrderItemsProps {
  items: LocalItem[];
  onItemsChange: (items: LocalItem[]) => void;
  purpose: "estoque" | "ordem_de_servico" | "despesa_operacional" | "garantia";
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PurchaseOrderItems({ items, onItemsChange, purpose }: PurchaseOrderItemsProps) {
  const { products, isLoading: productsLoading, createProduct, refetch: refetchProducts } = useProducts();
  const { accounts: chartOfAccounts, fetchAccounts } = useChartOfAccounts();
  const { costCenters, fetchCostCenters } = useCostCenters();
  const [openProductPopover, setOpenProductPopover] = useState<number | null>(null);
  const [showCadastrarProduto, setShowCadastrarProduto] = useState(false);
  const [newProductData, setNewProductData] = useState({ code: '', description: '' });
  const [creatingProduct, setCreatingProduct] = useState(false);

  const handleCreateProduct = async () => {
    if (!newProductData.code || !newProductData.description) {
      toast.error("Preencha código e descrição");
      return;
    }
    setCreatingProduct(true);
    try {
      await createProduct.mutateAsync({
        code: newProductData.code,
        description: newProductData.description,
        is_active: true,
      });
      toast.success("Produto criado com sucesso!");
      setShowCadastrarProduto(false);
      setNewProductData({ code: '', description: '' });
      refetchProducts();
    } catch (error) {
      toast.error("Erro ao criar produto");
    } finally {
      setCreatingProduct(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
  }, []);

  const getProductDisplayName = (productId: string, maxLength: number = 20) => {
    if (!productId) return null;
    const product = products?.find(p => p.id === productId);
    if (!product) return null;
    const desc = product.description.length > maxLength 
      ? product.description.substring(0, maxLength) + "..." 
      : product.description;
    return `${product.code} - ${desc}`;
  };

  const handleAddItem = () => {
    onItemsChange([
      ...items,
      {
        product_id: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        total_value: 0,
        chart_account_id: "",
        cost_center_id: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LocalItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "quantity" || field === "unit_price") {
      const qty = Number(field === "quantity" ? value : newItems[index].quantity) || 0;
      const price = Number(field === "unit_price" ? value : newItems[index].unit_price) || 0;
      // Arredondar para 2 casas decimais para evitar problemas de precisão
      newItems[index].total_value = Math.round(qty * price * 100) / 100;
    }

    if (field === "product_id" && value) {
      const product = products?.find((p) => p.id === value);
      if (product) {
        newItems[index].description = product.description;
        if (product.purchase_price) {
          newItems[index].unit_price = Number(product.purchase_price) || 0;
          const qty = Number(newItems[index].quantity) || 0;
          newItems[index].total_value = Math.round(qty * product.purchase_price * 100) / 100;
        }
      }
    }

    onItemsChange(newItems);
  };

  const handleProductSelect = (index: number, productId: string) => {
    handleItemChange(index, "product_id", productId);
    setOpenProductPopover(null);
  };

  // Calcular total com precisão de 2 casas decimais
  const totalGeral = Math.round(items.reduce((acc, item) => acc + (Number(item.total_value) || 0), 0) * 100) / 100;
  const showProductColumn = purpose === "estoque" || purpose === "ordem_de_servico";

  const ProductSelector = ({ item, index }: { item: LocalItem; index: number }) => (
    <Popover 
      open={openProductPopover === index} 
      onOpenChange={(open) => setOpenProductPopover(open ? index : null)}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={openProductPopover === index}
          className="w-full justify-between text-left font-normal"
        >
          <span className="truncate">
            {getProductDisplayName(item.product_id, 25) || "Selecione produto..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[320px] p-0 z-[100]" 
        side="bottom" 
        sideOffset={4}
        align="start"
        avoidCollisions={true}
      >
        <Command>
          <div className="p-2 border-b">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-primary hover:text-primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCadastrarProduto(true);
                setOpenProductPopover(null);
              }}
            >
              <Plus className="h-4 w-4" />
              Cadastrar novo produto
            </Button>
          </div>
          <CommandInput placeholder="Buscar por código ou descrição..." />
          <CommandList className="max-h-[250px]">
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {productsLoading ? (
                <CommandItem disabled>Carregando produtos...</CommandItem>
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`${product.code} ${product.description}`}
                    onSelect={() => handleProductSelect(index, product.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        item.product_id === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium">{product.code}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {product.description}
                      </span>
                    </div>
                  </CommandItem>
                ))
              ) : (
                <CommandItem disabled>Nenhum produto cadastrado</CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Itens do Pedido</CardTitle>
        <Button variant="outline" size="sm" onClick={handleAddItem}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Adicionar Item</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      </CardHeader>
      <CardContent className="p-3 md:p-6">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhum item adicionado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Clique em "Adicionar Item" para começar
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {items.map((item, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {showProductColumn && (
                        <ProductSelector item={item} index={index} />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <Input
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    placeholder="Descrição"
                    className="text-sm"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Qtd</label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                        min={0}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Valor Unit.</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                        min={0}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Total</label>
                      <div className="h-9 px-3 py-2 bg-muted rounded-md text-sm font-medium flex items-center">
                        {formatCurrency(item.total_value)}
                      </div>
                    </div>
                  </div>

                  {/* Frete e Custo Unitário */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Frete Rateado</label>
                      <div className="h-9 px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground flex items-center">
                        {item.freight_allocated ? formatCurrency(item.freight_allocated) : '-'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Custo Unit.</label>
                      <div className="h-9 px-3 py-2 bg-muted rounded-md text-sm font-medium text-blue-600 flex items-center">
                        {item.calculated_unit_cost ? formatCurrency(item.calculated_unit_cost) : formatCurrency(item.unit_price)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Plano de Contas</label>
                      <Select
                        value={item.chart_account_id || undefined}
                        onValueChange={(v) => handleItemChange(index, "chart_account_id", v)}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {chartOfAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Centro de Custo</label>
                      <Select
                        value={item.cost_center_id || undefined}
                        onValueChange={(v) => handleItemChange(index, "cost_center_id", v)}
                      >
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {costCenters.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border overflow-visible">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showProductColumn && <TableHead className="w-[250px]">Produto</TableHead>}
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Qtd</TableHead>
                    <TableHead className="w-[120px]">Valor Unit.</TableHead>
                    <TableHead className="w-[100px]">Frete Rateado</TableHead>
                    <TableHead className="w-[120px]">Custo Unit.</TableHead>
                    <TableHead className="w-[120px]">Total</TableHead>
                    <TableHead className="w-[180px]">Plano de Contas</TableHead>
                    <TableHead className="w-[180px]">Centro de Custo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index} className="relative">
                      {showProductColumn && (
                        <TableCell className="overflow-visible">
                          <ProductSelector item={item} index={index} />
                        </TableCell>
                      )}
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          placeholder="Descrição"
                        />
                      </TableCell>
                      <TableCell className="min-w-[80px]">
                        <Input
                          type="number"
                          value={item.quantity || 0}
                          onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                          min={0}
                          className="w-full text-center"
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price?.toFixed(2) || "0.00"}
                          onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                          min={0}
                          className="w-full text-right"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.freight_allocated ? formatCurrency(item.freight_allocated) : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {item.calculated_unit_cost ? formatCurrency(item.calculated_unit_cost) : formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.total_value)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.chart_account_id || undefined}
                          onValueChange={(v) => handleItemChange(index, "chart_account_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {chartOfAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.cost_center_id || undefined}
                          onValueChange={(v) => handleItemChange(index, "cost_center_id", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCenters.map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="bg-muted p-3 md:p-4 rounded-lg">
                <div className="flex items-center justify-between gap-4 md:gap-8">
                  <span className="text-sm font-medium">Total Geral:</span>
                  <span className="text-base md:text-lg font-bold">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Dialog de Cadastro Rápido de Produto */}
    <Dialog open={showCadastrarProduto} onOpenChange={setShowCadastrarProduto}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cadastrar Produto Rápido
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Código *</Label>
            <Input
              value={newProductData.code}
              onChange={(e) => setNewProductData({ ...newProductData, code: e.target.value })}
              placeholder="Ex: PROD001"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={newProductData.description}
              onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowCadastrarProduto(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreateProduct} disabled={creatingProduct}>
            {creatingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
