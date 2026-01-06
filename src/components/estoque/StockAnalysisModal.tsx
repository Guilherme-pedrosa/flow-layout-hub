import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Clock,
  Package,
  BarChart3,
  ArrowDownRight,
  Calendar,
  Percent,
  Building2,
  Download,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface StockAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductWithMovements {
  id: string;
  code: string;
  description: string;
  quantity: number;
  purchase_price: number;
  sale_price: number;
  stockValue: number;
  lastMovementDate: Date | null;
  daysSinceLastMovement: number;
  avgMonthlyOutput: number;
  projectedDaysToSell: number;
  turnoverRate: number;
}

export function StockAnalysisModal({ open, onOpenChange }: StockAnalysisModalProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductWithMovements[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar produtos ativos com estoque
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, code, description, quantity, purchase_price, sale_price")
          .eq("company_id", currentCompany.id)
          .eq("is_active", true)
          .gt("quantity", 0);

        if (productsError) throw productsError;

        // Buscar movimentações dos últimos 365 dias
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const { data: movementsData, error: movementsError } = await supabase
          .from("stock_movements")
          .select("product_id, type, quantity, created_at")
          .eq("company_id", currentCompany.id)
          .gte("created_at", oneYearAgo.toISOString());

        if (movementsError) throw movementsError;

        setMovements(movementsData || []);

        // Processar dados
        const now = new Date();
        const processedProducts: ProductWithMovements[] = (productsData || []).map((product) => {
          const productMovements = (movementsData || []).filter(
            (m) => m.product_id === product.id
          );

          // Última movimentação de saída
          const outputMovements = productMovements
            .filter((m) => m.type.includes("SAIDA"))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          const lastMovementDate = outputMovements.length > 0
            ? new Date(outputMovements[0].created_at)
            : null;

          const daysSinceLastMovement = lastMovementDate
            ? Math.floor((now.getTime() - lastMovementDate.getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          // Calcular saída média mensal (últimos 12 meses)
          const totalOutput = outputMovements.reduce((sum, m) => sum + m.quantity, 0);
          const avgMonthlyOutput = totalOutput / 12;

          // Projeção de dias para vender todo o estoque
          const projectedDaysToSell = avgMonthlyOutput > 0
            ? Math.round((product.quantity / avgMonthlyOutput) * 30)
            : 9999;

          // Taxa de giro (vezes que o estoque gira por ano)
          const turnoverRate = avgMonthlyOutput > 0 && product.quantity > 0
            ? (avgMonthlyOutput * 12) / product.quantity
            : 0;

          return {
            id: product.id,
            code: product.code,
            description: product.description,
            quantity: product.quantity || 0,
            purchase_price: product.purchase_price || 0,
            sale_price: product.sale_price || 0,
            stockValue: (product.quantity || 0) * (product.purchase_price || 0),
            lastMovementDate,
            daysSinceLastMovement,
            avgMonthlyOutput,
            projectedDaysToSell,
            turnoverRate,
          };
        });

        setProducts(processedProducts);
      } catch (error) {
        console.error("Erro ao carregar análise de estoque:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, currentCompany?.id]);

  // Produtos sem giro (> 90 dias sem movimentação)
  const stagnantProducts = useMemo(() =>
    products.filter((p) => p.daysSinceLastMovement > 90)
      .sort((a, b) => b.stockValue - a.stockValue),
    [products]
  );

  // Métricas gerais
  const metrics = useMemo(() => {
    const totalStockValue = products.reduce((sum, p) => sum + p.stockValue, 0);
    const stagnantValue = stagnantProducts.reduce((sum, p) => sum + p.stockValue, 0);
    const stagnantPercentage = totalStockValue > 0 ? (stagnantValue / totalStockValue) * 100 : 0;

    // Custo de oportunidade (considerando taxa SELIC ~12% ao ano)
    const annualOpportunityCostRate = 0.12;
    const monthlyCost = (stagnantValue * annualOpportunityCostRate) / 12;

    // Média de dias parado
    const avgDaysStopped = stagnantProducts.length > 0
      ? stagnantProducts.reduce((sum, p) => sum + p.daysSinceLastMovement, 0) / stagnantProducts.length
      : 0;

    // Projeção média de venda
    const avgProjectedDays = stagnantProducts.filter(p => p.projectedDaysToSell < 9999).length > 0
      ? stagnantProducts.filter(p => p.projectedDaysToSell < 9999)
          .reduce((sum, p) => sum + p.projectedDaysToSell, 0) /
        stagnantProducts.filter(p => p.projectedDaysToSell < 9999).length
      : 0;

    // Produtos que nunca venderam
    const neverSoldProducts = stagnantProducts.filter(p => p.avgMonthlyOutput === 0);
    const neverSoldValue = neverSoldProducts.reduce((sum, p) => sum + p.stockValue, 0);

    // Distribuição por faixa de tempo parado
    const distribution = {
      "90-180 dias": stagnantProducts.filter(p => p.daysSinceLastMovement >= 90 && p.daysSinceLastMovement < 180),
      "180-365 dias": stagnantProducts.filter(p => p.daysSinceLastMovement >= 180 && p.daysSinceLastMovement < 365),
      "> 1 ano": stagnantProducts.filter(p => p.daysSinceLastMovement >= 365),
    };

    return {
      totalStockValue,
      stagnantValue,
      stagnantPercentage,
      stagnantCount: stagnantProducts.length,
      totalProducts: products.length,
      monthlyCost,
      annualCost: monthlyCost * 12,
      avgDaysStopped,
      avgProjectedDays,
      neverSoldCount: neverSoldProducts.length,
      neverSoldValue,
      distribution,
    };
  }, [products, stagnantProducts]);

  // Classificação de risco
  const getRiskLevel = (product: ProductWithMovements) => {
    if (product.avgMonthlyOutput === 0) return { level: "critical", label: "Sem Giro", color: "destructive" };
    if (product.projectedDaysToSell > 365) return { level: "high", label: "Alto Risco", color: "destructive" };
    if (product.projectedDaysToSell > 180) return { level: "medium", label: "Risco Médio", color: "warning" };
    return { level: "low", label: "Baixo Risco", color: "secondary" };
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Análise de Estoque Parado
          </DialogTitle>
          <DialogDescription>
            Relatório detalhado de impacto financeiro e projeções
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Analisando dados...</span>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-1">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-destructive" />
                      <span className="text-xs text-muted-foreground">Capital Parado</span>
                    </div>
                    <p className="text-xl font-bold text-destructive">
                      {formatCurrency(metrics.stagnantValue)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics.stagnantPercentage.toFixed(1)}% do estoque total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-muted-foreground">Custo Mensal</span>
                    </div>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(metrics.monthlyCost)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(metrics.annualCost)}/ano em oportunidade
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Média Parado</span>
                    </div>
                    <p className="text-xl font-bold text-blue-600">
                      {Math.round(metrics.avgDaysStopped)} dias
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics.stagnantCount} produtos sem giro
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-purple-500/30 bg-purple-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-muted-foreground">Previsão Venda</span>
                    </div>
                    <p className="text-xl font-bold text-purple-600">
                      {metrics.avgProjectedDays > 0 ? `${Math.round(metrics.avgProjectedDays)} dias` : "Indeterminado"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      média para escoar estoque
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Análise de Impacto */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Impacto na Saúde Financeira
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Capital de Giro Comprometido</span>
                        <span className="font-semibold text-destructive">
                          {metrics.stagnantPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(metrics.stagnantPercentage, 100)} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(metrics.stagnantValue)} de {formatCurrency(metrics.totalStockValue)} em estoque
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Produtos sem giro histórico</p>
                          <p className="text-xs text-muted-foreground">
                            {metrics.neverSoldCount} produtos ({formatCurrency(metrics.neverSoldValue)}) nunca tiveram saída registrada
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Distribuição por Tempo */}
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">Distribuição por Tempo Parado</p>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(metrics.distribution).map(([range, items]) => (
                        <div key={range} className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-2xl font-bold">{items.length}</p>
                          <p className="text-xs text-muted-foreground">{range}</p>
                          <p className="text-xs font-medium mt-1">
                            {formatCurrency(items.reduce((sum, p) => sum + p.stockValue, 0))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Produtos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Detalhamento por Produto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor Parado</TableHead>
                        <TableHead className="text-right">Dias Parado</TableHead>
                        <TableHead className="text-right">Saída/Mês</TableHead>
                        <TableHead className="text-right">Prev. Saída</TableHead>
                        <TableHead>Risco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stagnantProducts.slice(0, 50).map((product) => {
                        const risk = getRiskLevel(product);
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-mono text-xs">{product.code}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-sm">
                              {product.description}
                            </TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                            <TableCell className="text-right font-medium text-destructive">
                              {formatCurrency(product.stockValue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {product.daysSinceLastMovement > 999 ? "∞" : product.daysSinceLastMovement}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {product.avgMonthlyOutput.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right">
                              {product.projectedDaysToSell > 9000
                                ? "—"
                                : `${product.projectedDaysToSell} dias`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={risk.color as any} className="text-xs">
                                {risk.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {stagnantProducts.length > 50 && (
                    <p className="text-center text-xs text-muted-foreground py-3">
                      Mostrando 50 de {stagnantProducts.length} produtos
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recomendações */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Recomendações da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <ArrowDownRight className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Revisar política de compras</p>
                      <p className="text-xs text-muted-foreground">
                        {metrics.neverSoldCount} produtos nunca venderam. Considere devolver ao fornecedor ou criar promoções agressivas.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Percent className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Estratégia de descontos progressivos</p>
                      <p className="text-xs text-muted-foreground">
                        Aplique descontos de 20-50% para produtos parados há mais de 180 dias para liberar capital.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Potencial de recuperação</p>
                      <p className="text-xs text-muted-foreground">
                        Vendendo com 30% de desconto, você recuperaria {formatCurrency(metrics.stagnantValue * 0.7)} em capital de giro.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}