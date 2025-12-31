import { useState, useEffect, useCallback } from "react";
import { PageHeader, SortableTableHeader, SelectionSummaryBar } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Send, MoreHorizontal, TrendingUp, TrendingDown, Bot } from "lucide-react";
import { FinancialAIBanner, FinancialAIChat, AIRiskBadge } from "@/components/financeiro";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortableData } from "@/hooks/useSortableData";
import { useSelectionSum } from "@/hooks/useSelectionSum";

interface Receivable {
  id: string;
  document_number: string | null;
  description: string | null;
  amount: number;
  due_date: string;
  issue_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  client_id: string | null;
  client?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
}

export default function ContasReceber() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("accounts_receivable")
        .select(`
          *,
          client:clientes(razao_social, nome_fantasia)
        `)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setReceivables((data as Receivable[]) || []);
    } catch (error) {
      console.error("Erro ao carregar contas a receber:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const today = new Date();

  // Calculate totals
  const totals = receivables.reduce(
    (acc, r) => {
      const dueDate = parseISO(r.due_date);
      const isOverdue = !r.is_paid && dueDate < today;
      const isDueSoon = !r.is_paid && !isOverdue && differenceInDays(dueDate, today) <= 7;

      acc.total += r.amount;
      if (!r.is_paid && !isOverdue) acc.toReceive += r.amount;
      if (isOverdue) acc.overdue += r.amount;
      if (r.is_paid) acc.received += r.amount;
      if (isDueSoon) acc.dueSoonCount++;
      if (isOverdue) acc.overdueCount++;

      return acc;
    },
    { total: 0, toReceive: 0, overdue: 0, received: 0, dueSoonCount: 0, overdueCount: 0 }
  );

  // Filter receivables
  const filteredReceivables = receivables.filter((r) => {
    const dueDate = parseISO(r.due_date);
    const isOverdue = !r.is_paid && dueDate < today;

    if (activeTab === "a_vencer" && (r.is_paid || isOverdue)) return false;
    if (activeTab === "vencidas" && (!isOverdue || r.is_paid)) return false;
    if (activeTab === "recebidas" && !r.is_paid) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        r.document_number?.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search) ||
        r.client?.razao_social?.toLowerCase().includes(search) ||
        r.client?.nome_fantasia?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Ordenação com 3 estados
  const receivablesWithSortKey = filteredReceivables.map(r => ({
    ...r,
    _clientName: r.client?.nome_fantasia || r.client?.razao_social || ""
  }));
  
  const { items: sortedReceivables, requestSort, sortConfig } = useSortableData(receivablesWithSortKey, 'due_date');

  // Seleção com soma
  const getId = useCallback((item: Receivable) => item.id, []);
  const getAmount = useCallback((item: Receivable) => item.amount, []);
  
  const {
    selectedCount,
    totalSum,
    positiveSum,
    toggleSelection,
    clearSelection,
    isSelected,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected
  } = useSelectionSum({ items: filteredReceivables, getAmount, getId });

  const getStatus = (r: Receivable) => {
    if (r.is_paid) return { label: "Recebido", variant: "default" as const, days: r.paid_at ? `Em ${format(parseISO(r.paid_at), "dd/MM/yyyy")}` : "" };
    
    const dueDate = parseISO(r.due_date);
    const diffDays = differenceInDays(dueDate, today);
    
    if (diffDays < 0) {
      return { label: "Vencido", variant: "destructive" as const, days: `(${Math.abs(diffDays)} dias)` };
    }
    return { label: "A Vencer", variant: "secondary" as const, days: `(${diffDays} dias)` };
  };

  const getRiskBadge = (r: Receivable) => {
    if (r.is_paid) return null;
    
    const dueDate = parseISO(r.due_date);
    const diffDays = differenceInDays(today, dueDate);
    
    if (diffDays > 30) return <AIRiskBadge type="high_risk" className="ml-2" />;
    if (diffDays > 0 && diffDays <= 15) return <AIRiskBadge type="attention" className="ml-2" />;
    
    // Check if client is a good payer (mock logic - in real app would check history)
    if (diffDays <= 0 && r.amount > 5000) return <AIRiskBadge type="good_payer" className="ml-2" />;
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Início</span>
        <span>›</span>
        <span>Financeiro</span>
        <span>›</span>
        <span className="text-foreground">Contas a Receber</span>
      </nav>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground">Contas a Receber</h1>

      {/* AI Banner */}
      <FinancialAIBanner type="receivables" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-6 p-0 h-auto">
          <TabsTrigger 
            value="todas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0"
          >
            Todas
          </TabsTrigger>
          <TabsTrigger 
            value="a_vencer" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0"
          >
            A Vencer
            <Badge variant="secondary" className="ml-2">{totals.dueSoonCount + (receivables.filter(r => !r.is_paid && parseISO(r.due_date) >= today).length)}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="vencidas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0"
          >
            Vencidas
            <Badge variant="destructive" className="ml-2">{totals.overdueCount}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="recebidas" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0"
          >
            Recebidas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total a Receber</span>
              <Badge variant="outline" className="text-emerald-500 bg-emerald-500/10">
                <TrendingUp className="h-3 w-3 mr-1" />
                0,5%
              </Badge>
            </div>
            <p className="text-2xl font-bold mt-2">{formatCurrency(totals.total)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">A Vencer</span>
              <Badge variant="outline" className="text-blue-500 bg-blue-500/10">
                <TrendingUp className="h-3 w-3 mr-1" />
                2,8%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(totals.toReceive)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vencidos</span>
              <Badge variant="outline" className="text-red-500 bg-red-500/10">
                <TrendingDown className="h-3 w-3 mr-1" />
                1,3%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totals.overdue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recebido no Mês</span>
              <Badge variant="outline" className="text-emerald-500 bg-emerald-500/10">
                <TrendingUp className="h-3 w-3 mr-1" />
                5,8%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totals.received)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select defaultValue="todos">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Cliente: Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="este_mes">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Vencimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="este_mes">Vencimento: Este mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Aplicar</Button>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Selection Actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-4 py-3 px-4 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">{selectedCount} itens selecionados</span>
          <Button variant="default" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Enviar Cobrança
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Baixar Títulos
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                  className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                />
              </TableHead>
              <SortableTableHeader
                label="Número"
                sortKey="document_number"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Cliente"
                sortKey="_clientName"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <TableHead>Descrição</TableHead>
              <SortableTableHeader
                label="Emissão"
                sortKey="issue_date"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Vencimento"
                sortKey="due_date"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Valor"
                sortKey="amount"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
                className="text-right"
              />
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredReceivables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada
                </TableCell>
              </TableRow>
            ) : (
              sortedReceivables.map((r) => {
                const status = getStatus(r);
                return (
                  <TableRow key={r.id} className={isSelected(r.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected(r.id)}
                        onCheckedChange={() => toggleSelection(r.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.document_number || "-"}</TableCell>
                    <TableCell>{r.client?.nome_fantasia || r.client?.razao_social || "-"}</TableCell>
                    <TableCell>{r.description || "-"}</TableCell>
                    <TableCell>
                      {r.issue_date ? format(parseISO(r.issue_date), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(r.due_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">{status.days}</span>
                        {getRiskBadge(r)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Mostrando 1-{Math.min(8, filteredReceivables.length)} de {filteredReceivables.length}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled>←</Button>
          <Button variant="default" size="sm">1</Button>
          <Button variant="outline" size="sm">2</Button>
          <Button variant="outline" size="sm">3</Button>
          <span>...</span>
          <Button variant="outline" size="sm">5</Button>
          <Button variant="outline" size="sm">Próximo</Button>
        </div>
      </div>

      {/* AI Chat */}
      <FinancialAIChat />

      {/* Barra de soma flutuante */}
      <SelectionSummaryBar
        selectedCount={selectedCount}
        totalSum={totalSum}
        onClear={clearSelection}
      />
    </div>
  );
}
