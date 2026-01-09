import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntegrationsModule, Integration } from "@/hooks/useIntegrationsModule";
import { usePessoas } from "@/hooks/usePessoas";
import { useRh } from "@/hooks/useRh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared";
import { 
  Plus, Search, Building2, User, RefreshCw, Download, Mail, 
  Trash2, Eye, LayoutDashboard, Settings, ShieldCheck, ShieldX, Clock
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IntegrationDetailModal } from "@/components/integracoes/IntegrationDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function StatusBadge({ status, expiryDate }: { status: Integration['status']; expiryDate?: string | null }) {
  // Check if expired
  if (expiryDate && new Date(expiryDate) < new Date()) {
    return <Badge variant="destructive" className="bg-orange-600">EXPIRADO</Badge>;
  }
  
  switch (status) {
    case 'authorized':
      return <Badge className="bg-green-600">AUTORIZADO</Badge>;
    case 'sent':
      return <Badge className="bg-blue-600">ENVIADO</Badge>;
    case 'blocked':
      return <Badge variant="destructive">BLOQUEADO</Badge>;
    case 'expired':
      return <Badge variant="destructive" className="bg-orange-600">EXPIRADO</Badge>;
    case 'draft':
      return <Badge variant="outline">RASCUNHO</Badge>;
    default:
      return null;
  }
}

export default function MatrizIntegracoesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<(Integration & { clientName: string; techNames: string }) | null>(null);

  const { 
    integrations, 
    stats,
    isLoading, 
    deleteIntegration,
    updateIntegration,
    refetch,
  } = useIntegrationsModule();

  const { clientes } = usePessoas();
  const { colaboradores } = useRh();

  // Enrich integrations with names
  const enrichedIntegrations = integrations.map(int => {
    const client = clientes.find(c => c.id === int.client_id);
    const techNames = int.technician_ids
      .map(tid => {
        const tech = colaboradores.find(c => c.id === tid);
        return tech?.nome_fantasia || tech?.razao_social || 'Técnico';
      })
      .join(', ');

    return {
      ...int,
      clientName: client?.nome_fantasia || client?.razao_social || 'Cliente',
      techNames,
    };
  });

  // Filter integrations
  const integracoesFiltradas = enrichedIntegrations.filter(int => {
    const matchSearch = !search || 
      int.clientName.toLowerCase().includes(search.toLowerCase()) ||
      int.techNames.toLowerCase().includes(search.toLowerCase());
    
    let matchStatus = filterStatus === 'todos';
    if (filterStatus === 'authorized') matchStatus = int.status === 'authorized';
    if (filterStatus === 'sent') matchStatus = int.status === 'sent';
    if (filterStatus === 'blocked') matchStatus = int.status === 'blocked';
    if (filterStatus === 'expired') {
      matchStatus = int.status === 'expired' || 
        (int.earliest_expiry_date ? new Date(int.earliest_expiry_date) < new Date() : false);
    }
    if (filterStatus === 'expiring') {
      if (!int.earliest_expiry_date) matchStatus = false;
      else {
        const exp = new Date(int.earliest_expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        matchStatus = diffDays > 0 && diffDays <= 15;
      }
    }
    
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Remover esta integração?')) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  const handleRevalidate = (int: typeof enrichedIntegrations[0]) => {
    navigate('/servicos/nova-integracao', { 
      state: { 
        clientId: int.client_id, 
        technicianIds: int.technician_ids,
        integrationId: int.id,
      } 
    });
  };

  const handleViewDetail = (int: typeof enrichedIntegrations[0]) => {
    setSelectedIntegration(int);
    setDetailModalOpen(true);
  };

  const handleDownloadZip = async (int: typeof enrichedIntegrations[0]) => {
    if (!int.zip_url && !int.zip_file_name) {
      // No ZIP yet, redirect to form
      navigate('/servicos/nova-integracao', { 
        state: { 
          clientId: int.client_id, 
          technicianIds: int.technician_ids,
          integrationId: int.id,
        } 
      });
      toast.info('Gere o ZIP na tela de integração');
      return;
    }

    // Try to fetch from storage
    if (int.zip_file_name) {
      // Generate ZIP on demand (simplified - in real app would fetch from storage)
      toast.info(`Baixando ${int.zip_file_name}...`);
      navigate('/servicos/nova-integracao', { 
        state: { 
          clientId: int.client_id, 
          technicianIds: int.technician_ids,
          integrationId: int.id,
        } 
      });
    }
  };

  const handleSendEmail = async (int: typeof enrichedIntegrations[0]) => {
    const subject = encodeURIComponent(`WeDo | Kit de Documentação - ${int.clientName}`);
    const body = encodeURIComponent(`Prezados,\n\nSegue em anexo o kit de documentação.\n\nAtenciosamente,\nWeDo`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    
    // Update status to sent
    await updateIntegration.mutateAsync({
      id: int.id,
      data: {
        status: 'sent',
        sent_at: new Date().toISOString(),
      }
    });
    toast.success('Integração marcada como enviada');
    refetch();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Matriz de Integrações"
        description="Controle de kits de documentação para acesso"
        breadcrumbs={[
          { label: "RH" },
          { label: "Integrações" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/rh/integracoes/dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/rh/integracoes/requisitos')}>
              <Settings className="mr-2 h-4 w-4" />
              Requisitos
            </Button>
            <Button onClick={() => navigate('/servicos/nova-integracao')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Integração
            </Button>
          </div>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <p className="text-sm text-green-700 dark:text-green-400">Autorizadas</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.authorized}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">Enviadas</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">A Vencer (15d)</p>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700 dark:text-red-400">Bloqueados</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.blocked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mt-6">
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar cliente ou técnico..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="authorized">Autorizados</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
                <SelectItem value="expiring">A Vencer (15d)</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="mt-4">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico(s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validação</TableHead>
                <TableHead>Próx. Vencimento</TableHead>
                <TableHead className="w-[150px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integracoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Nenhuma integração encontrada
                  </TableCell>
                </TableRow>
              ) : (
                integracoesFiltradas.map(int => (
                  <TableRow key={int.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{int.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[200px]" title={int.techNames}>
                          {int.techNames || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={int.status} expiryDate={int.earliest_expiry_date} />
                    </TableCell>
                    <TableCell>
                      {int.validated_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(int.validated_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {int.earliest_expiry_date ? (
                        <span className="text-sm">
                          {format(new Date(int.earliest_expiry_date), 'dd/MM/yyyy')}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Ver Detalhes"
                          onClick={() => handleViewDetail(int)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Revalidar"
                          onClick={() => handleRevalidate(int)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {(int.status === 'authorized' || int.status === 'sent') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title={int.zip_file_name ? "Baixar ZIP" : "Gerar ZIP"}
                            onClick={() => handleDownloadZip(int)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(int.id)}
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <IntegrationDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        integration={selectedIntegration}
        onRevalidate={() => {
          setDetailModalOpen(false);
          if (selectedIntegration) handleRevalidate(selectedIntegration);
        }}
        onDownloadZip={() => {
          setDetailModalOpen(false);
          if (selectedIntegration) handleDownloadZip(selectedIntegration);
        }}
        onSendEmail={() => {
          setDetailModalOpen(false);
          if (selectedIntegration) handleSendEmail(selectedIntegration);
        }}
      />
    </div>
  );
}
