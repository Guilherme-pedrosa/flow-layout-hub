import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, TrendingDown, AlertTriangle, Clock, DollarSign, Calendar, 
  CheckCircle, XCircle, Loader2, RefreshCw, ArrowUpRight, Banknote,
  AlertCircle, PiggyBank, TrendingUp, Users, PhoneCall
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, differenceInDays, startOfDay, isBefore, isToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface ReceivableData {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  clientes: {
    razao_social: string | null;
    nome_fantasia: string | null;
  } | null;
}

interface ReceivablesAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceivablesAnalysisModal({ open, onOpenChange }: ReceivablesAnalysisModalProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState<ReceivableData[]>([]);

  useEffect(() => {
    if (open && currentCompany?.id) {
      loadData();
    }
  }, [open, currentCompany?.id]);

  const loadData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    
    try {
      const { data } = await supabase
        .from('accounts_receivable')
        .select(`
          id, description, amount, due_date, is_paid, paid_at,
          clientes(razao_social, nome_fantasia)
        `)
        .eq('company_id', currentCompany.id)
        .order('due_date', { ascending: true });

      setReceivables(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    const today = startOfDay(new Date());
    const pending = receivables.filter(r => !r.is_paid);
    const paid = receivables.filter(r => r.is_paid);
    
    // Categorizar por status
    const overdue = pending.filter(r => {
      const dueDate = startOfDay(parseISO(r.due_date));
      return isBefore(dueDate, today) && !isToday(dueDate);
    });
    
    const dueToday = pending.filter(r => isToday(parseISO(r.due_date)));
    
    const upcoming7Days = pending.filter(r => {
      const dueDate = startOfDay(parseISO(r.due_date));
      const diff = differenceInDays(dueDate, today);
      return diff > 0 && diff <= 7;
    });
    
    const upcoming30Days = pending.filter(r => {
      const dueDate = startOfDay(parseISO(r.due_date));
      const diff = differenceInDays(dueDate, today);
      return diff > 7 && diff <= 30;
    });

    // Totais
    const totalOverdue = overdue.reduce((sum, r) => sum + r.amount, 0);
    const totalToday = dueToday.reduce((sum, r) => sum + r.amount, 0);
    const total7Days = upcoming7Days.reduce((sum, r) => sum + r.amount, 0);
    const total30Days = upcoming30Days.reduce((sum, r) => sum + r.amount, 0);
    const totalPending = pending.reduce((sum, r) => sum + r.amount, 0);
    const totalPaid = paid.reduce((sum, r) => sum + r.amount, 0);

    // Média de dias de atraso
    const avgDaysOverdue = overdue.length > 0 
      ? overdue.reduce((sum, r) => sum + differenceInDays(today, parseISO(r.due_date)), 0) / overdue.length 
      : 0;

    // Taxa de inadimplência
    const defaultRate = totalPending > 0 ? (totalOverdue / (totalPending + totalPaid)) * 100 : 0;

    // Projeção de perda (estimativa baseada em inadimplência histórica)
    const projectedLoss = totalOverdue * 0.15; // 15% de perda estimada

    // Agrupar por cliente
    const byClient = pending.reduce((acc, r) => {
      const name = r.clientes?.nome_fantasia || r.clientes?.razao_social || 'Sem cliente';
      if (!acc[name]) acc[name] = { total: 0, count: 0, overdue: 0, daysOverdue: 0 };
      acc[name].total += r.amount;
      acc[name].count++;
      const overdueItem = overdue.find(o => o.id === r.id);
      if (overdueItem) {
        acc[name].overdue += r.amount;
        acc[name].daysOverdue = Math.max(acc[name].daysOverdue, differenceInDays(today, parseISO(r.due_date)));
      }
      return acc;
    }, {} as Record<string, { total: number; count: number; overdue: number; daysOverdue: number }>);

    const topClients = Object.entries(byClient)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.overdue - a.overdue || b.total - a.total)
      .slice(0, 5);

    // Clientes inadimplentes (precisam de ação de cobrança)
    const defaultingClients = Object.entries(byClient)
      .filter(([_, data]) => data.overdue > 0)
      .length;

    return {
      overdue,
      dueToday,
      upcoming7Days,
      upcoming30Days,
      totalOverdue,
      totalToday,
      total7Days,
      total30Days,
      totalPending,
      totalPaid,
      avgDaysOverdue,
      defaultRate,
      projectedLoss,
      topClients,
      defaultingClients,
      pendingCount: pending.length,
    };
  }, [receivables]);

  // Gerar recomendações
  const recommendations = useMemo(() => {
    const recs: { type: 'critical' | 'warning' | 'info'; message: string }[] = [];
    
    if (analysis.totalOverdue > 0) {
      recs.push({
        type: 'critical',
        message: `${formatCurrency(analysis.totalOverdue)} em títulos vencidos com ${analysis.overdue.length} cliente(s). Média de ${analysis.avgDaysOverdue.toFixed(0)} dias de atraso. Acione cobrança imediatamente.`
      });
    }
    
    if (analysis.defaultingClients > 0) {
      recs.push({
        type: 'warning',
        message: `${analysis.defaultingClients} cliente(s) inadimplente(s). Considere ações de cobrança escalonadas: lembrete → notificação → negativação.`
      });
    }
    
    if (analysis.projectedLoss > 1000) {
      recs.push({
        type: 'warning',
        message: `Perda projetada de ${formatCurrency(analysis.projectedLoss)} com inadimplência. Avalie provisão para devedores duvidosos.`
      });
    }
    
    if (analysis.totalToday > 0) {
      recs.push({
        type: 'info',
        message: `${analysis.dueToday.length} título(s) vencem hoje totalizando ${formatCurrency(analysis.totalToday)}. Monitore recebimentos.`
      });
    }
    
    if (analysis.defaultRate > 10) {
      recs.push({
        type: 'critical',
        message: `Taxa de inadimplência de ${analysis.defaultRate.toFixed(1)}% está acima do saudável (até 5%). Revise política de crédito e cobrança.`
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        type: 'info',
        message: 'Situação de recebíveis saudável. Continue monitorando vencimentos e mantendo comunicação ativa com clientes.'
      });
    }
    
    return recs;
  }, [analysis]);

  const getRiskBadge = (daysOverdue: number) => {
    if (daysOverdue > 60) return <Badge variant="destructive">Crítico</Badge>;
    if (daysOverdue > 30) return <Badge className="bg-orange-500">Alto Risco</Badge>;
    if (daysOverdue > 15) return <Badge className="bg-yellow-500">Médio Risco</Badge>;
    if (daysOverdue > 0) return <Badge variant="secondary">Atenção</Badge>;
    return <Badge className="bg-green-500">OK</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise Financeira - Contas a Receber
          </DialogTitle>
          <DialogDescription>
            Relatório de inadimplência, previsão de recebimentos e ações de cobrança
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
                <Card className={analysis.totalOverdue > 0 ? 'border-destructive bg-destructive/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`h-4 w-4 ${analysis.totalOverdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <span className="text-xs text-muted-foreground">Vencido</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.totalOverdue > 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(analysis.totalOverdue)}
                    </p>
                    <p className="text-xs text-muted-foreground">{analysis.overdue.length} título(s)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Próx. 7 dias</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(analysis.total7Days)}</p>
                    <p className="text-xs text-muted-foreground">{analysis.upcoming7Days.length} título(s)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Total Pendente</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(analysis.totalPending)}</p>
                    <p className="text-xs text-muted-foreground">{analysis.pendingCount} título(s)</p>
                  </CardContent>
                </Card>

                <Card className={analysis.defaultRate > 10 ? 'border-orange-500 bg-orange-500/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className={`h-4 w-4 ${analysis.defaultRate > 10 ? 'text-orange-600' : 'text-muted-foreground'}`} />
                      <span className="text-xs text-muted-foreground">Taxa Inadimplência</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.defaultRate > 10 ? 'text-orange-600' : ''}`}>
                      {analysis.defaultRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">{analysis.defaultingClients} cliente(s)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Impacto Financeiro */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    Impacto Financeiro da Inadimplência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total em Atraso</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(analysis.totalOverdue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média Dias Atraso</p>
                      <p className="text-lg font-bold">{analysis.avgDaysOverdue.toFixed(0)} dias</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Perda Projetada</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(analysis.projectedLoss)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clientes Inadimplentes</p>
                      <p className="text-lg font-bold">{analysis.defaultingClients}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Taxa de Inadimplência</span>
                      <span className={analysis.defaultRate > 5 ? 'text-destructive' : 'text-green-600'}>
                        {analysis.defaultRate.toFixed(1)}% (ideal: até 5%)
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(analysis.defaultRate * 5, 100)} 
                      className={`h-2 ${analysis.defaultRate > 5 ? '[&>div]:bg-destructive' : ''}`}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Recomendações da IA */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Recomendações de Cobrança
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
                      {rec.type === 'critical' ? <PhoneCall className="h-4 w-4 mt-0.5 flex-shrink-0" /> :
                       rec.type === 'warning' ? <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> :
                       <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      <span className="text-sm">{rec.message}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Clientes com Maior Exposição */}
              {analysis.topClients.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Clientes com Maior Exposição
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-center">Títulos</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Vencido</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.topClients.map((client) => (
                          <TableRow key={client.name}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell className="text-center">{client.count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(client.total)}</TableCell>
                            <TableCell className="text-right">
                              {client.overdue > 0 ? (
                                <span className="text-destructive font-medium">
                                  {formatCurrency(client.overdue)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {getRiskBadge(client.daysOverdue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Títulos Vencidos */}
              {analysis.overdue.length > 0 && (
                <Card className="border-destructive">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Títulos Vencidos - Ação Imediata ({analysis.overdue.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Risco</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.overdue.slice(0, 10).map((r) => {
                          const daysOverdue = differenceInDays(new Date(), parseISO(r.due_date));
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {r.description || 'Sem descrição'}
                              </TableCell>
                              <TableCell>
                                {r.clientes?.nome_fantasia || r.clientes?.razao_social || '-'}
                              </TableCell>
                              <TableCell>
                                {format(parseISO(r.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                                <span className="text-xs text-destructive ml-1">
                                  ({daysOverdue}d)
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(r.amount)}
                              </TableCell>
                              <TableCell className="text-center">
                                {getRiskBadge(daysOverdue)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
