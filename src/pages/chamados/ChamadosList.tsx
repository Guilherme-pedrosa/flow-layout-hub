import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChamados, Chamado } from "@/hooks/useChamados";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Search, FileSpreadsheet, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<Chamado['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  aberto: { label: 'Aberto', variant: 'default' },
  em_execucao: { label: 'Em Execução', variant: 'secondary' },
  concluido: { label: 'Concluído', variant: 'outline' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
};

export default function ChamadosList() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { chamados, isLoading, importChamado } = useChamados();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await importChamado.mutateAsync(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const filteredChamados = chamados.filter(c => {
    const matchSearch = 
      c.os_numero.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.distrito?.toLowerCase().includes(search.toLowerCase()) ||
      c.tecnico_nome?.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    
    return matchSearch && matchStatus;
  });
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Chamados"
        description="Gerencie chamados importados do Excel"
      />
      
      {/* Área de upload */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Importar Chamado do Excel</p>
              <p className="text-sm text-muted-foreground">
                Faça upload de um arquivo Excel com o template padrão (células B5, F5, B8, F8, B11, B12, F11)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={importChamado.isPending}
            >
              {importChamado.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Selecionar Arquivo
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por OS, cliente, distrito, técnico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_execucao">Em Execução</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>TRA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>OS WAI</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredChamados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum chamado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredChamados.map(chamado => (
                  <TableRow 
                    key={chamado.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/chamados/${chamado.id}`)}
                  >
                    <TableCell className="font-medium">{chamado.os_numero}</TableCell>
                    <TableCell>
                      {chamado.os_data 
                        ? format(new Date(chamado.os_data), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {chamado.cliente?.nome_fantasia || chamado.cliente?.razao_social || chamado.cliente_nome || '-'}
                        </span>
                        {chamado.cliente_codigo && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({chamado.cliente_codigo})
                          </span>
                        )}
                        {!chamado.client_id && chamado.cliente_nome && (
                          <Badge variant="outline" className="ml-2 text-xs">Não vinculado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{chamado.distrito || '-'}</TableCell>
                    <TableCell>{chamado.tecnico_nome || '-'}</TableCell>
                    <TableCell>{chamado.tra_nome || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[chamado.status].variant}>
                        {STATUS_CONFIG[chamado.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {chamado.service_order ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/servicos/ordem-servico/${chamado.service_order_id}`);
                          }}
                        >
                          {chamado.service_order.order_number}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        <FileSpreadsheet className="mr-1 h-3 w-3" />
                        Excel
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
