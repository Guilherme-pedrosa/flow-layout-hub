import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LayoutDashboard, Plus, Settings, ShieldCheck, ShieldX, Clock, 
  AlertTriangle, TrendingUp, Users, Building2, FileWarning, CalendarClock,
  RefreshCw, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { useIntegrationsModule, useIntegrationsDashboard } from "@/hooks/useIntegrationsModule";
import { usePessoas } from "@/hooks/usePessoas";
import { useRh } from "@/hooks/useRh";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDuration(ms: number): string {
  if (ms === 0) return '-';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function IntegracoesDashboard() {
  const navigate = useNavigate();
  const { integrations, stats, isLoading } = useIntegrationsModule();
  const { data: dashboardData } = useIntegrationsDashboard();
  const { clientes } = usePessoas();
  const { colaboradores } = useRh();

  // Build pending issues grouped by requirement
  const pendingByRequirement: Record<string, { count: number; clients: string[] }> = {};
  const technicianPendingCount: Record<string, number> = {};

  integrations.forEach(int => {
    if (int.status === 'blocked' && int.blocked_reasons) {
      int.blocked_reasons.forEach(reason => {
        const key = reason.doc_type;
        if (!pendingByRequirement[key]) {
          pendingByRequirement[key] = { count: 0, clients: [] };
        }
        pendingByRequirement[key].count++;
        
        const client = clientes.find(c => c.id === int.client_id);
        const clientName = client?.nome_fantasia || client?.razao_social || 'Cliente';
        if (!pendingByRequirement[key].clients.includes(clientName)) {
          pendingByRequirement[key].clients.push(clientName);
        }

        if (reason.entity_name) {
          technicianPendingCount[reason.entity_name] = (technicianPendingCount[reason.entity_name] || 0) + 1;
        }
      });
    }
  });

  const topPendingRequirements = Object.entries(pendingByRequirement)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  const topTechniciansWithPending = Object.entries(technicianPendingCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Expiring soon items
  const expiringSoon = integrations
    .filter(i => {
      if (!i.earliest_expiry_date) return false;
      const exp = new Date(i.earliest_expiry_date);
      const now = new Date();
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30;
    })
    .map(i => {
      const client = clientes.find(c => c.id === i.client_id);
      const techNames = i.technician_ids
        .map(tid => {
          const tech = colaboradores.find(c => c.id === tid);
          return tech?.nome_fantasia || tech?.razao_social || 'Técnico';
        })
        .join(', ');
      
      return {
        ...i,
        clientName: client?.nome_fantasia || client?.razao_social || 'Cliente',
        techNames,
        daysUntilExpiry: Math.ceil((new Date(i.earliest_expiry_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      };
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 15);

  // Recent integrations
  const recentIntegrations = integrations.slice(0, 10).map(i => {
    const client = clientes.find(c => c.id === i.client_id);
    return {
      ...i,
      clientName: client?.nome_fantasia || client?.razao_social || 'Cliente',
    };
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  const dashStats = dashboardData?.stats;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Dashboard de Integrações"
        description="Visão consolidada do módulo de integrações"
        breadcrumbs={[
          { label: "RH" },
          { label: "Integrações", href: "/rh/integracoes" },
          { label: "Dashboard" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/rh/integracoes/requisitos')}>
              <Settings className="mr-2 h-4 w-4" />
              Gerenciar Requisitos
            </Button>
            <Button onClick={() => navigate('/servicos/nova-integracao')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Integração
            </Button>
          </div>
        }
      />

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <LayoutDashboard className="h-4 w-4" />
              Total
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
              <ShieldCheck className="h-4 w-4" />
              Autorizadas
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">
              {stats.authorized}
              {dashStats && <span className="text-sm font-normal ml-1">({dashStats.percentAuthorized}%)</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <ShieldX className="h-4 w-4" />
              Bloqueadas
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
              {stats.blocked}
              {dashStats && <span className="text-sm font-normal ml-1">({dashStats.percentBlocked}%)</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm">
              <TrendingUp className="h-4 w-4" />
              Enviadas
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{stats.sent}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
              <Clock className="h-4 w-4" />
              A Vencer (15d)
            </div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">{stats.expiringSoon}</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Expiradas
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Row 2 - Tempos */}
      {dashStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tempo médio validação</p>
              <p className="text-lg font-semibold">{formatDuration(dashStats.avgValidationTimeMs)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tempo médio envio</p>
              <p className="text-lg font-semibold">{formatDuration(dashStats.avgSendTimeMs)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Vencendo em 7 dias</p>
              <p className="text-lg font-semibold">{dashStats.expiringIn7Days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Vencendo em 15 dias</p>
              <p className="text-lg font-semibold">{dashStats.expiringIn15Days}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Vencendo em 30 dias</p>
              <p className="text-lg font-semibold">{dashStats.expiringIn30Days}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content - 2 columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Pendências */}
        <div className="space-y-6">
          {/* Pendências por Requisito */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-destructive" />
                Pendências Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPendingRequirements.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma pendência</p>
              ) : (
                <div className="space-y-3">
                  {topPendingRequirements.map(([docType, info]) => (
                    <div key={docType} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium">{docType}</p>
                        <p className="text-xs text-muted-foreground">
                          {info.clients.slice(0, 3).join(', ')}
                          {info.clients.length > 3 && ` +${info.clients.length - 3}`}
                        </p>
                      </div>
                      <Badge variant="destructive">{info.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Técnicos com mais pendências */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Técnicos com Mais Pendências
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topTechniciansWithPending.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma pendência</p>
              ) : (
                <div className="space-y-2">
                  {topTechniciansWithPending.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span>{name}</span>
                      <Badge variant="outline">{count} doc(s)</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Vencimentos e Recentes */}
        <div className="space-y-6">
          {/* Vencimentos Próximos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-yellow-600" />
                Vencimentos Próximos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringSoon.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum vencimento próximo</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Técnico(s)</TableHead>
                      <TableHead className="text-right">Dias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringSoon.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.clientName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {item.techNames}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={item.daysUntilExpiry <= 7 ? "destructive" : "outline"}
                            className={item.daysUntilExpiry <= 7 ? "" : "text-yellow-600 border-yellow-600"}
                          >
                            {item.daysUntilExpiry}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Integrações Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Integrações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentIntegrations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma integração</p>
              ) : (
                <div className="space-y-2">
                  {recentIntegrations.map(int => (
                    <div key={int.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium">{int.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(int.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <Badge 
                        variant={int.status === 'authorized' || int.status === 'sent' ? 'default' : 'destructive'}
                        className={int.status === 'authorized' || int.status === 'sent' ? 'bg-green-600' : ''}
                      >
                        {int.status === 'authorized' ? 'OK' : int.status === 'sent' ? 'Enviada' : 'Bloqueada'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => navigate('/servicos/nova-integracao')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Integração
            </Button>
            <Button variant="outline" onClick={() => navigate('/rh/integracoes/requisitos')}>
              <Settings className="mr-2 h-4 w-4" />
              Gerenciar Requisitos por Cliente
            </Button>
            <Button variant="outline" onClick={() => navigate('/rh/integracoes')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Ver Matriz Completa
            </Button>
            <Button variant="outline" onClick={() => {
              const dataToExport = integrations.map(int => {
                const client = clientes.find(c => c.id === int.client_id);
                return {
                  'Cliente': client?.nome_fantasia || client?.razao_social || '',
                  'Status': int.status,
                  'Validado Em': int.validated_at ? format(new Date(int.validated_at), 'dd/MM/yyyy') : '-',
                  'Vencimento': int.earliest_expiry_date ? format(new Date(int.earliest_expiry_date), 'dd/MM/yyyy') : '-',
                  'Enviado': int.sent_at ? 'Sim' : 'Não',
                };
              });
              const ws = XLSX.utils.json_to_sheet(dataToExport);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
              XLSX.writeFile(wb, `Dashboard_Integracoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            }}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
