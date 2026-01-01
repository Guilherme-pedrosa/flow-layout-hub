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
  Plus, 
  MoreHorizontal, 
  Eye, 
  FileText, 
  Send, 
  Copy,
  Download,
  Search,
  Calendar,
  XCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type PeriodoFiltro = "hoje" | "esta_semana" | "mes_passado" | "este_mes" | "proximo_mes" | "todo_periodo";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  processando: { label: "Processando", variant: "outline" },
  autorizada: { label: "Autorizada", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  erro: { label: "Erro", variant: "destructive" },
};

export default function NotasFiscaisPage() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("este_mes");
  const [busca, setBusca] = useState("");

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
        .eq("tipo", "nfe")
        .order("data_emissao", { ascending: false });

      const { inicio, fim } = getDateRange();
      if (inicio && fim) {
        query = query
          .gte("data_emissao", format(inicio, "yyyy-MM-dd"))
          .lte("data_emissao", format(fim, "yyyy-MM-dd"));
      }

      if (busca) {
        query = query.or(`destinatario_nome.ilike.%${busca}%,numero.ilike.%${busca}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const handleEmitir = async (notaId: string) => {
    toast.info("Emitindo NF-e...");
    // TODO: Chamar API de emissão
  };

  const handleCancelar = async (notaId: string) => {
    toast.info("Cancelando NF-e...");
    // TODO: Chamar API de cancelamento
  };

  const handleDuplicar = (notaId: string) => {
    navigate(`/notas-fiscais/adicionar?duplicar=${notaId}`);
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

  // Calcular totais
  const totais = {
    quantidade: notas?.length || 0,
    valor: notas?.reduce((acc, n) => acc + (n.valor_total || 0), 0) || 0,
    autorizadas: notas?.filter(n => n.status === "autorizada").length || 0,
    pendentes: notas?.filter(n => n.status === "rascunho" || n.status === "processando").length || 0,
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

        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={(v: PeriodoFiltro) => setPeriodo(v)}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue>{getPeriodoLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="esta_semana">Esta semana</SelectItem>
              <SelectItem value="mes_passado">Mês passado</SelectItem>
              <SelectItem value="este_mes">Este mês</SelectItem>
              <SelectItem value="proximo_mes">Próximo mês</SelectItem>
              <SelectItem value="todo_periodo">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou destinatário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 w-[300px]"
          />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totais.quantidade}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totais.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Autorizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totais.autorizadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totais.pendentes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Natureza</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : notas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma nota fiscal encontrada
                  </TableCell>
                </TableRow>
              ) : (
                notas?.map((nota: any) => (
                  <TableRow key={nota.id}>
                    <TableCell className="font-medium">{nota.numero || '-'}</TableCell>
                    <TableCell>{nota.serie || '1'}</TableCell>
                    <TableCell>
                      {nota.data_emissao ? format(new Date(nota.data_emissao), "dd/MM/yyyy") : '-'}
                    </TableCell>
                    <TableCell>{nota.destinatario_nome || '-'}</TableCell>
                    <TableCell>{nota.natureza_operacao || '-'}</TableCell>
                    <TableCell className="text-right">
                      {(nota.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[nota.status]?.variant || "secondary"}>
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
                          <DropdownMenuItem onClick={() => navigate(`/notas-fiscais/${nota.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          
                          {nota.status === "rascunho" && (
                            <DropdownMenuItem onClick={() => handleEmitir(nota.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Emitir
                            </DropdownMenuItem>
                          )}
                          
                          {nota.status === "autorizada" && (
                            <>
                              <DropdownMenuItem onClick={() => window.open(nota.danfe_url, '_blank')}>
                                <FileText className="h-4 w-4 mr-2" />
                                DANFE
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(nota.xml_url, '_blank')}>
                                <Download className="h-4 w-4 mr-2" />
                                XML
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          <DropdownMenuItem onClick={() => handleDuplicar(nota.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {nota.status === "autorizada" && (
                            <DropdownMenuItem 
                              onClick={() => handleCancelar(nota.id)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
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
    </div>
  );
}
