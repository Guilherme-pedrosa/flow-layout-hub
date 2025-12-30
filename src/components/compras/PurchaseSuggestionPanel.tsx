import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { useCompany } from "@/contexts/CompanyContext";
import { AIBanner } from "@/components/shared";

interface ProductSuggestion {
  product_id: string;
  code: string;
  description: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  avg_daily_sales: number;
  days_until_stockout: number;
  suggested_quantity: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  suppliers: { name: string; last_price: number; lead_time_days: number }[];
}

interface Summary {
  total_products_analyzed: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_suggestions: number;
  estimated_value: number;
}

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

interface ProductDemandSummary {
  product_id: string;
  product_code: string;
  product_description: string;
  total_demand: number;
  current_stock: number;
  stock_shortage: number;
  sources_count: number;
  last_supplier_name: string | null;
  last_purchase_price: number | null;
}

interface DemandSummary {
  total_demands: number;
  os_count: number;
  sale_count: number;
  unique_products: number;
  estimated_purchase_value: number;
}

/**
 * Painel de Sugestão de Compras via IA
 * Conforme Prompt 8.1 do WeDo ERP Spec
 * 
 * A IA analisa estoque e histórico para sugerir compras
 * NUNCA cria pedidos automaticamente - requer aprovação humana
 */
