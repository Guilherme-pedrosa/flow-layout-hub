import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useCfoBot, PricingSuggestion, MarginAnalysis, CashFlowProjection } from '@/hooks/useCfoBot';
import { formatCurrency } from '@/lib/formatters';

export function CfoBotDashboard() {
  const { loading, analyzePricing, analyzeMargins, projectCashFlow } = useCfoBot();
  const [priceAnalysis, setPriceAnalysis] = useState<PricingSuggestion[] | null>(null);
  const [marginAnalysis, setMarginAnalysis] = useState<MarginAnalysis[] | null>(null);
  const [cashFlowProjection, setCashFlowProjection] = useState<CashFlowProjection[] | null>(null);
  const [activeTab, setActiveTab] = useState('pricing');

  const handleAnalyzePricing = async () => {
    const result = await analyzePricing();
    setPriceAnalysis(result);
  };

  const handleAnalyzeMargins = async () => {
    const result = await analyzeMargins();
    setMarginAnalysis(result);
  };

  const handleProjectCashFlow = async () => {
    const result = await projectCashFlow(30);
    setCashFlowProjection(result);
  };

  const totalInflows = cashFlowProjection?.reduce((sum, d) => sum + d.inflows, 0) || 0;
  const totalOutflows = cashFlowProjection?.reduce((sum, d) => sum + d.outflows, 0) || 0;
  const projectedBalance = totalInflows - totalOutflows;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">CFO-Bot</CardTitle>
              <CardDescription>Análises inteligentes de precificação e fluxo de caixa</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            IA Ativa
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Precificação
            </TabsTrigger>
            <TabsTrigger value="margins" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Margens
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Fluxo de Caixa
            </TabsTrigger>
          </TabsList>

          {/* Análise de Precificação */}
          <TabsContent value="pricing" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Produtos com margens inadequadas e sugestões de preço.
              </p>
              <Button onClick={handleAnalyzePricing} disabled={loading} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Analisar
              </Button>
            </div>

            {priceAnalysis && priceAnalysis.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {priceAnalysis.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="text-muted-foreground">
                          Atual: {formatCurrency(item.current_price)}
                        </span>
                        <span className="text-primary font-medium">
                          Sugerido: {formatCurrency(item.suggested_price)}
                        </span>
                        <Badge variant="outline" className={item.current_margin < 0 ? 'text-destructive' : item.current_margin < 20 ? 'text-amber-600' : 'text-emerald-600'}>
                          {item.current_margin.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    {item.current_margin < 0 ? <TrendingDown className="h-5 w-5 text-destructive" /> : item.current_margin < 20 ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <CheckCircle className="h-5 w-5 text-emerald-500" />}
                  </div>
                ))}
              </div>
            ) : priceAnalysis ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
                <p>Todos os produtos estão com margens adequadas!</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Clique em "Analisar" para ver sugestões.</p>
              </div>
            )}
          </TabsContent>

          {/* Análise de Margens */}
          <TabsContent value="margins" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Margens por categoria.</p>
              <Button onClick={handleAnalyzeMargins} disabled={loading} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Analisar
              </Button>
            </div>

            {marginAnalysis && marginAnalysis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marginAnalysis.map((item, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{item.category || 'Sem categoria'}</span>
                        <Badge variant="outline">{item.products_below_threshold + item.products_above_threshold} produtos</Badge>
                      </div>
                      <p className={`text-lg font-bold ${item.avg_margin < 0 ? 'text-destructive' : item.avg_margin < 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {item.avg_margin.toFixed(1)}% margem média
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Clique em "Analisar" para ver análise por categoria.</p>
              </div>
            )}
          </TabsContent>

          {/* Projeção de Fluxo de Caixa */}
          <TabsContent value="cashflow" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Projeção para 30 dias.</p>
              <Button onClick={handleProjectCashFlow} disabled={loading} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Projetar
              </Button>
            </div>

            {cashFlowProjection ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs text-muted-foreground">Entradas</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalInflows)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-destructive/10 border-destructive/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                        <span className="text-xs text-muted-foreground">Saídas</span>
                      </div>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(totalOutflows)}</p>
                    </CardContent>
                  </Card>
                  <Card className={projectedBalance >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs text-muted-foreground">Saldo</span>
                      </div>
                      <p className={`text-lg font-bold ${projectedBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(projectedBalance)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Clique em "Projetar" para ver a projeção.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
