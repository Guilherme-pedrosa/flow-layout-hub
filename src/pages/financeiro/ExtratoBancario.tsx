import { useState, useEffect, useCallback } from "react";
import { PageHeader, SortableTableHeader, SelectionSummaryBar } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { useSortableData } from "@/hooks/useSortableData";
import { useSelectionSum } from "@/hooks/useSelectionSum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  RefreshCw, 
  Download, 
  Check, 
  X, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCompany } from "@/contexts/CompanyContext";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
}

export default function ExtratoBancario() {
  const { currentCompany } = useCompany();
  const { insights, dismiss, markAsRead } = useAiInsights('financial');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [hasCredentials, setHasCredentials] = useState(false);
  
  // Período padrão: últimos 60 dias (para incluir mês anterior)
  const today = new Date();
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const [dateFrom, setDateFrom] = useState(sixtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);

  // Ordenação com 3 estados
  const { items: sortedTransactions, requestSort, sortConfig } = useSortableData(transactions, 'transaction_date');

  // Seleção com soma
  const getId = useCallback((item: BankTransaction) => item.id, []);
  const getAmount = useCallback((item: BankTransaction) => item.amount, []);
  
  const {
    selectedCount,
    totalSum,
    positiveSum,
    negativeSum,
    selectedIds,
    toggleSelection,
    clearSelection,
    isSelected,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected
  } = useSelectionSum({ items: transactions, getAmount, getId });

  useEffect(() => {
    if (currentCompany?.id) {
      checkCredentials();
      loadTransactions();
    }
  }, [dateFrom, dateTo, currentCompany?.id]);

  const checkCredentials = async () => {
    if (!currentCompany?.id) return;
    
    const { data } = await supabase
      .from("inter_credentials")
      .select("id")
      .eq("company_id", currentCompany.id)
      .maybeSingle();
    
    setHasCredentials(!!data);
  };

  const loadTransactions = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", currentCompany.id)
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar extrato");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!currentCompany?.id) {
      toast.error("Selecione uma empresa");
      return;
    }
    
    if (!hasCredentials) {
      toast.error("Configure as credenciais do Banco Inter primeiro");
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("inter-mtls", {
        body: {
          company_id: currentCompany.id,
          date_from: dateFrom,
          date_to: dateTo,
        },
      });

      if (error) throw error;

      toast.success(`Sincronização concluída! ${data?.imported || 0} transações importadas.`);
      loadTransactions();
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      toast.error(error.message || "Erro ao sincronizar com Banco Inter");
    } finally {
      setSyncing(false);
    }
  };

  const handleReconcile = async (id: string, reconciled: boolean) => {
    try {
      const { error } = await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: reconciled,
          reconciled_at: reconciled ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;

      setTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, is_reconciled: reconciled } : t)
      );

      toast.success(reconciled ? "Transação conciliada" : "Conciliação removida");
    } catch (error) {
      console.error("Erro ao conciliar:", error);
      toast.error("Erro ao atualizar conciliação");
    }
  };

  const handleBulkReconcile = async () => {
    if (selectedCount === 0) return;

    const idsToReconcile = Array.from(selectedIds);
    
    try {
      const { error } = await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
        })
        .in("id", idsToReconcile);

      if (error) throw error;

      setTransactions(prev =>
        prev.map(t => idsToReconcile.includes(t.id) ? { ...t, is_reconciled: true } : t)
      );
      clearSelection();

      toast.success(`${idsToReconcile.length} transações conciliadas`);
    } catch (error) {
      console.error("Erro ao conciliar em lote:", error);
      toast.error("Erro ao conciliar transações");
    }
  };

  // Totais
  const totalCredits = transactions
    .filter(t => t.type === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter(t => t.type === "DEBIT")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const pendingCount = transactions.filter(t => !t.is_reconciled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extrato Bancário"
        description="Conciliação de transações com o Banco Inter"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Extrato" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTransactions} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button onClick={handleSync} disabled={syncing || !hasCredentials}>
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Sincronizar com Inter
                </>
              )}
            </Button>
          </div>
        }
      />

      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA analisando transações bancárias e identificando padrões"
      />
      {!hasCredentials && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">Configuração pendente</p>
              <p className="text-sm text-muted-foreground">
                Configure as credenciais do Banco Inter em{" "}
                <a href="/financeiro/configuracao-bancaria" className="text-primary underline">
                  Configuração Bancária
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Inicial
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Final
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(totalCredits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Saídas</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(totalDebits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações em Lote */}
      {selectedCount > 0 && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-sm">
              {selectedCount} transação(ões) selecionada(s)
            </span>
            <Button size="sm" onClick={handleBulkReconcile}>
              <Check className="h-4 w-4 mr-2" />
              Conciliar Selecionadas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Transações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transações</CardTitle>
            <Badge variant="outline">
              {pendingCount} pendente(s) de conciliação
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Download className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="font-medium">Nenhuma transação encontrada</p>
              <p className="text-sm text-muted-foreground">
                Sincronize com o Banco Inter para importar o extrato
              </p>
            </div>
          ) : (
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
                    label="Data"
                    sortKey="transaction_date"
                    currentSortKey={sortConfig.key}
                    sortDirection={sortConfig.direction}
                    onSort={requestSort}
                  />
                  <SortableTableHeader
                    label="Descrição"
                    sortKey="description"
                    currentSortKey={sortConfig.key}
                    sortDirection={sortConfig.direction}
                    onSort={requestSort}
                  />
                  <TableHead>NSU</TableHead>
                  <SortableTableHeader
                    label="Valor"
                    sortKey="amount"
                    currentSortKey={sortConfig.key}
                    sortDirection={sortConfig.direction}
                    onSort={requestSort}
                    className="text-right"
                  />
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((tx) => (
                  <TableRow 
                    key={tx.id} 
                    className={`${tx.is_reconciled ? "opacity-60" : ""} ${isSelected(tx.id) ? "bg-primary/5" : ""}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected(tx.id)}
                        onCheckedChange={() => toggleSelection(tx.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatDate(tx.transaction_date)}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {tx.nsu || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-medium ${
                          tx.type === "CREDIT" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {tx.is_reconciled ? (
                        <Badge variant="default" className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Conciliado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.is_reconciled ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReconcile(tx.id, false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReconcile(tx.id, true)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Barra de soma flutuante */}
      <SelectionSummaryBar
        selectedCount={selectedCount}
        totalSum={totalSum}
        positiveSum={positiveSum}
        negativeSum={negativeSum}
        onClear={clearSelection}
        showBreakdown={true}
      />
    </div>
  );
}
