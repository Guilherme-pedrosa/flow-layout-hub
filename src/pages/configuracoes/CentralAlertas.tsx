import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Check, 
  X, 
  Eye,
  Filter,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Alert {
  id: string;
  event_type: string;
  severity: "info" | "warning" | "critical";
  mode: string;
  economic_reason: string;
  margin_before: number | null;
  margin_after: number | null;
  margin_change_percent: number | null;
  potential_loss: number | null;
  recommendation: string | null;
  impacted_entities: unknown;
  is_read: boolean;
  is_dismissed: boolean;
  is_actioned: boolean;
  action_taken: string | null;
  created_at: string;
}

const severityConfig = {
  critical: { color: "bg-destructive text-destructive-foreground", icon: AlertTriangle, label: "Crítico" },
  warning: { color: "bg-yellow-500 text-white", icon: AlertCircle, label: "Atenção" },
  info: { color: "bg-blue-500 text-white", icon: Info, label: "Info" },
};

export default function CentralAlertas() {
  const { currentCompany } = useCompany();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: "all",
    status: "unread",
    search: "",
  });
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionText, setActionText] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const fetchAlerts = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("ai_observer_alerts")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters.severity !== "all") {
        query = query.eq("severity", filters.severity);
      }

      if (filters.status === "unread") {
        query = query.eq("is_read", false).eq("is_dismissed", false);
      } else if (filters.status === "read") {
        query = query.eq("is_read", true).eq("is_dismissed", false);
      } else if (filters.status === "dismissed") {
        query = query.eq("is_dismissed", true);
      } else if (filters.status === "actioned") {
        query = query.eq("is_actioned", true);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setAlerts((data || []) as Alert[]);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Erro ao carregar alertas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [currentCompany?.id, filters.severity, filters.status]);

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from("ai_observer_alerts")
      .update({ is_read: true })
      .eq("id", alertId);

    if (error) {
      toast.error("Erro ao marcar como lido");
      return;
    }

    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    toast.success("Marcado como lido");
  };

  const dismissAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("ai_observer_alerts")
      .update({ is_dismissed: true })
      .eq("id", alertId);

    if (error) {
      toast.error("Erro ao dispensar alerta");
      return;
    }

    setAlerts(prev => prev.filter(a => a.id !== alertId));
    toast.success("Alerta dispensado");
  };

  const recordAction = async () => {
    if (!selectedAlert || !actionText.trim()) return;

    const { error } = await supabase
      .from("ai_observer_alerts")
      .update({ 
        is_actioned: true, 
        action_taken: actionText,
        actioned_at: new Date().toISOString(),
      })
      .eq("id", selectedAlert.id);

    if (error) {
      toast.error("Erro ao registrar ação");
      return;
    }

    setAlerts(prev => prev.map(a => 
      a.id === selectedAlert.id 
        ? { ...a, is_actioned: true, action_taken: actionText } 
        : a
    ));
    setActionDialogOpen(false);
    setActionText("");
    setSelectedAlert(null);
    toast.success("Ação registrada");
  };

  const filteredAlerts = alerts.filter(alert => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      alert.event_type.toLowerCase().includes(searchLower) ||
      alert.economic_reason.toLowerCase().includes(searchLower) ||
      (alert.recommendation?.toLowerCase().includes(searchLower))
    );
  });

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "critical" && !a.is_dismissed).length,
    warning: alerts.filter(a => a.severity === "warning" && !a.is_dismissed).length,
    unread: alerts.filter(a => !a.is_read && !a.is_dismissed).length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Central de Alertas"
        description="Gerencie os alertas econômicos e de risco do sistema WAI Observer"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Não Lidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Buscar</Label>
              <Input
                placeholder="Buscar por tipo, motivo..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="w-[150px]">
              <Label>Severidade</Label>
              <Select
                value={filters.severity}
                onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unread">Não Lidos</SelectItem>
                  <SelectItem value="read">Lidos</SelectItem>
                  <SelectItem value="actioned">Com Ação</SelectItem>
                  <SelectItem value="dismissed">Dispensados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchAlerts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Severidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="max-w-[300px]">Motivo Econômico</TableHead>
                  <TableHead className="text-right">Perda Potencial</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum alerta encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => {
                    const config = severityConfig[alert.severity];
                    const Icon = config.icon;
                    
                    return (
                      <TableRow 
                        key={alert.id} 
                        className={!alert.is_read ? "bg-muted/30" : ""}
                      >
                        <TableCell>
                          <Badge className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {alert.event_type}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {alert.economic_reason}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {alert.potential_loss 
                            ? `R$ ${alert.potential_loss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            : "-"
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          {alert.margin_change_percent !== null ? (
                            <span className={alert.margin_change_percent < 0 ? "text-destructive" : "text-green-600"}>
                              {alert.margin_change_percent > 0 ? "+" : ""}
                              {alert.margin_change_percent.toFixed(1)}%
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {!alert.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsRead(alert.id)}
                                title="Marcar como lido"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {!alert.is_actioned && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setActionDialogOpen(true);
                                }}
                                title="Registrar ação"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {!alert.is_dismissed && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => dismissAlert(alert.id)}
                                title="Dispensar"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ação Tomada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAlert && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedAlert.event_type}</p>
                <p className="text-sm text-muted-foreground">{selectedAlert.economic_reason}</p>
              </div>
            )}
            <div>
              <Label>Descreva a ação tomada</Label>
              <Textarea
                placeholder="Ex: Renegociado preço com fornecedor, ajustado margem da OS..."
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={recordAction} disabled={!actionText.trim()}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
