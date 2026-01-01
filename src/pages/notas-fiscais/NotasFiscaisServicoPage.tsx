import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  FileText, 
  Send, 
  Copy,
  Download,
  Search,
  Calendar as CalendarIcon,
  XCircle,
  X,
  RefreshCw
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNFSeEmissor } from "@/hooks/useNFSeEmissor";

type StatusFiltro = "todos" | "rascunho" | "processando" | "autorizada" | "cancelada" | "erro";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  rascunho: { label: "Rascunho", variant: "secondary", color: "bg-gray-100 text-gray-800" },
  processando: { label: "Processando", variant: "outline", color: "bg-blue-100 text-blue-800" },
  autorizada: { label: "Autorizada", variant: "default", color: "bg-green-100 text-green-800" },
  cancelada: { label: "Cancelada", variant: "destructive", color: "bg-red-100 text-red-800" },
  erro: { label: "Erro", variant: "destructive", color: "bg-orange-100 text-orange-800" },
};

export default function NotasFiscaisServicoPage() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const { cancelar, consultar, loading: nfseLoading } = useNFSeEmissor();
  
  // Filtros
  const [dataInicio, setDataInicio] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | undefined>(endOfMonth(new Date()));
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [busca, setBusca] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: notas, isLoading, refetch } = useQuery({
    queryKey: ["notas-fiscais-servico", currentCompany?.id, dataInicio, dataFim, statusFiltro, busca],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from("notas_fiscais")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("tipo", "nfse")
        .order("data_emissao", { ascending: false });

      if (dataInicio) {
        query = query.gte("data_emissao", format(dataInicio, "yyyy-MM-dd"));
      }
      if (dataFim) {
        query = query.lte("data_emissao", format(dataFim, "yyyy-MM-dd'T'23:59:59"));
      }

      if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }

      if (busca) {
        query = query.or(`destinatario_nome.ilike.%${busca}%,numero.ilike.%${busca}%,destinatario_cpf_cnpj.ilike.%${busca}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const handleEmitir = async (notaId: string) => {
    navigate(`/notas-fiscais-servico/emitir?id=${notaId}`);
  };

  const handleCancelar = async (nota: any) => {
    const justificativa = prompt("Informe a justificativa do cancelamento (mínimo 15 caracteres):");
    if (!justificativa) return;
    
    if (justificativa.length < 15) {
      toast.error("Justificativa deve ter no mínimo 15 caracteres");
      return;
    }

    const result = await cancelar(nota.referencia, justificativa);
    if (result.success) {
      refetch();
    }
  };

  const handleConsultar = async (nota: any) => {
    toast.info("Consultando status na prefeitura...");
    const result = await consultar(nota.referencia);
    if (result.success) {
      toast.success(`Status: ${result.status}`);
      refetch();
    }
  };

  const handleDuplicar = (notaId: string) => {
    navigate(`/notas-fiscais-servico/emitir?duplicar=${notaId}`);
  };

  const limparFiltros = () => {
    setDataInicio(startOfMonth(new Date()));
    setDataFim(endOfMonth(new Date()));
    setStatusFiltro("todos");
    setBusca("");
  };

  const filtrosAtivos = statusFiltro !== "todos" || busca !== "";

  // Calcular totais
  const totais = {
    quantidade: notas?.length || 0,
    valor: notas?.reduce((acc, n) => acc + (n.valor_total || 0), 0) || 0,
    autorizadas: notas?.filter(n => n.status === "autorizada").length || 0,
    pendentes: notas?.filter(n => n.status === "rascunho" || n.status === "processando").length || 0,
    canceladas: notas?.filter(n => n.status === "cancelada").length || 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notas Fiscais de Serviço (NFS-e)</h1>
          <p className="text-muted-foreground">Gerencie suas notas fiscais de serviço - Prefeitura de Anápolis</p>
        </div>
        <Button asChild className="bg-green-600 hover:bg-green-700">
          <Link to="/notas-fiscais-servico/emitir">
            <Plus className="h-4 w-4 mr-2" />
            Nova NFS-e
          </Link>
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filtro de Data */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={setDataInicio}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">até</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={setDataFim}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro de Status */}
            <Select value={statusFiltro} onValueChange={(v: StatusFiltro) => setStatusFiltro(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="autorizada">Autorizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>

            {/* Busca */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, tomador ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
              {busca && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setBusca("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              
              {filtrosAtivos && (
                <Button variant="ghost" onClick={limparFiltros}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFiltro("todos")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.quantidade}</div>
            <p className="text-xs text-muted-foreground">
              {totais.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer hover:bg-accent/50",
            statusFiltro === "autorizada" && "ring-2 ring-green-500"
          )} 
          onClick={() => setStatusFiltro("autorizada")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Autorizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totais.autorizadas}</div>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer hover:bg-accent/50",
            statusFiltro === "processando" && "ring-2 ring-blue-500"
          )} 
          onClick={() => setStatusFiltro("processando")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Processando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {notas?.filter(n => n.status === "processando").length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer hover:bg-accent/50",
            statusFiltro === "rascunho" && "ring-2 ring-yellow-500"
          )} 
          onClick={() => setStatusFiltro("rascunho")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Rascunhos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totais.pendentes}</div>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer hover:bg-accent/50",
            statusFiltro === "cancelada" && "ring-2 ring-red-500"
          )} 
          onClick={() => setStatusFiltro("cancelada")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Canceladas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totais.canceladas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Número</TableHead>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Tomador</TableHead>
                <TableHead className="w-[150px]">CPF/CNPJ</TableHead>
                <TableHead>Discriminação</TableHead>
                <TableHead className="text-right w-[120px]">Valor</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : notas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    Nenhuma nota fiscal de serviço encontrada
                    {filtrosAtivos && (
                      <p className="mt-2">
                        <Button variant="link" onClick={limparFiltros}>
                          Limpar filtros
                        </Button>
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                notas?.map((nota: any) => (
                  <TableRow key={nota.id} className="cursor-pointer hover:bg-accent/50">
                    <TableCell className="font-medium font-mono">
                      {nota.numero || '-'}
                    </TableCell>
                    <TableCell>
                      {nota.data_emissao ? format(new Date(nota.data_emissao), "dd/MM/yyyy") : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={nota.destinatario_nome}>
                      {nota.destinatario_nome || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {nota.destinatario_cpf_cnpj || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={nota.natureza_operacao}>
                      {nota.natureza_operacao || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(nota.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-normal", statusConfig[nota.status]?.color)}>
                        {statusConfig[nota.status]?.label || nota.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/notas-fiscais-servico/${nota.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          
                          {nota.status === "rascunho" && (
                            <DropdownMenuItem onClick={() => handleEmitir(nota.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Emitir
                            </DropdownMenuItem>
                          )}

                          {nota.status === "processando" && (
                            <DropdownMenuItem onClick={() => handleConsultar(nota)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Consultar Status
                            </DropdownMenuItem>
                          )}
                          
                          {nota.status === "autorizada" && (
                            <>
                              {nota.danfe_url && (
                                <DropdownMenuItem onClick={() => window.open(nota.danfe_url, '_blank')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  PDF da Nota
                                </DropdownMenuItem>
                              )}
                              {nota.xml_url && (
                                <DropdownMenuItem onClick={() => window.open(nota.xml_url, '_blank')}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download XML
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          
                          <DropdownMenuItem onClick={() => handleDuplicar(nota.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          
                          {nota.status === "autorizada" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancelar(nota)}
                                className="text-destructive"
                                disabled={nfseLoading}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar NFS-e
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rodapé com código de verificação */}
      {notas && notas.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Clique em uma nota para ver detalhes e o código de verificação.
        </div>
      )}
    </div>
  );
}
