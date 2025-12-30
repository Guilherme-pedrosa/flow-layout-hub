import { useState, useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertTriangle, Package, TrendingDown, DollarSign, Boxes } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { AIBanner, type AIInsight } from "@/components/shared/AIBanner";

export function SaldoEstoqueList() {
  const { products, isLoading } = useProducts();
  const [search, setSearch] = useState("");

  const activeProducts = products.filter((p) => p.is_active);
  
  const filteredProducts = activeProducts.filter(
    (p) =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate KPIs
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

  // AI Insights
  const aiInsights: AIInsight[] = useMemo(() => {
    const insights: AIInsight[] = [];
    
    if (lowStockProducts > 0) {
      insights.push({
        id: 'low-stock',
        message: `${lowStockProducts} produto${lowStockProducts > 1 ? 's' : ''} com estoque baixo. Considere reabastecer para evitar rupturas.`,
        type: 'warning'
      });
    } else if (totalProducts > 0) {
      insights.push({
        id: 'stock-ok',
        message: `Estoque saudável: ${totalProducts} produtos com valor total de ${formatCurrency(totalValue)}.`,
        type: 'success'
      });
    }
    
    return insights;
  }, [lowStockProducts, totalProducts, totalValue]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Banner */}
      {aiInsights.length > 0 && (
        <AIBanner insights={aiInsights} />
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
    </div>
  );
}
