import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreHorizontal, Eye, Edit, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, isBefore, startOfDay } from "date-fns";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

import { ReceivablesStatusCards, ReceivableStatusFilter } from "./ReceivablesStatusCards";
import { ReceivablesFilters, ReceivablesFiltersState } from "./ReceivablesFilters";
import { FinancialAIBanner } from "./FinancialAIBanner";
import { ExtratoList } from "./ExtratoList";
import { SortableTableHeader, SelectionSummaryBar } from "@/components/shared";
import { useSortableData } from "@/hooks/useSortableData";
import { useSelectionSum } from "@/hooks/useSelectionSum";
import { ReconciliationPanel } from "./ReconciliationPanel";

interface ReceivableRow {
  id: string;
  document_number: string | null;
  description: string | null;
  amount: number;
  due_date: string;
  issue_date: string | null;
  is_paid: boolean;
  paid_at: string | null;
  client_id: string | null;
  financial_situation_id: string | null;
  client?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
}

export function ReceivablesPage() {
  const { currentCompany } = useCompany();
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lancamentos");

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReceivableStatusFilter>("all");
  const [filters, setFilters] = useState<ReceivablesFiltersState>({
    search: "",
    clientId: "",
    situationId: "",
    currentMonth: startOfMonth(new Date()),
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentCompany?.id) {
      fetchReceivables();
    }
  }, [filters.currentMonth, currentCompany?.id]);

  const fetchReceivables = async () => {
    if (!currentCompany?.id) return;

    setLoading(true);
    try {
      const monthStart = startOfMonth(filters.currentMonth);
      const monthEnd = endOfMonth(filters.currentMonth);

      const { data, error } = await supabase
        .from("accounts_receivable")
        .select(`
          *,
          client:clientes(razao_social, nome_fantasia)
        `)
        .eq("company_id", currentCompany.id)
        .gte("due_date", monthStart.toISOString())
        .lte("due_date", monthEnd.toISOString())
        .order("due_date", { ascending: true });

      if (error) throw error;
      setReceivables((data as ReceivableRow[]) || []);
    } catch (error) {
      console.error("Erro ao carregar contas a receber:", error);
      toast.error("Erro ao carregar contas a receber");
    } finally {
      setLoading(false);
    }
  };

  // Calculate counts and amounts for status cards
  const { counts, amounts, filteredReceivables } = useMemo(() => {
    const today = startOfDay(new Date());

    const calc = {
      all: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      received: { count: 0, amount: 0 },
      today: { count: 0, amount: 0 },
    };

    receivables.forEach((r) => {
      calc.all.count++;
      calc.all.amount += r.amount;

      if (r.is_paid) {
        calc.received.count++;
        calc.received.amount += r.amount;
      } else {
        const dueDate = startOfDay(parseISO(r.due_date));
        const isToday = dueDate.getTime() === today.getTime();

        if (isToday) {
          calc.today.count++;
          calc.today.amount += r.amount;
        } else if (isBefore(dueDate, today)) {
          calc.overdue.count++;
          calc.overdue.amount += r.amount;
        } else {
          calc.pending.count++;
          calc.pending.amount += r.amount;
        }
      }
    });

    // Filter receivables based on status and search
    let filtered = receivables;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => {
        const today = startOfDay(new Date());
        if (statusFilter === "received") return r.is_paid;
        if (statusFilter === "today") {
          const dueDate = startOfDay(parseISO(r.due_date));
          return !r.is_paid && dueDate.getTime() === today.getTime();
        }
        if (statusFilter === "overdue") {
          const dueDate = startOfDay(parseISO(r.due_date));
          return !r.is_paid && isBefore(dueDate, today) && dueDate.getTime() !== today.getTime();
        }
        if (statusFilter === "pending") {
          const dueDate = startOfDay(parseISO(r.due_date));
          return !r.is_paid && !isBefore(dueDate, today) && dueDate.getTime() !== today.getTime();
        }
        return true;
      });
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.description?.toLowerCase().includes(search) ||
        r.document_number?.toLowerCase().includes(search) ||
        r.client?.razao_social?.toLowerCase().includes(search) ||
        r.client?.nome_fantasia?.toLowerCase().includes(search) ||
        r.amount.toString().includes(search)
      );
    }

    // Client filter
    if (filters.clientId) {
      filtered = filtered.filter((r) => r.client_id === filters.clientId);
    }

    // Situation filter
    if (filters.situationId) {
      filtered = filtered.filter((r) => r.financial_situation_id === filters.situationId);
    }

    return {
      counts: {
        all: calc.all.count,
        pending: calc.pending.count,
        overdue: calc.overdue.count,
        received: calc.received.count,
        today: calc.today.count,
      },
      amounts: {
        all: calc.all.amount,
        pending: calc.pending.amount,
        overdue: calc.overdue.amount,
        received: calc.received.amount,
        today: calc.today.amount,
      },
      filteredReceivables: filtered,
    };
  }, [receivables, statusFilter, filters]);

  // Sorting
  const receivablesWithSortKey = filteredReceivables.map((r) => ({
    ...r,
    _clientName: r.client?.nome_fantasia || r.client?.razao_social || "",
  }));

  const { items: sortedReceivables, requestSort, sortConfig } = useSortableData(
    receivablesWithSortKey,
    "due_date"
  );

  // Selection with sum
  const getId = useCallback((item: ReceivableRow) => item.id, []);
  const getAmount = useCallback((item: ReceivableRow) => item.amount, []);

  const {
    selectedCount,
    totalSum,
    positiveSum,
    toggleSelection,
    clearSelection,
    isSelected,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected,
  } = useSelectionSum({ items: filteredReceivables, getAmount, getId });

  const handleNewReceivable = () => {
    toast.info("Formulário de nova conta a receber em desenvolvimento");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (r: ReceivableRow) => {
    if (r.is_paid) {
      return <Badge variant="default" className="bg-success text-success-foreground">Recebido</Badge>;
    }

    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(r.due_date));
    const isToday = dueDate.getTime() === today.getTime();

    if (isToday) {
      return <Badge variant="secondary" className="bg-warning/20 text-warning border-warning">Vence Hoje</Badge>;
    }
    if (isBefore(dueDate, today)) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    return <Badge variant="secondary">A Vencer</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-6 p-0 h-auto">
          <TabsTrigger
            value="lancamentos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0 gap-2"
          >
            <FileText className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger
            value="conciliacao"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0 gap-2"
          >
            Conciliação
          </TabsTrigger>
          <TabsTrigger
            value="extrato"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 px-0 gap-2"
          >
            Extrato
          </TabsTrigger>
        </TabsList>

        {/* Lançamentos Tab */}
        <TabsContent value="lancamentos" className="mt-4 space-y-6">
          {/* AI Banner */}
          <FinancialAIBanner
            type="receivables"
            onActionClick={() => setStatusFilter("overdue")}
          />

          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold text-foreground">Contas a Receber</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie recebimentos e acompanhe cobranças
            </p>
          </div>

          {/* Status Cards */}
          <ReceivablesStatusCards
            counts={counts}
            amounts={amounts}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />

          {/* Filters */}
          <ReceivablesFilters
            filters={filters}
            onFiltersChange={setFilters}
            onAddNew={handleNewReceivable}
          />

          {/* Summary Bar */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{filteredReceivables.length}</span> de{" "}
              <span className="font-medium text-foreground">{receivables.length}</span> conta(s)
            </span>
            <span className="text-muted-foreground">
              Total do período: <span className="font-semibold text-foreground">{formatCurrency(amounts.all)}</span>
            </span>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
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
                    label="Documento"
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : sortedReceivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedReceivables.map((r) => (
                    <TableRow key={r.id} className={isSelected(r.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected(r.id)}
                          onCheckedChange={() => toggleSelection(r.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{r.document_number || "-"}</TableCell>
                      <TableCell>
                        {r.client_id ? (
                          <Link
                            to={`/cadastros/clientes?edit=${r.client_id}`}
                            className="text-primary hover:underline"
                          >
                            {r.client?.nome_fantasia || r.client?.razao_social || "-"}
                          </Link>
                        ) : (
                          <span>{r.client?.nome_fantasia || r.client?.razao_social || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.description || "-"}</TableCell>
                      <TableCell>{format(parseISO(r.due_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(r.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(r)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Selection Summary Bar */}
          <SelectionSummaryBar
            selectedCount={selectedCount}
            totalSum={totalSum}
            onClear={clearSelection}
          />
        </TabsContent>

        {/* Conciliação Tab */}
        <TabsContent value="conciliacao" className="mt-4">
          <ReconciliationPanel />
        </TabsContent>

        {/* Extrato Tab */}
        <TabsContent value="extrato" className="mt-4">
          <ExtratoList transactionTypeFilter="CREDIT" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
