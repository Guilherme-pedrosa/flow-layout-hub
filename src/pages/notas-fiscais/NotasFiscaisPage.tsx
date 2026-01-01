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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  FileText, 
  Send, 
  Copy,
  Download,
  Search,
  Filter,
  Settings2,
  Calendar
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type NotaFiscal = {
  id: string;
  numero: number;
  serie: number;
  pedido_id: string | null;
  pedido_numero: string | null;
  tipo: "entrada" | "saida";
  data_emissao: string;
  destinatario_nome: string;
  destinatario_documento: string;
  natureza_operacao: string;
  valor_total: number;
  situacao: "em_aberto" | "autorizada" | "cancelada" | "rejeitada" | "denegada" | "inutilizada";
  chave_acesso: string | null;
  xml_url: string | null;
  danfe_url: string | null;
};

type PeriodoFiltro = "hoje" | "esta_semana" | "mes_passado" | "este_mes" | "proximo_mes" | "todo_periodo" | "personalizado";

const situacaoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  em_aberto: { label: "Em aberto", variant: "secondary" },
  autorizada: { label: "Autorizada", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
  denegada: { label: "Denegada", variant: "outline" },
  inutilizada: { label: "Inutilizada", variant: "outline" },
};

export default function NotasFiscaisPage() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("este_mes");
  const [busca, setBusca] = useState("");
  const [buscaAvancadaOpen, setBuscaAvancadaOpen] = useState(false);
  const [colunasVisiveis, setColunasVisiveis] = useState({
    numero: true,
    serie: true,
    pedido: true,
    tipo: false,
    data: true,
    destinatario: true,
    natureza: true,
    valor: true,
    situacao: true,
  });

  const getDateRange = () => {
    const hoje = new Date();
    switch (periodo) {
      case "hoje":
        return { inicio: hoje, fim: hoje };
      case "esta_semana":
        return { inicio: startOfWeek(hoje, { locale: ptBR }), fim: endOfWeek(hoje, { locale: ptBR }) };
      case "mes_passado":
        const mesPassado = subMonths(hoje, 1);
        return { inicio: startOfMonth(mesPassado), fim: endOfMonth(mesPassado) };
      case "este_mes":
        return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
      case "proximo_mes":
        const proximoMes = addMonths(hoje, 1);
        return { inicio: startOfMonth(proximoMes), fim: endOfMonth(proximoMes) };
      case "todo_periodo":
        return { inicio: null, fim: null };
      default:
        return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
    }
  };

  const { data: notas, isLoading, refetch } = useQuery({
    queryKey: ["notas-fiscais", currentCompany?.id, periodo, busca],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from("notas_fiscais")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("data_emissao", { ascending: false });

      const { inicio, fim } = getDateRange();
      if (inicio && fim) {
        query = query
          .gte("data_emissao", format(inicio, "yyyy-MM-dd"))
          .lte("data_emissao", format(fim, "yyyy-MM-dd"));
      }

      if (busca) {
        query = query.or(`destinatario_nome.ilike.%${busca}%,numero.eq.${parseInt(busca) || 0}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NotaFiscal[];
    },
    enabled: !!currentCompany?.id,
  });

  const handleEmitir = async (nota: NotaFiscal) => {
    toast.info("Emitindo NF-e...");
    // Chamar API de emissão
  };

  const handleCancelar = async (nota: NotaFiscal) => {
    toast.info("Cancelando NF-e...");
    // Chamar API de cancelamento
  };

  const handleDuplicar = (nota: NotaFiscal) => {
    navigate(`/notas-fiscais/adicionar?duplicar=${nota.id}`);
  };

  const getPeriodoLabel = () => {
    const hoje = new Date();
    switch (periodo) {
      case "hoje": return "Hoje";
      case "esta_semana": return "Esta semana";
      case "mes_passado": return format(subMonths(hoje, 1), "MMMM 'de' yyyy", { locale: ptBR });
      case "este_mes": return format(hoje, "MMMM 'de' yyyy", { locale: ptBR });
      case "proximo_mes": return format(addMonths(hoje, 1), "MMMM 'de' yyyy", { locale: ptBR });
      case "todo_periodo": return "Todo o período";
      default: return "Selecione";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          <span className="text-foreground font-medium">NF-e</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild className="bg-green-600 hover:bg-green-700">
          <Link to="/notas-fiscais/adicionar">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Mais ações
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Exportar XML</DropdownMenuItem>
            <DropdownMenuItem>Exportar Excel</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Inutilizar numeração</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="p-2 font-medium text-sm">Gerenciar colunas</div>
            <DropdownMenuSeparator />
            {Object.entries(colunasVisiveis).map(([key, visible]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => setColunasVisiveis(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
              >
                <input type="checkbox" checked={visible} readOnly className="mr-2" />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              {getPeriodoLabel()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setPeriodo("hoje")}>Hoje</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodo("esta_semana")}>Esta semana</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodo("mes_passado")}>Mês passado</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodo("este_mes")}>Este mês</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodo("proximo_mes")}>Próximo mês</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriodo("todo_periodo")}>Todo o período</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setBuscaAvancadaOpen(true)}>Escolha o período</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" onClick={() => setBuscaAvancadaOpen(true)}>
          <Filter className="h-4 w-4 mr-2" />
          Busca avançada
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {colunasVisiveis.numero && <TableHead>Nº</TableHead>}
                {colunasVisiveis.serie && <TableHead>Série</TableHead>}
                {colunasVisiveis.pedido && <TableHead>Pedido</TableHead>}
                {colunasVisiveis.tipo && <TableHead>Tipo</TableHead>}
                {colunasVisiveis.data && <TableHead>Data</TableHead>}
                {colunasVisiveis.destinatario && <TableHead>Destinatário</TableHead>}
                {colunasVisiveis.natureza && <TableHead>Natureza da operação</TableHead>}
                {colunasVisiveis.valor && <TableHead className="text-right">Valor</TableHead>}
                {colunasVisiveis.situacao && <TableHead>Situação</TableHead>}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : notas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhuma nota fiscal encontrada
                  </TableCell>
                </TableRow>
              ) : (
                notas?.map((nota) => (
                  <TableRow key={nota.id}>
                    {colunasVisiveis.numero && <TableCell>{nota.numero}</TableCell>}
                    {colunasVisiveis.serie && <TableCell>{nota.serie}</TableCell>}
                    {colunasVisiveis.pedido && (
                      <TableCell>
                        {nota.pedido_numero ? (
                          <Link to={`/vendas/${nota.pedido_id}`} className="text-blue-600 hover:underline">
                            #{nota.pedido_numero}
                          </Link>
                        ) : "-"}
                      </TableCell>
                    )}
                    {colunasVisiveis.tipo && (
                      <TableCell>{nota.tipo === "entrada" ? "Entrada" : "Saída"}</TableCell>
                    )}
                    {colunasVisiveis.data && (
                      <TableCell>{format(new Date(nota.data_emissao), "dd/MM/yyyy")}</TableCell>
                    )}
                    {colunasVisiveis.destinatario && (
                      <TableCell>
                        <Link to={`/cadastros/pessoas/${nota.destinatario_documento}`} className="text-blue-600 hover:underline">
                          {nota.destinatario_nome}
                        </Link>
                      </TableCell>
                    )}
                    {colunasVisiveis.natureza && <TableCell>{nota.natureza_operacao}</TableCell>}
                    {colunasVisiveis.valor && (
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(nota.valor_total)}
                      </TableCell>
                    )}
                    {colunasVisiveis.situacao && (
                      <TableCell>
                        <Badge variant={situacaoConfig[nota.situacao]?.variant || "secondary"}>
                          {situacaoConfig[nota.situacao]?.label || nota.situacao}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/notas-fiscais/${nota.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/notas-fiscais/${nota.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {nota.situacao === "em_aberto" && (
                              <DropdownMenuItem onClick={() => handleEmitir(nota)}>
                                <Send className="h-4 w-4 mr-2" />
                                Emitir NF-e
                              </DropdownMenuItem>
                            )}
                            {nota.danfe_url && (
                              <DropdownMenuItem asChild>
                                <a href={nota.danfe_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Imprimir DANFE
                                </a>
                              </DropdownMenuItem>
                            )}
                            {nota.xml_url && (
                              <DropdownMenuItem asChild>
                                <a href={nota.xml_url} download>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar XML
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Send className="h-4 w-4 mr-2" />
                              Compartilhar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDuplicar(nota)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar NF-e
                            </DropdownMenuItem>
                            {nota.situacao === "autorizada" && (
                              <DropdownMenuItem onClick={() => handleCancelar(nota)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancelar NF-e
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando {notas?.length || 0} registros</span>
      </div>

      {/* Dialog de Busca Avançada */}
      <Dialog open={buscaAvancadaOpen} onOpenChange={setBuscaAvancadaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Busca Avançada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Número da nota</label>
              <Input placeholder="Digite o número" />
            </div>
            <div>
              <label className="text-sm font-medium">Destinatário</label>
              <Input placeholder="Nome ou CNPJ/CPF" />
            </div>
            <div>
              <label className="text-sm font-medium">Situação</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="em_aberto">Em aberto</SelectItem>
                  <SelectItem value="autorizada">Autorizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Data inicial</label>
                <Input type="date" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Data final</label>
                <Input type="date" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBuscaAvancadaOpen(false)}>Cancelar</Button>
              <Button>Buscar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
