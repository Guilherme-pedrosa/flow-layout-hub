import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, AlertTriangle, Clock, DollarSign, 
  CheckCircle, XCircle, Loader2, RefreshCw, Eye,
  AlertCircle, TrendingUp, Shield, Zap
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface AlertData {
  id: string;
  event_type: string;
  severity: string;
  economic_reason: string;
  potential_loss: number | null;
  is_actioned: boolean;
  is_dismissed: boolean;
  is_read: boolean;
  created_at: string;
  sla_deadline: string | null;
  is_sla_breached: boolean | null;
  action_taken: string | null;
  responsible_role: string | null;
}

interface WaiObserverAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WaiObserverAnalysisModal({ open, onOpenChange }: WaiObserverAnalysisModalProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertData[]>([]);

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
        .from('ai_observer_alerts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(100);

      setAlerts(data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const analysis = useMemo(() => {
    // Separar por status
    const pending = alerts.filter(a => !a.is_actioned && !a.is_dismissed);
    const actioned = alerts.filter(a => a.is_actioned);
    const dismissed = alerts.filter(a => a.is_dismissed);

    // Por severidade
    const critical = alerts.filter(a => a.severity === 'critical');
    const warning = alerts.filter(a => a.severity === 'warning');
    const info = alerts.filter(a => a.severity === 'info');

    const pendingCritical = pending.filter(a => a.severity === 'critical');
    const pendingWarning = pending.filter(a => a.severity === 'warning');

    // SLA
    const slaBreached = alerts.filter(a => a.is_sla_breached);
    const pendingWithSla = pending.filter(a => a.sla_deadline);

    // Potencial de perda
    const totalPotentialLoss = pending.reduce((sum, a) => sum + (a.potential_loss || 0), 0);
    const savedByAction = actioned.reduce((sum, a) => sum + (a.potential_loss || 0), 0);

    // Tempo médio de resposta
    const responseTimes = actioned
      .filter(a => a.created_at)
      .map(a => {
        // Usar updated_at ou a data de ação se disponível
        return differenceInHours(new Date(), parseISO(a.created_at));
      });
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Taxa de resolução
    const resolutionRate = alerts.length > 0 
      ? ((actioned.length + dismissed.length) / alerts.length) * 100 
      : 100;

    // Agrupar por tipo de evento
    const byEventType: Record<string, { count: number; critical: number; loss: number }> = {};
    alerts.forEach(a => {
      const key = a.event_type;
      if (!byEventType[key]) byEventType[key] = { count: 0, critical: 0, loss: 0 };
      byEventType[key].count++;
      if (a.severity === 'critical') byEventType[key].critical++;
      byEventType[key].loss += a.potential_loss || 0;
    });

    const topEventTypes = Object.entries(byEventType)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.loss - a.loss || b.critical - a.critical)
      .slice(0, 5);

    // Alertas urgentes (SLA próximo de vencer)
    const now = new Date();
    const urgentAlerts = pending.filter(a => {
      if (!a.sla_deadline) return false;
      const deadline = parseISO(a.sla_deadline);
      const hoursRemaining = differenceInHours(deadline, now);
      return hoursRemaining > 0 && hoursRemaining <= 4;
    });

    return {
      total: alerts.length,
      pending: pending.length,
      actioned: actioned.length,
      dismissed: dismissed.length,
      critical: critical.length,
      warning: warning.length,
      info: info.length,
      pendingCritical,
      pendingWarning,
      slaBreached: slaBreached.length,
      totalPotentialLoss,
      savedByAction,
      avgResponseTime,
      resolutionRate,
      topEventTypes,
      urgentAlerts,
    };
  }, [alerts]);

  // Gerar recomendações
  const recommendations = useMemo(() => {
    const recs: { type: 'critical' | 'warning' | 'info'; message: string }[] = [];
    
    if (analysis.pendingCritical.length > 0) {
      recs.push({
        type: 'critical',
        message: `${analysis.pendingCritical.length} alerta(s) CRÍTICO(S) pendente(s) com potencial de perda de ${formatCurrency(analysis.pendingCritical.reduce((s, a) => s + (a.potential_loss || 0), 0))}. Ação imediata necessária!`
      });
    }
    
    if (analysis.urgentAlerts.length > 0) {
      recs.push({
        type: 'critical',
        message: `${analysis.urgentAlerts.length} alerta(s) com SLA prestes a vencer (menos de 4h). Priorize a resolução.`
      });
    }
    
    if (analysis.slaBreached > 0) {
      recs.push({
        type: 'warning',
        message: `${analysis.slaBreached} alerta(s) com SLA estourado. Revise processos para melhorar tempo de resposta.`
      });
    }
    
    if (analysis.resolutionRate < 70) {
      recs.push({
        type: 'warning',
        message: `Taxa de resolução de ${analysis.resolutionRate.toFixed(0)}% está baixa. Meta ideal é acima de 90%.`
      });
    }
    
    if (analysis.savedByAction > 0) {
      recs.push({
        type: 'info',
        message: `${formatCurrency(analysis.savedByAction)} em perdas evitadas por ações tomadas. Continue monitorando e agindo rapidamente.`
      });
    }
    
    if (recs.length === 0) {
      recs.push({
        type: 'info',
        message: 'Nenhum alerta crítico pendente. Continue monitorando para manter a saúde operacional.'
      });
    }
    
    return recs;
  }, [analysis]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Atenção</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Central de Alertas WAI Observer
          </DialogTitle>
          <DialogDescription>
            Análise de alertas, SLAs e impacto econômico
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
                <Card className={analysis.pendingCritical.length > 0 ? 'border-destructive bg-destructive/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`h-4 w-4 ${analysis.pendingCritical.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                      <span className="text-xs text-muted-foreground">Críticos Pendentes</span>
                    </div>
                    <p className={`text-xl font-bold ${analysis.pendingCritical.length > 0 ? 'text-destructive' : ''}`}>
                      {analysis.pendingCritical.length}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Total Pendentes</span>
                    </div>
                    <p className="text-xl font-bold">{analysis.pending}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-destructive" />
                      <span className="text-xs text-muted-foreground">Perda Potencial</span>
                    </div>
                    <p className="text-xl font-bold text-destructive">{formatCurrency(analysis.totalPotentialLoss)}</p>
                  </CardContent>
                </Card>

                <Card className="border-green-500 bg-green-500/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Perdas Evitadas</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(analysis.savedByAction)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Métricas de Performance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Performance de Resposta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Alertas</p>
                      <p className="text-lg font-bold">{analysis.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Resolvidos</p>
                      <p className="text-lg font-bold text-green-600">{analysis.actioned}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SLA Estourado</p>
                      <p className="text-lg font-bold text-destructive">{analysis.slaBreached}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo Médio</p>
                      <p className="text-lg font-bold">{analysis.avgResponseTime.toFixed(0)}h</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Taxa de Resolução</span>
                      <span className={analysis.resolutionRate >= 90 ? 'text-green-600' : analysis.resolutionRate >= 70 ? 'text-yellow-600' : 'text-destructive'}>
                        {analysis.resolutionRate.toFixed(0)}% (meta: 90%)
                      </span>
                    </div>
                    <Progress 
                      value={analysis.resolutionRate} 
                      className={`h-2 ${
                        analysis.resolutionRate >= 90 ? '[&>div]:bg-green-500' : 
                        analysis.resolutionRate >= 70 ? '[&>div]:bg-yellow-500' : 
                        '[&>div]:bg-destructive'
                      }`}
                    />
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

              {/* Tipos de Eventos mais frequentes */}
              {analysis.topEventTypes.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Tipos de Alertas Mais Frequentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de Evento</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Críticos</TableHead>
                          <TableHead className="text-right">Perda Potencial</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.topEventTypes.map((event) => (
                          <TableRow key={event.type}>
                            <TableCell className="font-medium">{event.type}</TableCell>
                            <TableCell className="text-center">{event.count}</TableCell>
                            <TableCell className="text-center">
                              {event.critical > 0 ? (
                                <span className="text-destructive font-medium">{event.critical}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {event.loss > 0 ? formatCurrency(event.loss) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Alertas Críticos Pendentes */}
              {analysis.pendingCritical.length > 0 && (
                <Card className="border-destructive">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas Críticos Pendentes ({analysis.pendingCritical.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Motivo Econômico</TableHead>
                          <TableHead className="text-right">Perda Potencial</TableHead>
                          <TableHead className="text-center">Criado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.pendingCritical.slice(0, 5).map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell className="font-medium">{alert.event_type}</TableCell>
                            <TableCell className="max-w-[250px] truncate">
                              {alert.economic_reason}
                            </TableCell>
                            <TableCell className="text-right font-medium text-destructive">
                              {alert.potential_loss ? formatCurrency(alert.potential_loss) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {format(parseISO(alert.created_at), 'dd/MM HH:mm', { locale: ptBR })}
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
