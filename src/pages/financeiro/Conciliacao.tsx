import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared";
import {
  RefreshCw,
  Download,
  Check,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  Calendar,
  Link2,
  Zap,
  FileText,
  Users
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
  clientes?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
}

export default function Conciliacao() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [receivableFilter, setReceivableFilter] = useState<string>("all");
  
  // Modal de conciliação manual
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [selectedReceivableId, setSelectedReceivableId] = useState<string>("");

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

  const handleAutoReconcile = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconciliation-engine", {
        body: {
          company_id: TEMP_COMPANY_ID,
          tolerance_days: 5,
          tolerance_amount: 0.10,
        },
      });

      if (error) throw error;

      toast.success(`Conciliação automática: ${data?.matched || 0} títulos conciliados!`);
      loadData();
    } catch (error: any) {
      console.error("Erro na conciliação:", error);
      toast.error(error.message || "Erro na conciliação automática");
    } finally {
      setReconciling(false);
    }
  };

  const handleManualReconcile = async () => {
    if (!selectedTransaction || !selectedReceivableId) return;

    try {
      // Buscar o título selecionado
      const receivable = receivables.find(r => r.id === selectedReceivableId);
      if (!receivable) return;

      // Atualizar transação bancária
      const { error: txError } = await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_with_id: receivable.id,
          reconciled_with_type: "accounts_receivable",
        })
        .eq("id", selectedTransaction.id);

      if (txError) throw txError;

      // Atualizar título
      const { error: recError } = await supabase
        .from("accounts_receivable")
        .update({
          is_paid: true,
          paid_at: selectedTransaction.transaction_date,
          paid_amount: Math.abs(selectedTransaction.amount),
          bank_transaction_id: selectedTransaction.id,
          reconciled_at: new Date().toISOString(),
          payment_method: "transferencia",
        })
        .eq("id", receivable.id);

      if (recError) throw recError;

      toast.success("Conciliação manual realizada com sucesso!");
      setManualDialogOpen(false);
      setSelectedTransaction(null);
      setSelectedReceivableId("");
      loadData();
    } catch (error) {
      console.error("Erro na conciliação manual:", error);
      toast.error("Erro ao realizar conciliação manual");
    }
  };

  const handleRemoveReconciliation = async (transactionId: string, receivableId: string | null) => {
    try {
      // Remover conciliação da transação
      const { error: txError } = await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: false,
          reconciled_at: null,
          reconciled_with_id: null,
          reconciled_with_type: null,
        })
        .eq("id", transactionId);

      if (txError) throw txError;

      // Se tiver título vinculado, remover pagamento
      if (receivableId) {
        const { error: recError } = await supabase
          .from("accounts_receivable")
          .update({
            is_paid: false,
            paid_at: null,
            paid_amount: 0,
            bank_transaction_id: null,
            reconciled_at: null,
          })
          .eq("id", receivableId);

        if (recError) throw recError;
      }

      toast.success("Conciliação removida");
      loadData();
    } catch (error) {
      console.error("Erro ao remover conciliação:", error);
      toast.error("Erro ao remover conciliação");
    }
  };

  const openManualDialog = (tx: BankTransaction) => {
    setSelectedTransaction(tx);
    setSelectedReceivableId("");
    setManualDialogOpen(true);
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

  const pendingTransactions = transactions.filter(tx => !tx.is_reconciled && tx.type === "CREDIT");
  const openReceivables = receivables.filter(r => !r.is_paid);

  // Totais
  const totalCredits = transactions.filter(t => t.type === "CREDIT").reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions.filter(t => t.type === "DEBIT").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceivables = receivables.filter(r => !r.is_paid).reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Conciliação Bancária"
        description="Concilie transações do extrato com títulos a receber"
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
              <FileText className="h-6 w-6 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">A Receber (Aberto)</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(totalReceivables)}</p>
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
            <Button onClick={handleAutoReconcile} disabled={reconciling} variant="secondary" className="w-full" size="sm">
              {reconciling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Conciliar Auto
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="extrato" className="space-y-4">
        <TabsList>
          <TabsTrigger value="extrato">
            Extrato Bancário
            <Badge variant="secondary" className="ml-2">{transactions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pendentes">
            Conciliação Pendente
            <Badge variant="destructive" className="ml-2">{pendingTransactions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="titulos">
            Boletos e Títulos
            <Badge variant="secondary" className="ml-2">{receivables.length}</Badge>
          </TabsTrigger>
        </TabsList>

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
                  <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
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
                              onClick={() => handleRemoveReconciliation(tx.id, tx.reconciled_with_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : tx.type === "CREDIT" ? (
                            <Button variant="ghost" size="sm" onClick={() => openManualDialog(tx)}>
                              <Link2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Conciliação Pendente */}
        <TabsContent value="pendentes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transações Não Conciliadas</CardTitle>
                  <CardDescription>
                    Créditos do extrato que ainda não foram vinculados a títulos
                  </CardDescription>
                </div>
                <Button onClick={handleAutoReconcile} disabled={reconciling}>
                  {reconciling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  Rodar Conciliação Automática
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Check className="h-12 w-12 text-green-500/50 mb-4" />
                  <p className="font-medium text-green-600">Tudo conciliado!</p>
                  <p className="text-sm text-muted-foreground">
                    Não há transações de crédito pendentes de conciliação
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{formatDate(tx.transaction_date)}</TableCell>
                        <TableCell className="max-w-[400px] truncate">{tx.description}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-green-600">
                            +{formatCurrency(Math.abs(tx.amount))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openManualDialog(tx)}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Conciliar Manualmente
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
              {filteredReceivables.length === 0 ? (
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
                      <TableHead>Pagamento</TableHead>
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
                          {rec.is_paid && rec.paid_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDate(rec.paid_at)} - {rec.payment_method || "N/D"}
                            </span>
                          ) : (
                            "-"
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

      {/* Modal de Conciliação Manual */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conciliação Manual</DialogTitle>
            <DialogDescription>
              Vincule esta transação bancária a um título a receber
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">{formatDate(selectedTransaction.transaction_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-medium text-green-600">
                        +{formatCurrency(Math.abs(selectedTransaction.amount))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">NSU</p>
                      <p className="font-mono">{selectedTransaction.nsu || "-"}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">Descrição</p>
                    <p className="text-sm">{selectedTransaction.description}</p>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label className="mb-2 block">Selecione o título a receber:</Label>
                {openReceivables.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Não há títulos em aberto para conciliar
                  </p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openReceivables.map((rec) => {
                          const valueDiff = Math.abs(rec.amount - Math.abs(selectedTransaction.amount));
                          const isMatch = valueDiff < 1; // Match se diferença < R$1

                          return (
                            <TableRow
                              key={rec.id}
                              className={`cursor-pointer ${selectedReceivableId === rec.id ? "bg-primary/10" : ""} ${isMatch ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                              onClick={() => setSelectedReceivableId(rec.id)}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedReceivableId === rec.id}
                                  onCheckedChange={() => setSelectedReceivableId(rec.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {rec.clientes?.nome_fantasia || rec.clientes?.razao_social || "-"}
                              </TableCell>
                              <TableCell>{formatDate(rec.due_date)}</TableCell>
                              <TableCell className="text-right">
                                <span className={isMatch ? "text-green-600 font-medium" : ""}>
                                  {formatCurrency(rec.amount)}
                                </span>
                                {isMatch && (
                                  <Badge className="ml-2 bg-green-500" variant="secondary">Match!</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleManualReconcile} disabled={!selectedReceivableId}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Conciliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
