import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { usePurchaseOrders, PurchaseOrderItem, PurchaseOrderItemInsert } from "@/hooks/usePurchaseOrders";
import { useProducts } from "@/hooks/useProducts";
import { useChartOfAccounts, useCostCenters } from "@/hooks/useFinanceiro";
import { toast } from "sonner";

interface PurchaseOrderItemsProps {
  orderId?: string;
  purpose: "estoque" | "ordem_de_servico" | "despesa_operacional";
}

interface LocalItem {
  id?: string;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  chart_account_id: string;
  cost_center_id: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PurchaseOrderItems({ orderId, purpose }: PurchaseOrderItemsProps) {
  const [items, setItems] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(false);

  const { getOrderItems, createOrderItems, deleteOrderItems } = usePurchaseOrders();
  const { products } = useProducts();
  const { accounts: chartOfAccounts, fetchAccounts } = useChartOfAccounts();
  const { costCenters, fetchCostCenters } = useCostCenters();

  // Load financial data
  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
  }, []);

  // Load existing items
  useEffect(() => {
    if (orderId) {
      loadItems();
    }
  }, [orderId]);

  const loadItems = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const orderItems = await getOrderItems(orderId);
      setItems(
        orderItems.map((item) => ({
          id: item.id,
          product_id: item.product_id || "",
          description: item.description || item.product?.description || "",
          quantity: item.quantity,
          unit_price: item.unit_price || 0,
          total_value: item.total_value || 0,
          chart_account_id: item.chart_account_id || "",
          cost_center_id: item.cost_center_id || "",
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([
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
    setItems(items.filter((_, i) => i !== index));
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
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].description = product.description;
        if (product.purchase_price) {
          newItems[index].unit_price = product.purchase_price;
          newItems[index].total_value = newItems[index].quantity * product.purchase_price;
        }
      }
    }

    setItems(newItems);
  };

  const handleSaveItems = async () => {
    if (!orderId) {
      toast.error("Salve o pedido primeiro para adicionar itens");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setLoading(true);
    try {
      // Delete existing items and recreate
      await deleteOrderItems.mutateAsync(orderId);

      const itemsToCreate: PurchaseOrderItemInsert[] = items.map((item) => ({
        purchase_order_id: orderId,
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_value: item.total_value,
        chart_account_id: item.chart_account_id || undefined,
        cost_center_id: item.cost_center_id || undefined,
      }));

      await createOrderItems.mutateAsync(itemsToCreate);
      toast.success("Itens salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar itens:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalGeral = items.reduce((acc, item) => acc + item.total_value, 0);

  const showProductColumn = purpose === "estoque" || purpose === "ordem_de_servico";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Itens do Pedido</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
          {orderId && (
            <Button size="sm" onClick={handleSaveItems} disabled={loading}>
              Salvar Itens
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
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
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showProductColumn && <TableHead className="w-[200px]">Produto</TableHead>}
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
                            value={item.product_id}
                            onValueChange={(v) => handleItemChange(index, "product_id", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.code} - {product.description.substring(0, 30)}
                                </SelectItem>
                              ))}
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
                          value={item.chart_account_id}
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
                          value={item.cost_center_id}
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
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-sm font-medium">Total Geral:</span>
                  <span className="text-lg font-bold">{formatCurrency(totalGeral)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
