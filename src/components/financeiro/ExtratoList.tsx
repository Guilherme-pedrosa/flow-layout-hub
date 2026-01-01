import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  RefreshCw, 
  Download, 
  Link2, 
  Unlink, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  Check,
  Search,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ReconciliationModal } from "./ReconciliationModal";
import { ReconciliationReverseModal } from "./ReconciliationReverseModal";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { SortableTableHeader, SelectionSummaryBar } from "@/components/shared";
import { useAiInsights } from "@/hooks/useAiInsights";
import { useCompany } from "@/contexts/CompanyContext";
import { useSortableData } from "@/hooks/useSortableData";
import { useSelectionSum } from "@/hooks/useSelectionSum";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  bank_account_id: string | null;
  reconciled_with_id: string | null;
}

interface ExtratoListProps {
  /** Filter by transaction type: 'DEBIT' for payables, 'CREDIT' for receivables, undefined for all */
  transactionTypeFilter?: 'DEBIT' | 'CREDIT';
}

export const ExtratoList = ({ transactionTypeFilter }: ExtratoListProps = {}) => {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [allTransactions, setAllTransactions] = useState<BankTransaction[]>([]);
  const [hasCredentials, setHasCredentials] = useState(false);
  
  // Modal de conciliação
  const [reconciliationModalOpen, setReconciliationModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  
  // Modal de reversão
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [transactionToReverse, setTransactionToReverse] = useState<BankTransaction | null>(null);
  
  // Período padrão: últimos 30 dias
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  
  // Filtros de pesquisa
  const [searchTerm, setSearchTerm] = useState("");
  const [searchValue, setSearchValue] = useState("");

  // Filter transactions by type and search terms
  const transactions = useMemo(() => {
    let filtered = transactionTypeFilter 
      ? allTransactions.filter(t => t.type === transactionTypeFilter)
      : allTransactions;
    
    // Filtro por descrição/nome
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(term)
      );
    }
    
    // Filtro por valor
    if (searchValue.trim()) {
      const valueSearch = parseFloat(searchValue.replace(',', '.'));
      if (!isNaN(valueSearch)) {
        filtered = filtered.filter(t => 
          Math.abs(t.amount).toFixed(2).includes(valueSearch.toFixed(2)) ||
          Math.abs(t.amount) === valueSearch
        );
      }
    }
    
    return filtered;
  }, [allTransactions, transactionTypeFilter, searchTerm, searchValue]);

  useEffect(() => {
    if (companyId) {
      checkCredentials();
      loadTransactions();
    }
  }, [dateFrom, dateTo, companyId]);

  const checkCredentials = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("inter_credentials")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();
    
    setHasCredentials(!!data);
  };

  const loadTransactions = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", companyId)
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setAllTransactions(data || []);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar extrato");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!hasCredentials || !companyId) {
      toast.error("Configure as credenciais do Banco Inter primeiro");
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("inter-mtls", {
        body: {
          company_id: companyId,
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

  const openReconciliationModal = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setReconciliationModalOpen(true);
  };

  const openReverseModal = (transaction: BankTransaction) => {
    setTransactionToReverse(transaction);
    setReverseModalOpen(true);
  };

  const handleReconciliationSuccess = () => {
    loadTransactions();
  };

  // Totais
  const totalCredits = transactions
    .filter(t => t.type === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter(t => t.type === "DEBIT")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const pendingCount = transactions.filter(t => !t.is_reconciled).length;
  
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
    toggleSelection,
    clearSelection,
    isSelected,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected
  } = useSelectionSum({ items: transactions, getAmount, getId });
  
  // AI Insights
  const { insights, dismiss, markAsRead } = useAiInsights('financial');
  
  // Insights locais baseados nos dados do extrato
  const localInsights = useMemo(() => {
    const result: any[] = [];
    
    // Detectar taxas bancárias
    const bankFees = transactions.filter(t => 
      t.description?.toLowerCase().includes('tarifa') || 
      t.description?.toLowerCase().includes('taxa') ||
      t.description?.toLowerCase().includes('iof')
    );
    
    if (bankFees.length > 0) {
      const totalFees = bankFees.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      result.push({
        id: 'bank_fees',
        type: 'info' as const,
        category: 'financial' as const,
        mode: 'cfo_bot' as const,
        title: 'Taxas Bancárias',
        message: `Este extrato contém ${bankFees.length} cobrança(s) de taxas bancárias totalizando R$ ${totalFees.toFixed(2)}.`,
        priority: 2,
        is_read: false,
        is_dismissed: false,
        created_at: new Date().toISOString(),
      });
    }
    
    return result;
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* AI Banner */}
      <AIBannerEnhanced
        insights={[...insights, ...localInsights]}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA analisando movimentações bancárias"
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

      {/* Filtros de Pesquisa */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs">
                <Search className="h-3 w-3" />
                Pesquisar descrição
              </Label>
              <Input
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs">
                <DollarSign className="h-3 w-3" />
                Pesquisar valor
              </Label>
              <Input
                placeholder="Ex: 150.00"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3" />
                Data Inicial
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3" />
                Data Final
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(totalCredits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(totalDebits)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Transações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Extrato Bancário
              </CardTitle>
              <CardDescription>
                Transações do Banco Inter. {pendingCount} pendente(s) de conciliação.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadTransactions} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button size="sm" onClick={handleSync} disabled={syncing || !hasCredentials}>
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Sincronizar
                  </>
                )}
              </Button>
            </div>
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
                    <TableCell className="min-w-[200px]">
                      <span className="text-sm break-words whitespace-normal">{tx.description || '-'}</span>
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
                          onClick={() => openReverseModal(tx)}
                          title="Desfazer conciliação"
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReconciliationModal(tx)}
                          title="Conciliar"
                        >
                          <Link2 className="h-4 w-4" />
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

      {/* Modal de Conciliação */}
      <ReconciliationModal
        open={reconciliationModalOpen}
        onOpenChange={setReconciliationModalOpen}
        transaction={selectedTransaction}
        companyId={companyId || ""}
        onSuccess={handleReconciliationSuccess}
      />

      {/* Modal de Reversão */}
      <ReconciliationReverseModal
        open={reverseModalOpen}
        onOpenChange={setReverseModalOpen}
        transaction={transactionToReverse}
        onSuccess={handleReconciliationSuccess}
      />

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
};
