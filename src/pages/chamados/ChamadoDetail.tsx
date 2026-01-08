import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChamados, Chamado, ChamadoLog } from "@/hooks/useChamados";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  Loader2, 
  ExternalLink,
  Clock,
  User,
  Building,
  MapPin,
  Wrench,
  ClipboardList,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<Chamado['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  aberto: { label: 'Aberto', variant: 'default' },
  em_execucao: { label: 'Em Execução', variant: 'secondary' },
  concluido: { label: 'Concluído', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

const ACTION_LABELS: Record<string, string> = {
  imported: 'Importado do Excel',
  linked_os: 'OS Vinculada',
  status_changed: 'Status Alterado',
  edited: 'Editado',
};

export default function ChamadoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getChamadoById, getChamadoLogs, updateStatus, gerarOS } = useChamados();
  
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [logs, setLogs] = useState<ChamadoLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);
  
  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    
    const [chamadoData, logsData] = await Promise.all([
      getChamadoById(id),
      getChamadoLogs(id),
    ]);
    
    setChamado(chamadoData);
    setLogs(logsData);
    setLoading(false);
  };
  
  const handleStatusChange = async (newStatus: Chamado['status']) => {
    if (!id) return;
    await updateStatus.mutateAsync({ id, status: newStatus });
    loadData();
  };
  
  const handleGerarOS = async () => {
    if (!id) return;
    const os = await gerarOS.mutateAsync(id);
    loadData();
    navigate(`/ordens-servico/${os.id}`);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!chamado) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/chamados')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="text-center text-muted-foreground">
          Chamado não encontrado
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/chamados')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <PageHeader
          title={`Chamado OS ${chamado.os_numero}`}
          description={`Importado em ${format(new Date(chamado.imported_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do Chamado */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Dados do Chamado
                </CardTitle>
                <Badge variant="secondary">
                  <FileSpreadsheet className="mr-1 h-3 w-3" />
                  Excel
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">OS Número</label>
                <p className="font-medium">{chamado.os_numero}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data</label>
                <p>
                  {chamado.os_data 
                    ? format(new Date(chamado.os_data), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Distrito
                </label>
                <p>{chamado.distrito || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Técnico
                </label>
                <p>{chamado.tecnico_nome || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">TRA</label>
                <p>{chamado.tra_nome || '-'}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código</label>
                  <p>{chamado.cliente_codigo || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome (Excel)</label>
                  <p>{chamado.cliente_nome || '-'}</p>
                </div>
                {chamado.client_id && chamado.cliente && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Cliente WAI Vinculado</label>
                    <p className="flex items-center gap-2">
                      {chamado.cliente.nome_fantasia || chamado.cliente.razao_social}
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => navigate(`/clientes/${chamado.client_id}`)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </p>
                  </div>
                )}
                {!chamado.client_id && (
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Cliente não vinculado ao WAI
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Ações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum registro</p>
              ) : (
                <div className="space-y-4">
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-4 text-sm">
                      <div className="flex-shrink-0 w-36 text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                        {log.user?.name && (
                          <span className="text-muted-foreground ml-2 flex items-center gap-1 inline-flex">
                            <User className="h-3 w-3" />
                            {log.user.name}
                          </span>
                        )}
                        {log.metadata && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {log.action === 'status_changed' && (
                              <span>
                                {STATUS_CONFIG[log.metadata.from as Chamado['status']]?.label || String(log.metadata.from)} →{' '}
                                {STATUS_CONFIG[log.metadata.to as Chamado['status']]?.label || String(log.metadata.to)}
                              </span>
                            )}
                            {log.action === 'linked_os' && (
                              <span>OS {String(log.metadata.order_number)}</span>
                            )}
                            {log.action === 'imported' && log.metadata.file_name && (
                              <span>Arquivo: {String(log.metadata.file_name)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={chamado.status}
                onValueChange={handleStatusChange}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_execucao">Em Execução</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {/* OS Vinculada */}
          <Card>
            <CardHeader>
              <CardTitle>Ordem de Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              {chamado.service_order_id && chamado.service_order ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{chamado.service_order.order_number}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/ordens-servico/${chamado.service_order_id}`)}
                    >
                      Abrir OS
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma OS vinculada a este chamado.
                  </p>
                  <Button 
                    onClick={handleGerarOS}
                    disabled={gerarOS.isPending}
                    className="w-full"
                  >
                    {gerarOS.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Gerar OS
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
