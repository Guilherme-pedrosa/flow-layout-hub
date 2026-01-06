import { useState, useMemo, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertTriangle, Package, TrendingDown, DollarSign, Boxes, ChevronRight, FileBarChart } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { StockAnalysisModal } from "./StockAnalysisModal";

interface StockMetrics {
  stagnantCount: number;
  stagnantValue: number;
  monthlyOpportunityCost: number;
  avgDaysStopped: number;
}

export function SaldoEstoqueList() {
  const { products, isLoading } = useProducts();
  const { currentCompany } = useCompany();
  const [search, setSearch] = useState("");
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [stockMetrics, setStockMetrics] = useState<StockMetrics | null>(null);

  const activeProducts = products.filter((p) => p.is_active);
  
  const filteredProducts = activeProducts.filter(
    (p) =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate basic KPIs
  const totalProducts = activeProducts.length;
  const lowStockProducts = activeProducts.filter(
    (p) => (p.quantity ?? 0) <= (p.min_stock ?? 0)
  ).length;
  const totalValue = activeProducts.reduce(
    (acc, p) => acc + (p.quantity ?? 0) * (p.purchase_price ?? 0),
    0
  );
  const totalQuantity = activeProducts.reduce(
    (acc, p) => acc + (p.quantity ?? 0),
    0
  );

  // Fetch stagnant stock metrics
  useEffect(() => {
    if (!currentCompany?.id) return;

    const fetchStagnantMetrics = async () => {
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Get products with stock
        const { data: productsWithStock } = await supabase
          .from("products")
          .select("id, quantity, purchase_price")
          .eq("company_id", currentCompany.id)
          .eq("is_active", true)
          .gt("quantity", 0);

        if (!productsWithStock?.length) {
          setStockMetrics(null);
          return;
        }

        // Get movements in last 90 days
        const { data: recentMovements } = await supabase
          .from("stock_movements")
          .select("product_id, created_at")
          .eq("company_id", currentCompany.id)
          .gte("created_at", ninetyDaysAgo.toISOString())
          .ilike("type", "%SAIDA%");

        const productsWithRecentMovement = new Set(
          (recentMovements || []).map(m => m.product_id)
        );

        const stagnantProducts = productsWithStock.filter(
          p => !productsWithRecentMovement.has(p.id)
        );

        const stagnantValue = stagnantProducts.reduce(
          (sum, p) => sum + (p.quantity || 0) * (p.purchase_price || 0),
          0
        );

        // Monthly opportunity cost (12% annual rate)
        const monthlyOpportunityCost = (stagnantValue * 0.12) / 12;

        setStockMetrics({
          stagnantCount: stagnantProducts.length,
          stagnantValue,
          monthlyOpportunityCost,
          avgDaysStopped: 90, // Min threshold
        });
      } catch (error) {
        console.error("Error fetching stagnant metrics:", error);
      }
    };

    fetchStagnantMetrics();
  }, [currentCompany?.id, products]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stagnant Stock Alert Banner */}
      {stockMetrics && stockMetrics.stagnantCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border bg-amber-500/10 border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <FileBarChart className="h-3 w-3" />
                Especialista
              </span>
              <span className="text-sm font-medium">
                Estoque parado em {stockMetrics.stagnantCount} produtos
              </span>
            </div>
            <p className="text-sm text-foreground/90">
              {stockMetrics.stagnantCount} produtos sem giro nos últimos 90 dias, com{" "}
              <strong className="text-destructive">{formatCurrency(stockMetrics.stagnantValue)}</strong>{" "}
              empatados em estoque sem movimentação.
              {stockMetrics.monthlyOpportunityCost > 0 && (
                <span className="text-muted-foreground">
                  {" "}Custo de oportunidade: {formatCurrency(stockMetrics.monthlyOpportunityCost)}/mês.
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 gap-1"
            onClick={() => setAnalysisModalOpen(true)}
          >
            Ver relatório completo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Boxes className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Produtos</p>
                <p className="text-xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estoque Baixo</p>
                <p className="text-xl font-bold text-destructive">{lowStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor em Estoque</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Qtd. Total</p>
                <p className="text-xl font-bold">{totalQuantity.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por código ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Products Table */}
      <Card className="border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Est. Mínimo</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Valor Unit.</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isLowStock = (product.quantity ?? 0) <= (product.min_stock ?? 0);
                const itemTotalValue = (product.quantity ?? 0) * (product.purchase_price ?? 0);

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{product.description}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell className="text-right">{product.min_stock ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <span className={isLowStock ? "text-destructive font-bold" : "font-medium"}>
                        {product.quantity ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.purchase_price ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(itemTotalValue)}
                    </TableCell>
                    <TableCell>
                      {isLowStock ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Stock Analysis Modal */}
      <StockAnalysisModal
        open={analysisModalOpen}
        onOpenChange={setAnalysisModalOpen}
      />
    </div>
  );
}
