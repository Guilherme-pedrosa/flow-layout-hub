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
  AlertCircle, PiggyBank, TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, differenceInDays, startOfDay, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface PayableData {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  is_paid: boolean;
  payment_status: string | null;
  supplier: {
    razao_social: string | null;
    nome_fantasia: string | null;
  } | null;
}

interface PayablesAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayablesAnalysisModal({ open, onOpenChange }: PayablesAnalysisModalProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState<PayableData[]>([]);
  const [bankBalance, setBankBalance] = useState<number>(0);

  useEffect(() => {
    if (open && currentCompany?.id) {
      loadData();
    }
  }, [open, currentCompany?.id]);

  const loadData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    
    try {
      // Carregar contas a pagar
      const { data: payablesData } = await supabase
        .from('payables')
        .select(`
          id, description, amount, due_date, is_paid, payment_status,
          supplier:pessoas!payables_supplier_id_fkey(razao_social, nome_fantasia)
        `)
        .eq('company_id', currentCompany.id)
        .eq('is_paid', false)
        .order('due_date', { ascending: true });

      // Carregar saldo bancário
      const { data: accountData } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);

      setPayables(payablesData || []);
      const totalBalance = (accountData || []).reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      setBankBalance(totalBalance);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    const today = startOfDay(new Date());
    
    // Categorizar por status
    const overdue = payables.filter(p => {
      const dueDate = startOfDay(parseISO(p.due_date));
      return isBefore(dueDate, today) && !isToday(dueDate);
    });
    
    const dueToday = payables.filter(p => isToday(parseISO(p.due_date)));
    
    const upcoming7Days = payables.filter(p => {
      const dueDate = startOfDay(parseISO(p.due_date));
      const diff = differenceInDays(dueDate, today);
      return diff > 0 && diff <= 7;
    });
    
    const upcoming30Days = payables.filter(p => {
      const dueDate = startOfDay(parseISO(p.due_date));
      const diff = differenceInDays(dueDate, today);
      return diff > 7 && diff <= 30;
    });

    // Totais
    const totalOverdue = overdue.reduce((sum, p) => sum + p.amount, 0);
    const totalToday = dueToday.reduce((sum, p) => sum + p.amount, 0);
    const total7Days = upcoming7Days.reduce((sum, p) => sum + p.amount, 0);
    const total30Days = upcoming30Days.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = payables.reduce((sum, p) => sum + p.amount, 0);

    // Média de dias de atraso
    const avgDaysOverdue = overdue.length > 0 
      ? overdue.reduce((sum, p) => sum + differenceInDays(today, parseISO(p.due_date)), 0) / overdue.length 
      : 0;

    // Projeção de juros (estimativa 2% ao mês)
    const estimatedInterest = totalOverdue * 0.02 * (avgDaysOverdue / 30);

    // Cobertura do saldo
    const coverageRatio = totalPending > 0 ? (bankBalance / totalPending) * 100 : 100;
    const canPayAll = bankBalance >= totalPending;

    // Agrupar por fornecedor
    const bySupplier = payables.reduce((acc, p) => {
      const name = p.supplier?.nome_fantasia || p.supplier?.razao_social || 'Sem fornecedor';
      if (!acc[name]) acc[name] = { total: 0, count: 0, overdue: 0 };
      acc[name].total += p.amount;
      acc[name].count++;
      if (overdue.find(o => o.id === p.id)) {
        acc[name].overdue += p.amount;
      }
      return acc;
    }, {} as Record<string, { total: number; count: number; overdue: number }>);

    const topSuppliers = Object.entries(bySupplier)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

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
      avgDaysOverdue,
      estimatedInterest,
      coverageRatio,
      canPayAll,
      topSuppliers,
      bankBalance,
    };
  }, [payables, bankBalance]);

  // Gerar recomendações
  const recommendations = useMemo(() => {
    const recs: { type: 'critical' | 'warning' | 'info'; message: string }[] = [];
    
    if (analysis.totalOverdue > 0) {
      recs.push({
        type: 'critical',
        message: `Priorize o pagamento de ${formatCurrency(analysis.totalOverdue)} em títulos vencidos para evitar juros de aproximadamente ${formatCurrency(analysis.estimatedInterest)}/mês.`
      });
    }
    
    if (analysis.totalToday > 0) {
      recs.push({
        type: 'warning',
        message: `${analysis.dueToday.length} título(s) vencem hoje totalizando ${formatCurrency(analysis.totalToday)}. Processe os pagamentos antes do fechamento bancário.`
      });
    }
    
    if (!analysis.canPayAll && analysis.coverageRatio < 50) {
      recs.push({
        type: 'critical',
        message: `Saldo bancário cobre apenas ${analysis.coverageRatio.toFixed(0)}% das obrigações. Renegociação ou antecipação de recebíveis pode ser necessária.`
      });
    }
    
    if (analysis.total7Days > analysis.bankBalance * 0.5) {
      recs.push({
        type: 'warning',
        message: `Compromissos de ${formatCurrency(analysis.total7Days)} nos próximos 7 dias representam mais de 50% do saldo. Planeje o fluxo de caixa.`
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        type: 'info',
        message: 'Situação financeira saudável. Continue monitorando os vencimentos e mantendo reserva de segurança.'
      });
    }
    
    return recs;
  }, [analysis]);

  const getRiskBadge = (daysOverdue: number) => {
    if (daysOverdue > 30) return <Badge variant="destructive">Alto Risco</Badge>;
    if (daysOverdue > 15) return <Badge className="bg-orange-500">Médio Risco</Badge>;
    if (daysOverdue > 0) return <Badge className="bg-yellow-500">Atenção</Badge>;
    return <Badge variant="secondary">No prazo</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise Financeira - Contas a Pagar
          </DialogTitle>
          <DialogDescription>
            Relatório detalhado de obrigações, fluxo de caixa e recomendações
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

                <Card className={analysis.totalToday > 0 ? 'border-yellow-500 bg-yellow-500/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className={`h-4 w-4 ${analysis.totalToday > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                      <span className="text-xs text-muted-foreground">Hoje</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.totalToday > 0 ? 'text-yellow-600' : ''}`}>
                      {formatCurrency(analysis.totalToday)}
                    </p>
                    <p className="text-xs text-muted-foreground">{analysis.dueToday.length} título(s)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Próx. 7 dias</span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(analysis.total7Days)}</p>
                    <p className="text-xs text-muted-foreground">{analysis.upcoming7Days.length} título(s)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Saldo Disponível</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(analysis.bankBalance)}</p>
                    <p className="text-xs text-muted-foreground">
                      Cobertura: {analysis.coverageRatio.toFixed(0)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Impacto no Capital de Giro */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    Impacto no Capital de Giro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total a Pagar</p>
                      <p className="text-lg font-bold">{formatCurrency(analysis.totalPending)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Juros Estimados/Mês</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(analysis.estimatedInterest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média Dias Atraso</p>
                      <p className="text-lg font-bold">{analysis.avgDaysOverdue.toFixed(0)} dias</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saúde Financeira</p>
                      {analysis.canPayAll ? (
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-bold">Boa</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-bold">Crítica</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Cobertura do Saldo</span>
                      <span>{Math.min(analysis.coverageRatio, 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(analysis.coverageRatio, 100)} className="h-2" />
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

              {/* Top Fornecedores */}
              {analysis.topSuppliers.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Maiores Credores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead className="text-center">Títulos</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Vencido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.topSuppliers.map((supplier) => (
                          <TableRow key={supplier.name}>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell className="text-center">{supplier.count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(supplier.total)}</TableCell>
                            <TableCell className="text-right">
                              {supplier.overdue > 0 ? (
                                <span className="text-destructive font-medium">
                                  {formatCurrency(supplier.overdue)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
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
                      Títulos Vencidos ({analysis.overdue.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Fornecedor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Risco</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.overdue.slice(0, 10).map((p) => {
                          const daysOverdue = differenceInDays(new Date(), parseISO(p.due_date));
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {p.description || 'Sem descrição'}
                              </TableCell>
                              <TableCell>
                                {p.supplier?.nome_fantasia || p.supplier?.razao_social || '-'}
                              </TableCell>
                              <TableCell>
                                {format(parseISO(p.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                                <span className="text-xs text-destructive ml-1">
                                  ({daysOverdue}d)
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(p.amount)}
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
