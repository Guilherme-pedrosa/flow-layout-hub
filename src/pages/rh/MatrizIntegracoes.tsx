import { useState } from "react";
import { useIntegracoes, IntegracaoComStatus } from "@/hooks/useIntegracoes";
import { useAllColaboradorDocs, getDocStatus } from "@/hooks/useColaboradorDocs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared";
import { Plus, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, Search, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatusBadge({ status }: { status: IntegracaoComStatus['statusFinal'] }) {
  switch (status) {
    case 'ATIVO':
      return <Badge className="bg-green-600">ATIVO</Badge>;
    case 'A_VENCER':
      return <Badge className="bg-yellow-600">A VENCER</Badge>;
    case 'VENCIDO':
      return <Badge variant="destructive">VENCIDO</Badge>;
    case 'BLOQUEADO':
      return <Badge variant="destructive" className="bg-red-800">⛔ BLOQUEADO</Badge>;
    default:
      return null;
  }
}

function DocsGlobaisIcon({ status, docsVencidos }: { status: 'ok' | 'alerta' | 'bloqueado'; docsVencidos: string[] }) {
  if (status === 'ok') {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
  return (
    <div className="flex items-center gap-1">
      <XCircle className="h-5 w-5 text-red-600" />
      <span className="text-xs text-red-600">({docsVencidos.length})</span>
    </div>
  );
}

export default function MatrizIntegracoesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const [formData, setFormData] = useState({
    colaborador_id: '',
    cliente_id: '',
    data_realizacao: '',
    data_vencimento: '',
    observacoes: '',
  });

  const { 
    integracoes, 
    isLoading, 
    createIntegracao, 
    updateIntegracao, 
    deleteIntegracao,
    colaboradores,
    clientes,
    allDocs,
  } = useIntegracoes();

  // Verificar alertas de documentos do colaborador selecionado
  const selectedColabDocs = allDocs.filter(d => d.colaborador_id === formData.colaborador_id);
  const alertasDocumentos = selectedColabDocs
    .filter(d => {
      const status = getDocStatus(d.data_vencimento);
      return status.color === 'red' || status.color === 'yellow';
    })
    .map(d => ({
      tipo: d.tipo_customizado || d.tipo,
      status: getDocStatus(d.data_vencimento),
    }));

  const handleOpenDialog = (integracao?: IntegracaoComStatus) => {
    if (integracao) {
      setEditingId(integracao.id);
      setFormData({
        colaborador_id: integracao.colaborador_id,
        cliente_id: integracao.cliente_id,
        data_realizacao: integracao.data_realizacao,
        data_vencimento: integracao.data_vencimento,
        observacoes: integracao.observacoes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        colaborador_id: '',
        cliente_id: '',
        data_realizacao: new Date().toISOString().split('T')[0],
        data_vencimento: '',
        observacoes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.colaborador_id || !formData.cliente_id || !formData.data_vencimento) return;

    if (editingId) {
      await updateIntegracao.mutateAsync({
        id: editingId,
        data: {
          data_realizacao: formData.data_realizacao,
          data_vencimento: formData.data_vencimento,
          observacoes: formData.observacoes || null,
        },
      });
    } else {
      await createIntegracao.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover esta integração?')) {
      await deleteIntegracao.mutateAsync(id);
    }
  };

  // Filtrar integrações
  const integracoesFiltradas = integracoes.filter(int => {
    const nomeColab = int.colaborador?.nome_fantasia || int.colaborador?.razao_social || '';
    const nomeCliente = int.cliente?.nome_fantasia || int.cliente?.razao_social || '';
    const matchSearch = !search || 
      nomeColab.toLowerCase().includes(search.toLowerCase()) ||
      nomeCliente.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === 'todos' || int.statusFinal === filterStatus;
    
    return matchSearch && matchStatus;
  });

  // Contadores
  const contadores = {
    total: integracoes.length,
    ativos: integracoes.filter(i => i.statusFinal === 'ATIVO').length,
    aVencer: integracoes.filter(i => i.statusFinal === 'A_VENCER').length,
    bloqueados: integracoes.filter(i => i.statusFinal === 'BLOQUEADO' || i.statusFinal === 'VENCIDO').length,
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Matriz de Integrações"
        description="Controle de acesso de colaboradores às unidades industriais"
        breadcrumbs={[
          { label: "RH" },
          { label: "Integrações" },
        ]}
        actions={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Integração
          </Button>
        }
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{contadores.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-sm text-green-700">Ativos</p>
            <p className="text-2xl font-bold text-green-700">{contadores.ativos}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-700">A Vencer (15d)</p>
            <p className="text-2xl font-bold text-yellow-700">{contadores.aVencer}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">Bloqueados/Vencidos</p>
            <p className="text-2xl font-bold text-red-700">{contadores.bloqueados}</p>
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
                  placeholder="Buscar colaborador ou unidade..." 
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
                <SelectItem value="ATIVO">Ativos</SelectItem>
                <SelectItem value="A_VENCER">A Vencer</SelectItem>
                <SelectItem value="VENCIDO">Vencidos</SelectItem>
                <SelectItem value="BLOQUEADO">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="mt-4">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cliente/Unidade</TableHead>
                <TableHead className="text-center">Docs Globais</TableHead>
                <TableHead>Validade Integração</TableHead>
                <TableHead>Status Final</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
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
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">
                          {int.colaborador?.nome_fantasia || int.colaborador?.razao_social || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {int.cliente?.nome_fantasia || int.cliente?.razao_social || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <DocsGlobaisIcon status={int.statusDocsGlobais} docsVencidos={int.docsVencidos} />
                    </TableCell>
                    <TableCell>
                      {format(new Date(int.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={int.statusFinal} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(int)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(int.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
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

      {/* Dialog de Nova/Editar Integração */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Renovar Integração' : 'Nova Integração'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Atualize a validade da integração' : 'Registre uma nova integração colaborador x unidade'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Colaborador</Label>
              <Select 
                value={formData.colaborador_id} 
                onValueChange={(v) => setFormData({ ...formData, colaborador_id: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checklist automático de alertas */}
            {formData.colaborador_id && alertasDocumentos.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  {alertasDocumentos.map((a, i) => (
                    <div key={i} className="text-sm">
                      • {a.tipo}: {a.status.label}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label>Cliente/Unidade</Label>
              <Select 
                value={formData.cliente_id} 
                onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data Realização</Label>
                <Input 
                  type="date"
                  value={formData.data_realizacao}
                  onChange={(e) => setFormData({ ...formData, data_realizacao: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Validade</Label>
                <Input 
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Observações</Label>
              <Input 
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações opcionais"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.colaborador_id || !formData.cliente_id || !formData.data_vencimento || createIntegracao.isPending || updateIntegracao.isPending}
            >
              {editingId ? 'Atualizar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
