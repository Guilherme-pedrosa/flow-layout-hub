import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Package, AlertTriangle, TrendingUp, TrendingDown, 
  CheckCircle, XCircle, Loader2, RefreshCw, ArrowUpRight, ArrowDownRight,
  RotateCcw, PackageOpen, Activity
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface MovementData {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
  products: {
    name: string;
    sku: string | null;
  } | null;
}

interface MovementAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovementAnalysisModal({ open, onOpenChange }: MovementAnalysisModalProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<MovementData[]>([]);

  useEffect(() => {
    if (open && currentCompany?.id) {
      loadData();
    }
  }, [open, currentCompany?.id]);

  const loadData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    
    try {
      // Carregar últimos 30 dias
      const thirtyDaysAgo = subDays(new Date(), 30);

      const { data } = await supabase
        .from('stock_movements')
        .select(`
          id, product_id, type, quantity, unit_cost, total_cost, created_at,
          products(name, sku)
        `)
        .eq('company_id', currentCompany.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      setMovements(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    // Separar por tipo
    const entries = movements.filter(m => m.type === 'entrada' || m.type === 'compra');
    const exits = movements.filter(m => m.type === 'saida' || m.type === 'venda');
    const adjustments = movements.filter(m => m.type === 'ajuste');
    const transfers = movements.filter(m => m.movement_type === 'transferencia');

    // Totais
    const totalEntries = entries.reduce((sum, m) => sum + m.quantity, 0);
    const totalExits = exits.reduce((sum, m) => sum + m.quantity, 0);
    const totalAdjustments = adjustments.reduce((sum, m) => sum + m.quantity, 0);

    // Valores
    const valueEntries = entries.reduce((sum, m) => sum + (m.total_cost || 0), 0);
    const valueExits = exits.reduce((sum, m) => sum + (m.total_cost || 0), 0);

    // Giro de estoque (entradas + saídas / 2)
    const turnoverRate = movements.length > 0 ? ((totalEntries + totalExits) / 2) / 30 : 0;

    // Produtos mais movimentados
    const productMovements: Record<string, { 
      name: string; 
      sku: string | null;
      entries: number; 
      exits: number; 
      adjustments: number;
      valueIn: number;
      valueOut: number;
    }> = {};

    movements.forEach(m => {
      const key = m.product_id;
      if (!productMovements[key]) {
        productMovements[key] = {
          name: m.products?.name || 'Produto desconhecido',
          sku: m.products?.sku || null,
          entries: 0,
          exits: 0,
          adjustments: 0,
          valueIn: 0,
          valueOut: 0,
        };
      }
      
      if (m.type === 'entrada' || m.type === 'compra') {
        productMovements[key].entries += m.quantity;
        productMovements[key].valueIn += m.total_cost || 0;
      } else if (m.type === 'saida' || m.type === 'venda') {
        productMovements[key].exits += m.quantity;
        productMovements[key].valueOut += m.total_cost || 0;
      } else if (m.type === 'ajuste') {
        productMovements[key].adjustments += m.quantity;
      }
    });

    const topProducts = Object.entries(productMovements)
      .map(([id, data]) => ({ id, ...data, total: data.entries + data.exits }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Produtos com muitos ajustes (possível problema de controle)
    const productsWithManyAdjustments = Object.entries(productMovements)
      .filter(([_, data]) => Math.abs(data.adjustments) > 5)
      .map(([id, data]) => ({ id, ...data }));

    // Média diária
    const avgDailyMovements = movements.length / 30;

    // Dias da semana com mais movimento
    const byDayOfWeek: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    movements.forEach(m => {
      const day = parseISO(m.created_at).getDay();
      byDayOfWeek[day]++;
    });

    const peakDay = Object.entries(byDayOfWeek).reduce((a, b) => 
      Number(b[1]) > Number(a[1]) ? b : a
    );

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    return {
      totalMovements: movements.length,
      entries,
      exits,
      adjustments,
      totalEntries,
      totalExits,
      totalAdjustments,
      valueEntries,
      valueExits,
      turnoverRate,
      topProducts,
      productsWithManyAdjustments,
      avgDailyMovements,
      peakDay: dayNames[Number(peakDay[0])],
      peakDayCount: peakDay[1],
    };
  }, [movements]);

  // Gerar recomendações
  const recommendations = useMemo(() => {
    const recs: { type: 'critical' | 'warning' | 'info'; message: string }[] = [];
    
    if (analysis.productsWithManyAdjustments.length > 0) {
      recs.push({
        type: 'warning',
        message: `${analysis.productsWithManyAdjustments.length} produto(s) com muitos ajustes de estoque. Isso pode indicar problemas de controle, divergências ou perdas. Investigue as causas.`
      });
    }
    
    if (analysis.totalExits > analysis.totalEntries * 1.5) {
      recs.push({
        type: 'warning',
        message: `Saídas (${analysis.totalExits} un.) superam significativamente as entradas (${analysis.totalEntries} un.). Monitore níveis de estoque para evitar rupturas.`
      });
    }
    
    if (analysis.turnoverRate < 0.5) {
      recs.push({
        type: 'info',
        message: `Giro de estoque baixo (${analysis.turnoverRate.toFixed(1)} mov./dia). Considere revisar mix de produtos ou ações promocionais.`
      });
    }
    
    if (analysis.avgDailyMovements > 50) {
      recs.push({
        type: 'info',
        message: `Alta atividade de estoque (${analysis.avgDailyMovements.toFixed(0)} mov./dia). Pico em ${analysis.peakDay}. Considere otimizar processos nos dias de maior movimento.`
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        type: 'info',
        message: 'Movimentação de estoque dentro do esperado. Continue monitorando para identificar tendências.'
      });
    }
    
    return recs;
  }, [analysis]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise de Movimentações de Estoque
          </DialogTitle>
          <DialogDescription>
            Relatório de giro, padrões e recomendações dos últimos 30 dias
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Entradas</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">{analysis.totalEntries}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(analysis.valueEntries)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-muted-foreground">Saídas</span>
                    </div>
                    <p className="text-xl font-bold text-red-600">{analysis.totalExits}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(analysis.valueExits)}</p>
                  </CardContent>
                </Card>

                <Card className={analysis.totalAdjustments !== 0 ? 'border-yellow-500 bg-yellow-500/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className={`h-4 w-4 ${analysis.totalAdjustments !== 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                      <span className="text-xs text-muted-foreground">Ajustes</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.totalAdjustments !== 0 ? 'text-yellow-600' : ''}`}>
                      {analysis.totalAdjustments > 0 ? '+' : ''}{analysis.totalAdjustments}
                    </p>
                    <p className="text-xs text-muted-foreground">{analysis.adjustments.length} movimentação(ões)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Giro Diário</span>
                    </div>
                    <p className="text-xl font-bold">{analysis.avgDailyMovements.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">mov./dia</p>
                  </CardContent>
                </Card>
              </div>

              {/* Estatísticas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Estatísticas do Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Movimentações</p>
                      <p className="text-lg font-bold">{analysis.totalMovements}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Entradas</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(analysis.valueEntries)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Saídas</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(analysis.valueExits)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pico de Atividade</p>
                      <p className="text-lg font-bold">{analysis.peakDay}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recomendações da IA */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Recomendações da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-2 p-3 rounded-lg ${
                        rec.type === 'critical' ? 'bg-destructive/10 text-destructive' :
                        rec.type === 'warning' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
                        'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {rec.type === 'critical' ? <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> :
                       rec.type === 'warning' ? <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> :
                       <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      <span className="text-sm">{rec.message}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Produtos Mais Movimentados */}
              {analysis.topProducts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Produtos Mais Movimentados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Entradas</TableHead>
                          <TableHead className="text-center">Saídas</TableHead>
                          <TableHead className="text-center">Ajustes</TableHead>
                          <TableHead className="text-right">Total Mov.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.topProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.sku && (
                                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-green-600">+{product.entries}</TableCell>
                            <TableCell className="text-center text-red-600">-{product.exits}</TableCell>
                            <TableCell className="text-center">
                              {product.adjustments !== 0 ? (
                                <span className={product.adjustments > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {product.adjustments > 0 ? '+' : ''}{product.adjustments}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold">{product.total}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Produtos com Muitos Ajustes */}
              {analysis.productsWithManyAdjustments.length > 0 && (
                <Card className="border-yellow-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Produtos com Muitos Ajustes - Investigar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Ajustes</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.productsWithManyAdjustments.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-center">
                              <span className={product.adjustments > 0 ? 'text-green-600' : 'text-red-600'}>
                                {product.adjustments > 0 ? '+' : ''}{product.adjustments}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                Verificar
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
