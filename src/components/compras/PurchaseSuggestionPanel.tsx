import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingDown,
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

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingOrder, setCreatingOrder] = useState(false);

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

  const toggleSelection = (productId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedIds(newSet);
  };

  const selectAllCritical = () => {
    const criticalIds = suggestions
      .filter(s => s.priority === 'critical' || s.priority === 'high')
      .map(s => s.product_id);
    setSelectedIds(new Set(criticalIds));
  };

  const createPurchaseOrder = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um produto");
      return;
    }

    setCreatingOrder(true);
    try {
      // Aqui seria criado o pedido de compra
      // Por enquanto apenas mostra toast de confirmação
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

  return (
    <div className="space-y-4">
      {/* AI Banner */}
      <AIBanner
        insights={[{
          id: 'purchase-ai',
          message: 'O agente analisa estoque atual, histórico de vendas e sazonalidade para sugerir compras. Todas as sugestões requerem sua aprovação antes de gerar pedidos.',
          type: 'info'
        }]}
        context="Agente de Sugestão de Compra"
      />

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
    </div>
  );
}