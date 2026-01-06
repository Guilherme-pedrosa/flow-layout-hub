import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Link2, AlertTriangle, Clock, DollarSign, 
  CheckCircle, XCircle, Loader2, RefreshCw, Zap,
  AlertCircle, TrendingUp, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface TransactionData {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  is_reconciled: boolean;
}

interface ReconciliationAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReconciliationAnalysisModal({ open, onOpenChange }: ReconciliationAnalysisModalProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  useEffect(() => {
    if (open && currentCompany?.id) {
      loadData();
    }
  }, [open, currentCompany?.id]);

  const loadData = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    
    try {
      // Carregar últimos 60 dias
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data } = await supabase
        .from('bank_transactions')
        .select('id, transaction_date, description, amount, type, is_reconciled')
        .eq('company_id', currentCompany.id)
        .gte('transaction_date', sixtyDaysAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      setTransactions(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    const reconciled = transactions.filter(t => t.is_reconciled);
    const pending = transactions.filter(t => !t.is_reconciled);
    
    const credits = transactions.filter(t => t.type === 'CREDIT');
    const debits = transactions.filter(t => t.type === 'DEBIT');
    
    const reconciledCredits = reconciled.filter(t => t.type === 'CREDIT');
    const reconciledDebits = reconciled.filter(t => t.type === 'DEBIT');
    const pendingCredits = pending.filter(t => t.type === 'CREDIT');
    const pendingDebits = pending.filter(t => t.type === 'DEBIT');

    // Totais
    const totalCredits = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = debits.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalPendingCredits = pendingCredits.reduce((sum, t) => sum + t.amount, 0);
    const totalPendingDebits = pendingDebits.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Taxa de conciliação
    const reconciliationRate = transactions.length > 0 
      ? (reconciled.length / transactions.length) * 100 
      : 100;

    // Valor pendente de conciliação
    const totalPendingValue = pending.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Transações antigas não conciliadas (> 7 dias)
    const today = new Date();
    const oldPending = pending.filter(t => {
      const txDate = parseISO(t.transaction_date);
      return differenceInDays(today, txDate) > 7;
    });

    // Agrupar por categoria de descrição
    const byDescription: Record<string, { count: number; total: number; pending: number }> = {};
    pending.forEach(t => {
      const key = t.description?.slice(0, 30) || 'Sem descrição';
      if (!byDescription[key]) byDescription[key] = { count: 0, total: 0, pending: 0 };
      byDescription[key].count++;
      byDescription[key].total += Math.abs(t.amount);
      byDescription[key].pending++;
    });

    const topPendingCategories = Object.entries(byDescription)
      .map(([desc, data]) => ({ description: desc, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      total: transactions.length,
      reconciled: reconciled.length,
      pending: pending.length,
      reconciliationRate,
      totalCredits,
      totalDebits,
      totalPendingCredits,
      totalPendingDebits,
      totalPendingValue,
      oldPending,
      pendingCredits,
      pendingDebits,
      topPendingCategories,
    };
  }, [transactions]);

  // Gerar recomendações
  const recommendations = useMemo(() => {
    const recs: { type: 'critical' | 'warning' | 'info'; message: string }[] = [];
    
    if (analysis.reconciliationRate < 80) {
      recs.push({
        type: 'critical',
        message: `Taxa de conciliação de ${analysis.reconciliationRate.toFixed(0)}% está baixa. Meta ideal é acima de 95%. Concilie transações pendentes para melhorar controle financeiro.`
      });
    }
    
    if (analysis.oldPending.length > 0) {
      recs.push({
        type: 'warning',
        message: `${analysis.oldPending.length} transação(ões) pendente(s) há mais de 7 dias. Transações antigas dificultam a identificação e devem ser priorizadas.`
      });
    }
    
    if (analysis.totalPendingCredits > 0) {
      recs.push({
        type: 'info',
        message: `${formatCurrency(analysis.totalPendingCredits)} em entradas não conciliadas. Verifique se são recebimentos de clientes e vincule aos títulos correspondentes.`
      });
    }
    
    if (analysis.totalPendingDebits > 0) {
      recs.push({
        type: 'info',
        message: `${formatCurrency(analysis.totalPendingDebits)} em saídas não conciliadas. Identifique pagamentos e vincule às contas a pagar.`
      });
    }
    
    if (analysis.reconciliationRate >= 95 && analysis.pending === 0) {
      recs.push({
        type: 'info',
        message: 'Excelente! Todas as transações estão conciliadas. Continue mantendo a conciliação em dia.'
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
            Análise de Conciliação Bancária
          </DialogTitle>
          <DialogDescription>
            Relatório de transações, taxa de conciliação e recomendações
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
                <Card className={analysis.reconciliationRate < 80 ? 'border-orange-500 bg-orange-500/5' : 'border-green-500 bg-green-500/5'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className={`h-4 w-4 ${analysis.reconciliationRate >= 80 ? 'text-green-600' : 'text-orange-600'}`} />
                      <span className="text-xs text-muted-foreground">Taxa Conciliação</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.reconciliationRate >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                      {analysis.reconciliationRate.toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted-foreground">{analysis.reconciled}/{analysis.total} transações</p>
                  </CardContent>
                </Card>

                <Card className={analysis.pending > 0 ? 'border-yellow-500 bg-yellow-500/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className={`h-4 w-4 ${analysis.pending > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                      <span className="text-xs text-muted-foreground">Pendentes</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.pending > 0 ? 'text-yellow-600' : ''}`}>
                      {analysis.pending}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(analysis.totalPendingValue)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Entradas Pendentes</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(analysis.totalPendingCredits)}</p>
                    <p className="text-xs text-muted-foreground">{analysis.pendingCredits.length} transação(ões)</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-muted-foreground">Saídas Pendentes</span>
                    </div>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(analysis.totalPendingDebits)}</p>
                    <p className="text-xs text-muted-foreground">{analysis.pendingDebits.length} transação(ões)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Progresso de Conciliação */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Progresso de Conciliação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Conciliado</span>
                      <span className={analysis.reconciliationRate >= 95 ? 'text-green-600' : analysis.reconciliationRate >= 80 ? 'text-yellow-600' : 'text-destructive'}>
                        {analysis.reconciliationRate.toFixed(0)}% (meta: 95%)
                      </span>
                    </div>
                    <Progress 
                      value={analysis.reconciliationRate} 
                      className={`h-3 ${
                        analysis.reconciliationRate >= 95 ? '[&>div]:bg-green-500' : 
                        analysis.reconciliationRate >= 80 ? '[&>div]:bg-yellow-500' : 
                        '[&>div]:bg-destructive'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Transações</p>
                      <p className="text-lg font-bold">{analysis.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conciliadas</p>
                      <p className="text-lg font-bold text-green-600">{analysis.reconciled}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                      <p className="text-lg font-bold text-yellow-600">{analysis.pending}</p>
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

              {/* Categorias Pendentes */}
              {analysis.topPendingCategories.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Maiores Valores Pendentes por Descrição
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.topPendingCategories.map((cat, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{cat.description}</TableCell>
                            <TableCell className="text-center">{cat.count}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(cat.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Transações Antigas Pendentes */}
              {analysis.oldPending.length > 0 && (
                <Card className="border-yellow-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Transações Antigas Não Conciliadas ({analysis.oldPending.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-center">Idade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.oldPending.slice(0, 10).map((t) => {
                          const age = differenceInDays(new Date(), parseISO(t.transaction_date));
                          return (
                            <TableRow key={t.id}>
                              <TableCell>
                                {format(parseISO(t.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="max-w-[250px] truncate">
                                {t.description || 'Sem descrição'}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                                  {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{age} dias</Badge>
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
