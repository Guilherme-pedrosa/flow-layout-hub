import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, AlertTriangle, Package, TrendingDown, DollarSign, Boxes, Sparkles, RefreshCw, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["hsl(217, 100%, 50%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(271, 91%, 65%)", "hsl(0, 84%, 60%)"];

export function SaldoEstoqueList() {
  const { products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  
  // AI Insight state
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);

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

  // Chart data - Top 5 products by value
  const topProductsByValue = [...activeProducts]
    .map((p) => ({
      name: p.description.slice(0, 20) + (p.description.length > 20 ? '...' : ''),
      value: (p.quantity ?? 0) * (p.purchase_price ?? 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Pie chart data - Stock situation
  const stockSituationData = [
    { name: "Estoque Normal", value: activeProducts.filter(p => (p.quantity ?? 0) > (p.min_stock ?? 0)).length },
    { name: "Estoque Baixo", value: lowStockProducts },
    { name: "Sem Estoque", value: activeProducts.filter(p => (p.quantity ?? 0) === 0).length },
  ].filter(d => d.value > 0);

  // Load AI insight
  useEffect(() => {
    if (activeProducts.length > 0 && !aiDismissed) {
      loadAiInsight();
    }
  }, [activeProducts.length]);

  const loadAiInsight = async () => {
    if (activeProducts.length === 0) return;
    
    setAiLoading(true);
    try {
      const { data: credData } = await supabase
        .from('inter_credentials')
        .select('company_id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const companyId = credData?.company_id;
      
      const prompt = `Analise este estoque e dê UM insight curto e acionável (máx 120 caracteres):
- Total de produtos: ${totalProducts}
- Produtos com estoque baixo: ${lowStockProducts}
- Valor total em estoque: R$ ${totalValue.toFixed(2)}
- Quantidade total: ${totalQuantity} unidades
Responda APENAS com o texto do insight, sem JSON.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            companyId,
          }),
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar insight');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let textBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch {
              // Incomplete JSON
            }
          }
        }
      }

      setAiInsight(fullText.trim().slice(0, 200));
    } catch (error) {
      console.error('Error loading AI insight:', error);
      setAiInsight('Monitore produtos com estoque baixo para evitar rupturas de venda.');
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-muted/30 -mx-6 -mb-6 px-6 pb-6 pt-2 rounded-lg">
      {/* AI Banner */}
      {!aiDismissed && (
        <div className="ai-banner">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {aiLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Analisando estoque...</span>
              </div>
            ) : (
              <p className="text-sm text-foreground">{aiInsight || 'Clique em atualizar para gerar insights sobre seu estoque.'}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => loadAiInsight()}
            disabled={aiLoading}
          >
            <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setAiDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* KPI Cards - Grid horizontal 4 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-enterprise">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Boxes className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Produtos</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estoque Baixo</p>
                <p className="text-2xl font-bold text-destructive">{lowStockProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor em Estoque</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-enterprise">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-info/10">
                <Package className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qtd. Total</p>
                <p className="text-2xl font-bold">{totalQuantity.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top 5 by Value */}
        <Card className="card-enterprise">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top 5 Produtos por Valor</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsByValue.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topProductsByValue} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" fill="hsl(217, 100%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Stock Situation */}
        <Card className="card-enterprise">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Situação do Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            {stockSituationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stockSituationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {stockSituationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
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
      <Card className="card-enterprise overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque Mínimo</TableHead>
              <TableHead className="text-right">Saldo Atual</TableHead>
              <TableHead className="text-right">Valor Unitário</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isLowStock = (product.quantity ?? 0) <= (product.min_stock ?? 0);
                const itemTotalValue = (product.quantity ?? 0) * (product.purchase_price ?? 0);

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.code}</TableCell>
                    <TableCell>{product.description}</TableCell>
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
                        <Badge variant="outline" className="text-green-600 border-green-600">
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