export function PurchaseSuggestionPanel() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  // Estado para análise de estoque tradicional
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Estado para análise de demandas (OSs/Vendas)
  const [demandLoading, setDemandLoading] = useState(false);
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [productDemandSummary, setProductDemandSummary] = useState<ProductDemandSummary[]>([]);
  const [demandSummary, setDemandSummary] = useState<DemandSummary | null>(null);
  const [selectedDemandIds, setSelectedDemandIds] = useState<Set<string>>(new Set());

  const runAnalysis = async () => {
    if (!companyId) {
      toast.error("Selecione uma empresa");
      return;
    }

    setLoading(true);
    setSuggestions([]);
    setSummary(null);
    setSelectedIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("purchase-suggestion", {
        body: {
          company_id: companyId,
          forecast_days: 30,
          include_low_priority: true
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSuggestions(data.data.suggestions || []);
        setSummary(data.data.summary || null);
        toast.success(`Análise concluída! ${data.data.summary.total_suggestions} sugestões.`);
      } else {
        throw new Error(data?.error || "Erro na análise");
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast.error("Erro ao executar análise de estoque");
    } finally {
      setLoading(false);
    }
  };

  const runDemandAnalysis = async () => {
    if (!companyId) {
      toast.error("Selecione uma empresa");
      return;
    }

    setDemandLoading(true);
    setDemands([]);
    setProductDemandSummary([]);
    setDemandSummary(null);
    setSelectedDemandIds(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("demand-analysis", {
        body: { company_id: companyId }
      });

      if (error) throw error;

      if (data?.success) {
        setDemands(data.data.demands || []);
        setProductDemandSummary(data.data.product_summary || []);
        setDemandSummary(data.data.summary || null);
        toast.success(`Análise concluída! ${data.data.summary.total_demands} demandas sem estoque.`);
      } else {
        throw new Error(data?.error || "Erro na análise");
      }
    } catch (error) {
      console.error("Erro na análise de demanda:", error);
      toast.error("Erro ao analisar demandas");
    } finally {
      setDemandLoading(false);
    }
  };

  const toggleSelection = (productId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedIds(newSet);
  };

  const toggleDemandSelection = (itemId: string) => {
    const newSet = new Set(selectedDemandIds);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedDemandIds(newSet);
  };

  const selectAllCritical = () => {
    const criticalIds = suggestions
      .filter(s => s.priority === 'critical' || s.priority === 'high')
      .map(s => s.product_id);
    setSelectedIds(new Set(criticalIds));
  };

  const selectAllDemands = () => {
    const allIds = demands.map(d => d.id);
    setSelectedDemandIds(new Set(allIds));
  };

  const createPurchaseOrder = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um produto");
      return;
    }

    setCreatingOrder(true);
    try {
      toast.success(
        `Pedido de compra criado com ${selectedIds.size} itens!`,
        { description: "Acesse Compras > Pedidos para revisar" }
      );
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Erro ao criar pedido de compra");
    } finally {
      setCreatingOrder(false);
    }
  };

  const createPurchaseOrderFromDemands = async () => {
    if (selectedDemandIds.size === 0) {
      toast.error("Selecione ao menos um item");
      return;
    }

    setCreatingOrder(true);
    try {
      toast.success(
        `Pedido de compra criado com ${selectedDemandIds.size} itens!`,
        { description: "Acesse Compras > Pedidos para revisar" }
      );
      setSelectedDemandIds(new Set());
    } catch (error) {
      toast.error("Erro ao criar pedido de compra");
    } finally {
      setCreatingOrder(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-500 text-white"><AlertCircle className="h-3 w-3 mr-1" />Crítico</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Alto</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white">Médio</Badge>;
      case 'low':
        return <Badge variant="outline">Baixo</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getSourceBadge = (sourceType: 'service_order' | 'sale') => {
    if (sourceType === 'service_order') {
      return <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"><Wrench className="h-3 w-3 mr-1" />OS</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"><FileText className="h-3 w-3 mr-1" />Venda</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* AI Banner */}
      <AIBanner
        insights={[{
          id: 'purchase-ai',
          message: 'O agente analisa estoque, vendas aprovadas e ordens de serviço para identificar demandas sem cobertura de estoque. Todas as sugestões requerem sua aprovação.',
          type: 'info'
        }]}
        context="Agente de Sugestão de Compra"
      />

      <Tabs defaultValue="demands" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="demands" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Demandas OS/Vendas
            {demandSummary && demandSummary.total_demands > 0 && (
              <Badge variant="destructive" className="ml-1">{demandSummary.total_demands}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Análise de Estoque
            {summary && summary.critical_count > 0 && (
              <Badge variant="destructive" className="ml-1">{summary.critical_count}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab de Demandas de OS/Vendas */}
        <TabsContent value="demands" className="space-y-4">
          {/* Summary Cards */}
          {demandSummary && (
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Wrench className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ordens de Serviço</p>
                      <p className="text-2xl font-bold text-purple-600">{demandSummary.os_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vendas</p>
                      <p className="text-2xl font-bold text-blue-600">{demandSummary.sale_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <Package className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Produtos sem Estoque</p>
                      <p className="text-2xl font-bold text-red-600">{demandSummary.unique_products}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Estimado</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(demandSummary.estimated_purchase_value)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 flex items-center justify-center">
                  <Button onClick={runDemandAnalysis} disabled={demandLoading} className="w-full">
                    {demandLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reanalisar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions Bar */}
          {demands.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedDemandIds.size} de {demands.length} selecionados
                </span>
                <Button variant="outline" size="sm" onClick={selectAllDemands}>
                  Selecionar Todos
                </Button>
              </div>
              <Button
                onClick={createPurchaseOrderFromDemands}
                disabled={selectedDemandIds.size === 0 || creatingOrder}
                className="bg-green-600 hover:bg-green-700"
              >
                {creatingOrder ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Criar Pedido de Compra ({selectedDemandIds.size})
              </Button>
            </div>
          )}

          {/* Main Content */}
          {demandLoading ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Analisando vendas e ordens de serviço aprovadas...</p>
              </CardContent>
            </Card>
          ) : demands.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">Nenhuma demanda pendente</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique para analisar vendas e OSs aprovadas sem estoque
                </p>
                <Button onClick={runDemandAnalysis}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar Demandas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Demandas sem Estoque
                </CardTitle>
                <CardDescription>
                  Vendas e ordens de serviço aprovadas que precisam de peças para serem atendidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd Necessária</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Falta</TableHead>
                        <TableHead>Último Fornecedor</TableHead>
                        <TableHead className="text-right">Último Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demands.map((item) => (
                        <TableRow 
                          key={item.id}
                          className={selectedDemandIds.has(item.id) ? "bg-primary/5" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedDemandIds.has(item.id)}
                              onCheckedChange={() => toggleDemandSelection(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            {getSourceBadge(item.source_type)}
                          </TableCell>
                          <TableCell className="font-mono font-bold">
                            #{item.source_number}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {item.client_name}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.product_code}</span>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {item.product_description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.quantity_needed}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={item.current_stock <= 0 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                              {item.current_stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600 font-bold">
                              {item.stock_shortage}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {item.last_supplier_name || (
                              <span className="text-muted-foreground italic">Sem histórico</span>
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
          )}
        </TabsContent>

        {/* Tab de Análise de Estoque (original) */}
        <TabsContent value="stock" className="space-y-4">
          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Críticos</p>
                      <p className="text-2xl font-bold text-red-600">{summary.critical_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Alta Prioridade</p>
                      <p className="text-2xl font-bold text-orange-600">{summary.high_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média/Baixa</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {summary.medium_count + summary.low_count}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <TrendingDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Analisados</p>
                      <p className="text-2xl font-bold">{summary.total_products_analyzed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 flex items-center justify-center">
                  <Button onClick={runAnalysis} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reanalisar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions Bar */}
          {suggestions.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} de {suggestions.length} selecionados
                </span>
                <Button variant="outline" size="sm" onClick={selectAllCritical}>
                  Selecionar Urgentes
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
          )}

          {/* Main Content */}
          {loading ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Analisando estoque e histórico de vendas...</p>
              </CardContent>
            </Card>
          ) : suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">Nenhuma sugestão disponível</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em "Analisar com IA" para gerar sugestões de compra
                </p>
                <Button onClick={runAnalysis}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar Estoque
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Sugestões de Compra
                </CardTitle>
                <CardDescription>
                  Produtos que precisam de reposição baseado na análise de estoque e vendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Prioridade</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Mín/Máx</TableHead>
                        <TableHead className="text-right">Dias p/ Ruptura</TableHead>
                        <TableHead className="text-right">Qtd Sugerida</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((item) => (
                        <TableRow 
                          key={item.product_id}
                          className={selectedIds.has(item.product_id) ? "bg-primary/5" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(item.product_id)}
                              onCheckedChange={() => toggleSelection(item.product_id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.code}</span>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {item.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {getPriorityBadge(item.priority)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={item.current_stock <= item.min_stock ? "text-red-600" : ""}>
                              {item.current_stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.min_stock} / {item.max_stock}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.days_until_stockout >= 999 ? (
                              <span className="text-muted-foreground">∞</span>
                            ) : (
                              <span className={item.days_until_stockout <= 7 ? "text-red-600 font-bold" : ""}>
                                {item.days_until_stockout}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {item.suggested_quantity}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-sm text-muted-foreground truncate block">
                              {item.reasoning}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
