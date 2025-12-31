import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Loader2,
  Package,
  ShoppingCart,
  Sparkles,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { useCompany } from "@/contexts/CompanyContext";
import { useNavigate } from "react-router-dom";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";

interface DemandItem {
  id: string;
  source_type: 'service_order' | 'sale';
  source_number: number;
  source_id: string;
  client_name: string;
  client_id: string;
  product_id: string;
  product_code: string;
  product_description: string;
  quantity_needed: number;
  current_stock: number;
  stock_shortage: number;
  last_supplier_id: string | null;
  last_supplier_name: string | null;
  last_purchase_price: number | null;
  last_purchase_date: string | null;
  status_name: string;
  created_at: string;
}

interface DemandSummary {
  total_demands: number;
  os_count: number;
  sale_count: number;
  unique_products: number;
  estimated_purchase_value: number;
}

// Storage key for persisting analysis results
const STORAGE_KEY = 'purchase_suggestion_data';

export function PurchaseSuggestionPanel() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const navigate = useNavigate();
  const { createOrder, createOrderItems } = usePurchaseOrders();

  const [loading, setLoading] = useState(false);
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [summary, setSummary] = useState<DemandSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    if (!companyId) return;
    
    const savedData = localStorage.getItem(`${STORAGE_KEY}_${companyId}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Check if data is not older than 4 hours
        const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
        if (parsed.timestamp && parsed.timestamp > fourHoursAgo) {
          setDemands(parsed.demands || []);
          setSummary(parsed.summary || null);
        }
      } catch (e) {
        console.error('Error loading saved demands:', e);
      }
    }
  }, [companyId]);

  // Persist data when it changes
  const persistData = (newDemands: DemandItem[], newSummary: DemandSummary | null) => {
    if (!companyId) return;
    
    localStorage.setItem(`${STORAGE_KEY}_${companyId}`, JSON.stringify({
      demands: newDemands,
      summary: newSummary,
      timestamp: Date.now(),
    }));
  };

  const runAnalysis = async () => {
    if (!companyId) {
      toast.error("Selecione uma empresa");
      return;
    }

    setLoading(true);
    setDemands([]);
    setSummary(null);
    setSelectedIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("demand-analysis", {
        body: { company_id: companyId }
      });

      if (error) throw error;

      if (data?.success) {
        const newDemands = data.data.demands || [];
        const newSummary = data.data.summary || null;
        
        setDemands(newDemands);
        setSummary(newSummary);
        persistData(newDemands, newSummary);
        
        if (data.data.summary.total_demands === 0) {
          toast.success("Nenhuma demanda pendente! Todas as OSs e vendas têm estoque.");
        } else {
          toast.success(`${data.data.summary.total_demands} itens precisam de compra!`);
        }
      } else {
        throw new Error(data?.error || "Erro na análise");
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast.error("Erro ao analisar demandas");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (itemId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === demands.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(demands.map(d => d.id)));
    }
  };

  const createPurchaseOrder = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um item");
      return;
    }

    if (!companyId) {
      toast.error("Selecione uma empresa");
      return;
    }

    setCreatingOrder(true);
    try {
      // Get selected demands
      const selectedDemands = demands.filter(d => selectedIds.has(d.id));
      
      // Group by supplier to potentially create multiple orders
      const bySupplier: Record<string, DemandItem[]> = {};
      const noSupplier: DemandItem[] = [];
      
      for (const demand of selectedDemands) {
        if (demand.last_supplier_id) {
          if (!bySupplier[demand.last_supplier_id]) {
            bySupplier[demand.last_supplier_id] = [];
          }
          bySupplier[demand.last_supplier_id].push(demand);
        } else {
          noSupplier.push(demand);
        }
      }

      // Get default pending status
      const { data: defaultStatus } = await supabase
        .from('purchase_order_statuses')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_default', true)
        .maybeSingle();

      let createdOrdersCount = 0;

      // Create orders grouped by supplier
      for (const [supplierId, supplierDemands] of Object.entries(bySupplier)) {
        const totalValue = supplierDemands.reduce((sum, d) => 
          sum + (d.stock_shortage * (d.last_purchase_price || 0)), 0);

        // Create the order
        const orderResult = await createOrder.mutateAsync({
          supplier_id: supplierId,
          purpose: 'estoque',
          observations: `Gerado automaticamente a partir de ${supplierDemands.length} demanda(s) de vendas/OSs`,
          total_value: totalValue,
          status_id: defaultStatus?.id,
        });

        if (orderResult) {
          // Create items
          const items = supplierDemands.map(d => ({
            purchase_order_id: orderResult.id,
            product_id: d.product_id,
            description: d.product_description,
            quantity: d.stock_shortage,
            unit_price: d.last_purchase_price || 0,
            total_value: d.stock_shortage * (d.last_purchase_price || 0),
          }));

          await createOrderItems.mutateAsync(items);
          createdOrdersCount++;
        }
      }

      // Create order for items without supplier
      if (noSupplier.length > 0) {
        const totalValue = noSupplier.reduce((sum, d) => 
          sum + (d.stock_shortage * (d.last_purchase_price || 0)), 0);

        const orderResult = await createOrder.mutateAsync({
          purpose: 'estoque',
          observations: `Gerado automaticamente - ${noSupplier.length} item(ns) SEM fornecedor definido`,
          total_value: totalValue,
          status_id: defaultStatus?.id,
        });

        if (orderResult) {
          const items = noSupplier.map(d => ({
            purchase_order_id: orderResult.id,
            product_id: d.product_id,
            description: d.product_description,
            quantity: d.stock_shortage,
            unit_price: d.last_purchase_price || 0,
            total_value: d.stock_shortage * (d.last_purchase_price || 0),
          }));

          await createOrderItems.mutateAsync(items);
          createdOrdersCount++;
        }
      }

      // Remove selected items from the list
      const remainingDemands = demands.filter(d => !selectedIds.has(d.id));
      setDemands(remainingDemands);
      setSummary(prev => prev ? {
        ...prev,
        total_demands: remainingDemands.length,
        unique_products: new Set(remainingDemands.map(d => d.product_id)).size,
        estimated_purchase_value: remainingDemands.reduce((sum, d) => 
          sum + (d.stock_shortage * (d.last_purchase_price || 0)), 0),
      } : null);
      persistData(remainingDemands, summary);
      setSelectedIds(new Set());

      toast.success(
        `${createdOrdersCount} pedido(s) de compra criado(s)!`,
        { 
          description: "Acesse Compras > Pedidos para revisar",
          action: {
            label: "Ver Pedidos",
            onClick: () => navigate('/pedidos-compra'),
          }
        }
      );
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido de compra");
    } finally {
      setCreatingOrder(false);
    }
  };

  const getSourceBadge = (sourceType: 'service_order' | 'sale') => {
    if (sourceType === 'service_order') {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <Wrench className="h-3 w-3 mr-1" />OS
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        <FileText className="h-3 w-3 mr-1" />Venda
      </Badge>
    );
  };

  // Estado inicial - só mostra o botão
  if (!summary && demands.length === 0 && !loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Compra Inteligente com IA</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Analisa todas as vendas e ordens de serviço aprovadas que não têm estoque disponível 
            e gera uma lista completa para compra.
          </p>
          <Button 
            onClick={runAnalysis} 
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Compra Inteligente com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="font-medium">Analisando vendas e ordens de serviço...</p>
          <p className="text-sm text-muted-foreground">Identificando itens sem estoque</p>
        </CardContent>
      </Card>
    );
  }

  // Resultado sem demandas
  if (summary && demands.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-900">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <Package className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-600 mb-2">Tudo em ordem!</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Não há vendas ou ordens de serviço aprovadas com falta de estoque.
          </p>
          <Button onClick={runAnalysis} variant="outline">
            <Sparkles className="h-4 w-4 mr-2" />
            Verificar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Resultado com demandas
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Wrench className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-xs text-purple-600/70">Ordens de Serviço</p>
                <p className="text-3xl font-bold text-purple-600">{summary?.os_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600/70">Vendas</p>
                <p className="text-3xl font-bold text-blue-600">{summary?.sale_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-xs text-red-600/70">Produtos Faltando</p>
                <p className="text-3xl font-bold text-red-600">{summary?.unique_products || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-green-600/70">Valor Estimado de Compra</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary?.estimated_purchase_value || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selectedIds.size === demands.length && demands.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} de {demands.length} selecionados
          </span>
          <Button onClick={runAnalysis} variant="ghost" size="sm">
            <Sparkles className="h-4 w-4 mr-1" />
            Reanalisar
          </Button>
        </div>
        <Button
          onClick={createPurchaseOrder}
          disabled={selectedIds.size === 0 || creatingOrder}
          className="bg-green-600 hover:bg-green-700"
        >
          {creatingOrder ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4 mr-2" />
          )}
          Criar Pedido de Compra ({selectedIds.size})
        </Button>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Itens para Compra</CardTitle>
          <CardDescription>
            Vendas e OSs aprovadas que precisam de peças para serem atendidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-20">Tipo</TableHead>
                  <TableHead className="w-20">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right w-20">Qtd</TableHead>
                  <TableHead className="text-right w-20">Estoque</TableHead>
                  <TableHead className="text-right w-20">Falta</TableHead>
                  <TableHead>Último Fornecedor</TableHead>
                  <TableHead className="text-right">Último Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demands.map((item) => (
                  <TableRow 
                    key={item.id}
                    className={selectedIds.has(item.id) ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelection(item.id)}
                      />
                    </TableCell>
                    <TableCell>{getSourceBadge(item.source_type)}</TableCell>
                    <TableCell className="font-mono font-bold">#{item.source_number}</TableCell>
                    <TableCell className="max-w-[120px] truncate" title={item.client_name}>
                      {item.client_name}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <span className="font-medium text-sm">{item.product_code}</span>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.product_description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.quantity_needed}</TableCell>
                    <TableCell className="text-right">
                      <span className={item.current_stock <= 0 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                        {item.current_stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-red-600 font-bold">{item.stock_shortage}</span>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate" title={item.last_supplier_name || ''}>
                      {item.last_supplier_name || (
                        <span className="text-muted-foreground italic text-xs">Sem histórico</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.last_purchase_price ? (
                        <span className="font-medium">{formatCurrency(item.last_purchase_price)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
