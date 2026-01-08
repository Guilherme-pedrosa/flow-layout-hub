import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChamados, STATUS_CONFIG, ChamadoStatus } from "@/hooks/useChamados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Search, Plus, Download, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChamadosList() {
  const navigate = useNavigate();
  const { chamados, isLoading, importChamado, exportToExcel, deleteChamado } = useChamados();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const filteredChamados = useMemo(() => {
    if (!chamados) return [];

    return chamados.filter((chamado) => {
      const matchesSearch =
        chamado.os_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.nome_gt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.tecnico_nome?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "todos" || chamado.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [chamados, searchTerm, statusFilter]);
  
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    await importChamado.mutateAsync(selectedFile);
    setUploadDialogOpen(false);
    setSelectedFile(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteChamado.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const calcularDias = (dataOs: string | null | undefined): number => {
    if (!dataOs) return 0;
    try {
      const osDate = new Date(dataOs);
      const today = new Date();
      return differenceInDays(today, osDate);
    } catch {
      return 0;
    }
  };
  
  const stats = useMemo(() => {
    if (!chamados) return { total: 0, abertos: 0, emAndamento: 0, fechados: 0 };

    return {
      total: chamados.length,
      abertos: chamados.filter(c => c.status === "aguardando_agendamento").length,
      emAndamento: chamados.filter(c => ['agendado', 'ag_retorno', 'atendido_ag_fechamento'].includes(c.status)).length,
      fechados: chamados.filter(c => c.status === "fechado").length,
    };
  }, [chamados]);

  const getStatusBadge = (status: ChamadoStatus) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Badge>{status}</Badge>;
    
    return (
      <Badge 
        className="whitespace-nowrap text-xs font-medium"
        style={{ 
          backgroundColor: config.color, 
          color: 'white',
          border: 'none'
        }}
      >
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chamados</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie todos os chamados da Ecolab
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate("/chamados/novo")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Chamado
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={!chamados?.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Upload className="mr-2 h-4 w-4" />
                Importar Planilha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Planilha Excel</DialogTitle>
                <DialogDescription>
                  Selecione um arquivo Excel (.xlsx) contendo os chamados para importar
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Arquivo Excel</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || importChamado.isPending}
                  className="w-full"
                >
                  {importChamado.isPending ? "Importando..." : "Importar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.abertos}</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.emAndamento}</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fechados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.fechados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por OS, cliente ou técnico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aguardando_agendamento">Aguardando agendamento</SelectItem>
                <SelectItem value="agendado">Agendado - ag atendimento</SelectItem>
                <SelectItem value="ag_retorno">Ag retorno</SelectItem>
                <SelectItem value="atendido_ag_fechamento">Atendido - Ag fechamento</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de chamados */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Lista de Chamados</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredChamados.length} chamado(s) encontrado(s)
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredChamados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum chamado encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">N° OS</TableHead>
                    <TableHead className="font-semibold">N° Tarefa</TableHead>
                    <TableHead className="font-semibold">Data OS</TableHead>
                    <TableHead className="font-semibold">Data Atend.</TableHead>
                    <TableHead className="font-semibold">Data Fech.</TableHead>
                    <TableHead className="font-semibold">N° Dias</TableHead>
                    <TableHead className="font-semibold">Distrito</TableHead>
                    <TableHead className="font-semibold">Nome GT</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Observação</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChamados.map((chamado) => (
                    <TableRow key={chamado.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{chamado.os_numero}</TableCell>
                      <TableCell>{chamado.numero_tarefa || '-'}</TableCell>
                      <TableCell>{formatDate(chamado.os_data)}</TableCell>
                      <TableCell>{formatDate(chamado.data_atendimento)}</TableCell>
                      <TableCell>{formatDate(chamado.data_fechamento)}</TableCell>
                      <TableCell>{calcularDias(chamado.os_data)}</TableCell>
                      <TableCell>{chamado.distrito || '-'}</TableCell>
                      <TableCell>{chamado.nome_gt || '-'}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={chamado.cliente_nome || ''}>
                          {chamado.cliente_nome || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate" title={chamado.observacao || ''}>
                          {chamado.observacao || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(chamado.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/chamados/${chamado.id}`);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/chamados/${chamado.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(chamado.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
