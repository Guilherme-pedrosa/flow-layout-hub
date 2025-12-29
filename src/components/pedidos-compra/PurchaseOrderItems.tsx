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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useChartOfAccounts, useCostCenters } from "@/hooks/useFinanceiro";

export interface LocalItem {
  id?: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  chart_account_id: string;
  cost_center_id: string;
}

interface PurchaseOrderItemsProps {
  items: LocalItem[];
  onItemsChange: (items: LocalItem[]) => void;
  purpose: "estoque" | "ordem_de_servico" | "despesa_operacional";
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PurchaseOrderItems({ items, onItemsChange, purpose }: PurchaseOrderItemsProps) {
  const { products, isLoading: productsLoading } = useProducts();
  const { accounts: chartOfAccounts, fetchAccounts } = useChartOfAccounts();
  const { costCenters, fetchCostCenters } = useCostCenters();

  // Load financial data
  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
  }, []);

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

    // Recalculate total
    if (field === "quantity" || field === "unit_price") {
      const qty = field === "quantity" ? value : newItems[index].quantity;
      const price = field === "unit_price" ? value : newItems[index].unit_price;
      newItems[index].total_value = qty * price;
    }

    // Set description from product
    if (field === "product_id" && value) {
      const product = products?.find((p) => p.id === value);
      if (product) {
        newItems[index].description = product.description;
        if (product.purchase_price) {
          newItems[index].unit_price = product.purchase_price;
          newItems[index].total_value = newItems[index].quantity * product.purchase_price;
        }
      }
    }

    onItemsChange(newItems);
  };

  const totalGeral = items.reduce((acc, item) => acc + item.total_value, 0);

  const showProductColumn = purpose === "estoque" || purpose === "ordem_de_servico";

  // Get display text for product
  const getProductLabel = (productId: string) => {
    if (!productId) return "";
    const product = products?.find(p => p.id === productId);
    return product ? `${product.code} - ${product.description}` : "";
  };

  return (
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
                        <Select
                          value={item.product_id || undefined}
                          onValueChange={(v) => handleItemChange(index, "product_id", v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione produto..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {productsLoading ? (
                              <SelectItem value="loading" disabled>Carregando...</SelectItem>
                            ) : products && products.length > 0 ? (
                              products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  <span className="font-medium">{product.code}</span> - {product.description}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="empty" disabled>Nenhum produto</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
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
            <div className="hidden md:block rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showProductColumn && <TableHead className="w-[250px]">Produto</TableHead>}
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Qtd</TableHead>
                    <TableHead className="w-[120px]">Valor Unit.</TableHead>
                    <TableHead className="w-[120px]">Total</TableHead>
                    <TableHead className="w-[180px]">Plano de Contas</TableHead>
                    <TableHead className="w-[180px]">Centro de Custo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      {showProductColumn && (
                        <TableCell>
                          <Select
                            value={item.product_id || undefined}
                            onValueChange={(v) => handleItemChange(index, "product_id", v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione produto..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {productsLoading ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : products && products.length > 0 ? (
                                products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    <span className="font-medium">{product.code}</span> - {product.description}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="empty" disabled>Nenhum produto</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          placeholder="Descrição"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                          min={0}
                        />
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
  );
}
