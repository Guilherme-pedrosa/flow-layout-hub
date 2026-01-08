import { useState, useMemo, useRef } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Search, Plus, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChamadosList() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { chamados, isLoading, importChamado, exportToExcel, calcularDias } = useChamados();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const filteredChamados = useMemo(() => {
    if (!chamados) return [];

    return chamados.filter((chamado) => {
      const matchesSearch =
        chamado.os_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.nome_gt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chamado.distrito?.toLowerCase().includes(searchTerm.toLowerCase());

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
    const config = STATUS_CONFIG[status] || { label: status, className: '' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chamados</h1>
          <p className="text-muted-foreground">
            Gerencie todos os chamados da Ecolab
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate("/chamados/novo")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Chamado
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={!chamados.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.abertos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.emAndamento}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fechados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.fechados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por OS, cliente ou técnico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Status" />
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
      <Card>
        <CardHeader>
          <CardTitle>Lista de Chamados</CardTitle>
          <CardDescription>
            {filteredChamados.length} chamado(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredChamados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum chamado encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº OS</TableHead>
                    <TableHead>Nº Tarefa</TableHead>
                    <TableHead>Data OS</TableHead>
                    <TableHead>Data Atend.</TableHead>
                    <TableHead>Data Fech.</TableHead>
                    <TableHead>Nº Dias</TableHead>
                    <TableHead>Distrito</TableHead>
                    <TableHead>Nome GT</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="max-w-xs">Observação</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChamados.map((chamado) => (
                    <TableRow 
                      key={chamado.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/chamados/${chamado.id}`)}
                    >
                      <TableCell className="font-medium">{chamado.os_numero}</TableCell>
                      <TableCell>{chamado.numero_tarefa || '-'}</TableCell>
                      <TableCell>
                        {chamado.os_data 
                          ? format(new Date(chamado.os_data), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {chamado.data_atendimento 
                          ? format(new Date(chamado.data_atendimento), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {chamado.data_fechamento 
                          ? format(new Date(chamado.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{calcularDias(chamado.os_data)}</TableCell>
                      <TableCell>{chamado.distrito || '-'}</TableCell>
                      <TableCell>{chamado.nome_gt || '-'}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {chamado.cliente_nome || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[150px] truncate">
                          {chamado.observacao || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(chamado.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
