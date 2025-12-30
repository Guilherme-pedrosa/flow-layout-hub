import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared";
import { ReconciliationModal, ReconciliationReverseModal, ReconciliationPanel } from "@/components/financeiro";
import {
  RefreshCw,
  Download,
  Check,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  Calendar,
  Link2,
  Zap,
  FileText,
  Undo2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";

const TEMP_COMPANY_ID = "7875af52-18d0-434e-8ae9-97981bd668e7";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
  reconciled_at: string | null;
  reconciled_with_id: string | null;
  reconciled_with_type: string | null;
  bank_account_id: string | null;
}

interface AccountReceivable {
  id: string;
  document_number: string | null;
  description: string | null;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  client_id: string | null;
  reconciliation_id: string | null;
  clientes?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
}

export default function Conciliacao() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [receivableFilter, setReceivableFilter] = useState<string>("all");
  
  // Modais
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

  // Período
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);

  useEffect(() => {
    checkCredentials();
    loadData();
  }, [dateFrom, dateTo]);

  const checkCredentials = async () => {
    const { data } = await supabase
      .from("inter_credentials")
      .select("id")
      .eq("company_id", TEMP_COMPANY_ID)
      .maybeSingle();

    setHasCredentials(!!data);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar transações bancárias
      const { data: txData, error: txError } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", TEMP_COMPANY_ID)
        .gte("transaction_date", dateFrom)
        .lte("transaction_date", dateTo)
        .order("transaction_date", { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      // Carregar contas a receber
      const { data: recData, error: recError } = await supabase
        .from("accounts_receivable")
        .select("*, clientes(razao_social, nome_fantasia)")
        .eq("company_id", TEMP_COMPANY_ID)
        .order("due_date", { ascending: false });

      if (recError) throw recError;
      setReceivables(recData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!hasCredentials) {
      toast.error("Configure as credenciais do Banco Inter primeiro");
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("inter-sync", {
        body: {
          company_id: TEMP_COMPANY_ID,
          date_from: dateFrom,
          date_to: dateTo,
        },
      });

      if (error) throw error;

      toast.success(`Sincronização concluída! ${data?.imported || 0} transações importadas.`);
      loadData();
    } catch (error: any) {
      console.error("Erro na sincronização:", error);
      toast.error(error.message || "Erro ao sincronizar com Banco Inter");
    } finally {
      setSyncing(false);
    }
  };

  const openReconcileModal = (tx: BankTransaction) => {
    setSelectedTransaction(tx);
    setReconcileModalOpen(true);
  };

  const openReverseModal = (tx: BankTransaction) => {
    setSelectedTransaction(tx);
    setReverseModalOpen(true);
  };

  // Filtros
  const filteredTransactions = transactions.filter(tx => {
    if (typeFilter === "credit" && tx.type !== "CREDIT") return false;
    if (typeFilter === "debit" && tx.type !== "DEBIT") return false;
    return true;
  });

  const filteredReceivables = receivables.filter(rec => {
    if (receivableFilter === "paid" && !rec.is_paid) return false;
    if (receivableFilter === "pending" && rec.is_paid) return false;
    return true;
  });

  const pendingCreditTransactions = transactions.filter(tx => !tx.is_reconciled && tx.type === "CREDIT");
  const pendingDebitTransactions = transactions.filter(tx => !tx.is_reconciled && tx.type === "DEBIT");
  const allPendingTransactions = transactions.filter(tx => !tx.is_reconciled);

  // Totais
  const totalCredits = transactions.filter(t => t.type === "CREDIT").reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === "DEBIT").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceivables = receivables.filter(r => !r.is_paid).reduce((sum, r) => sum + r.amount, 0);
  const reconciledCount = transactions.filter(t => t.is_reconciled).length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Conciliação Bancária"
        description="Vincule transações do extrato a títulos financeiros"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Conciliação" }]}
      />

      {!hasCredentials && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">Configuração pendente</p>
              <p className="text-sm text-muted-foreground">
                Configure as credenciais do Banco Inter em{" "}
                <a href="/configuracao-bancaria" className="text-primary underline">
                  Configuração Bancária
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Ações */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              Data Inicial
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              Data Final
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(totalCredits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Saídas</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(totalDebits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2">
              <Link2 className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Conciliados</p>
                <p className="text-lg font-bold text-blue-600">{reconciledCount} / {transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex flex-col gap-2">
            <Button onClick={handleSync} disabled={syncing || !hasCredentials} className="w-full" size="sm">
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Sincronizar Inter
            </Button>
            <Button onClick={loadData} variant="outline" className="w-full" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pendentes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sugestoes">
            Sugestões IA
            <Badge className="ml-2 bg-primary/20 text-primary">Novo</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendentes">
            Pendentes de Conciliação
            <Badge variant="destructive" className="ml-2">{allPendingTransactions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="extrato">
            Extrato Bancário
            <Badge variant="secondary" className="ml-2">{transactions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="titulos">
            Boletos e Títulos
            <Badge variant="secondary" className="ml-2">{receivables.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Sugestões IA */}
        <TabsContent value="sugestoes" className="space-y-4">
          <ReconciliationPanel />
        </TabsContent>

        {/* Tab: Pendentes de Conciliação */}
        <TabsContent value="pendentes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transações Não Conciliadas</CardTitle>
                  <CardDescription>
                    Clique em "Conciliar" para vincular a transação com títulos financeiros
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : allPendingTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Check className="h-12 w-12 text-green-500/50 mb-4" />
                  <p className="font-medium text-green-600">Tudo conciliado!</p>
                  <p className="text-sm text-muted-foreground">
                    Não há transações pendentes de conciliação
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPendingTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{formatDate(tx.transaction_date)}</TableCell>
                        <TableCell className="max-w-[400px] truncate">{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "CREDIT" ? "default" : "secondary"}>
                            {tx.type === "CREDIT" ? "Crédito" : "Débito"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                            {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => openReconcileModal(tx)}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Conciliar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Extrato Bancário */}
        <TabsContent value="extrato" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transações do Extrato</CardTitle>
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="credit">Créditos</SelectItem>
                      <SelectItem value="debit">Débitos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTransactions.length === 0 ? (
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
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>NSU</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className={tx.is_reconciled ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{formatDate(tx.transaction_date)}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{tx.description}</TableCell>
                        <TableCell className="font-mono text-sm">{tx.nsu || "-"}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                            {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(Math.abs(tx.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {tx.is_reconciled ? (
                            <Badge className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Conciliado
                              {tx.reconciled_with_type === "MULTI" && (
                                <span className="ml-1">(N)</span>
                              )}
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
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Estornar
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => openReconcileModal(tx)}>
                              <Link2 className="h-4 w-4 mr-1" />
                              Conciliar
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
        </TabsContent>

        {/* Tab: Boletos e Títulos */}
        <TabsContent value="titulos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Boletos e Títulos a Receber</CardTitle>
                  <CardDescription>
                    Gestão de contas a receber e status de pagamento
                  </CardDescription>
                </div>
                <Select value={receivableFilter} onValueChange={setReceivableFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Em Aberto</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredReceivables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium">Nenhum título encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    Os títulos a receber aparecerão aqui
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Conciliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">
                          {rec.clientes?.nome_fantasia || rec.clientes?.razao_social || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{rec.document_number || "-"}</TableCell>
                        <TableCell>{formatDate(rec.due_date)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(rec.amount)}</TableCell>
                        <TableCell className="text-center">
                          {rec.is_paid ? (
                            <Badge className="bg-green-500">Pago</Badge>
                          ) : new Date(rec.due_date) < new Date() ? (
                            <Badge variant="destructive">Vencido</Badge>
                          ) : (
                            <Badge variant="outline">Em Aberto</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {rec.reconciliation_id ? (
                            <Badge variant="secondary" className="gap-1">
                              <Link2 className="h-3 w-3" />
                              Vinculado
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <ReconciliationModal
        open={reconcileModalOpen}
        onOpenChange={setReconcileModalOpen}
        transaction={selectedTransaction}
        companyId={TEMP_COMPANY_ID}
        onSuccess={loadData}
      />

      <ReconciliationReverseModal
        open={reverseModalOpen}
        onOpenChange={setReverseModalOpen}
        transaction={selectedTransaction}
        onSuccess={loadData}
      />
    </div>
  );
}
