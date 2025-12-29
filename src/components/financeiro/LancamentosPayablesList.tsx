import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Calendar,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt,
  QrCode,
  Plus,
  Edit,
  ShoppingCart,
  Clock,
  XCircle,
  RotateCcw,
  ArrowUpFromLine,
  Banknote,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isThisWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PayableForm } from "./PayableForm";

interface Payable {
  id: string;
  amount: number;
  due_date: string;
  scheduled_payment_date: string | null;
  description: string | null;
  document_number: string | null;
  supplier_id: string;
  purchase_order_id: string | null;
  payment_method_type: string | null;
  boleto_barcode: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  payment_status: string;
  recipient_name: string | null;
  is_paid: boolean;
  paid_at: string | null;
  installment_number?: number;
  total_installments?: number;
  supplier?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
  purchase_order?: {
    order_number: number;
  } | null;
}

interface PixPayment {
  id: string;
  payable_id: string | null;
  recipient_name: string;
  recipient_document: string;
  pix_key: string;
  pix_key_type: string;
  amount: number;
  description: string | null;
  status: string;
  inter_status: string | null;
  inter_end_to_end_id: string | null;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  payable?: {
    pix_key: string | null;
    pix_key_type: string | null;
    document_number: string | null;
  } | null;
}

interface LancamentosPayablesListProps {
  onRefresh?: () => void;
}

export function LancamentosPayablesList({ onRefresh }: LancamentosPayablesListProps) {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [pixPayments, setPixPayments] = useState<PixPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "boleto" | "pix">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "submitted" | "paid">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPayableForm, setShowPayableForm] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pendentes" | "historico">("pendentes");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payables
      const { data: payablesData, error: payablesError } = await supabase
        .from("payables")
        .select(`
          *,
          supplier:pessoas!payables_supplier_id_fkey(razao_social, nome_fantasia),
          purchase_order:purchase_orders!payables_purchase_order_id_fkey(order_number)
        `)
        .order("due_date", { ascending: true });

      if (payablesError) throw payablesError;

      // Calculate installment numbers
      const payablesWithInstallments = (payablesData || []).map((p: any) => {
        if (p.purchase_order_id) {
          const sameOrderPayables = (payablesData || [])
            .filter((x: any) => x.purchase_order_id === p.purchase_order_id)
            .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
          
          const installmentNumber = sameOrderPayables.findIndex((x: any) => x.id === p.id) + 1;
          const totalInstallments = sameOrderPayables.length;
          
          return { ...p, installment_number: installmentNumber, total_installments: totalInstallments };
        }
        return p;
      });

      setPayables(payablesWithInstallments as Payable[]);

      // Fetch PIX payments com dados atualizados do payable
      const { data: pixData, error: pixError } = await supabase
        .from("inter_pix_payments")
        .select(`
          *,
          payable:payables!inter_pix_payments_payable_id_fkey(pix_key, pix_key_type, document_number)
        `)
        .order("created_at", { ascending: false });

      if (pixError) throw pixError;
      setPixPayments((pixData as PixPayment[]) || []);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter payables based on status
  const pendingPayables = payables.filter((p) => !p.is_paid);
  const paidPayables = payables.filter((p) => p.is_paid);

  const filteredPayables = (activeTab === "pendentes" ? pendingPayables : paidPayables).filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      p.description?.toLowerCase().includes(searchLower) ||
      p.document_number?.toLowerCase().includes(searchLower) ||
      p.supplier?.razao_social?.toLowerCase().includes(searchLower) ||
      p.supplier?.nome_fantasia?.toLowerCase().includes(searchLower);

    const paymentDate = p.scheduled_payment_date || p.due_date;
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && isToday(parseISO(paymentDate))) ||
      (dateFilter === "week" && isThisWeek(parseISO(paymentDate)));

    const matchesMethod =
      methodFilter === "all" || p.payment_method_type === methodFilter;

    let matchesStatus = true;
    if (statusFilter === "pending") {
      matchesStatus = p.payment_status === "open" || p.payment_status === "ready_to_pay";
    } else if (statusFilter === "submitted") {
      matchesStatus = p.payment_status === "submitted_for_approval" || p.payment_status === "sent_to_bank";
    } else if (statusFilter === "paid") {
      matchesStatus = p.is_paid;
    }

    return matchesSearch && matchesDate && matchesMethod && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getMethodBadge = (method: string | null) => {
    if (!method) {
      return <Badge variant="outline" className="text-muted-foreground">Não definido</Badge>;
    }
    if (method === "boleto") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Receipt className="mr-1 h-3 w-3" />
          Boleto
        </Badge>
      );
    }
    if (method === "pix") {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <QrCode className="mr-1 h-3 w-3" />
          PIX
        </Badge>
      );
    }
    return <Badge variant="outline">{method}</Badge>;
  };

  const getPayableStatusBadge = (payable: Payable) => {
    // Badge de submissão ao banco
    const submittedToBank = payable.payment_status === "sent_to_bank" || 
                           payable.payment_status === "submitted_for_approval";

    if (payable.is_paid) {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Pago
          </Badge>
        </div>
      );
    }

    const dueDate = new Date(payable.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = dueDate < today;

    return (
      <div className="flex flex-col gap-1">
        {submittedToBank && (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
            <ArrowUpFromLine className="mr-1 h-3 w-3" />
            Enviado ao Banco
          </Badge>
        )}
        {payable.payment_status === "ready_to_pay" && !submittedToBank && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Pronto
          </Badge>
        )}
        {payable.payment_status === "open" && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertCircle className="mr-1 h-3 w-3" />
            Incompleto
          </Badge>
        )}
        {isOverdue && !payable.is_paid && (
          <Badge variant="destructive" className="text-xs">
            Vencido
          </Badge>
        )}
      </div>
    );
  };

  const getPixStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Concluído
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
            <ArrowUpFromLine className="mr-1 h-3 w-3" />
            Aguard. Aprovação Banco
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Falhou
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  const toggleSelect = (id: string) => {
    const payable = payables.find((p) => p.id === id);
    if (payable?.payment_status !== "ready_to_pay") {
      toast.error("Título com dados incompletos não pode ser selecionado");
      return;
    }
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    const readyItems = filteredPayables.filter((p) => p.payment_status === "ready_to_pay");
    if (selectedIds.size === readyItems.length && readyItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readyItems.map((p) => p.id)));
    }
  };

  const handleSubmitToBank = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um título");
      return;
    }

    setProcessing(true);
    try {
      // Atualizar status para sent_to_bank (enviado ao banco)
      const { error } = await supabase
        .from("payables")
        .update({
          payment_status: "sent_to_bank",
          submitted_at: new Date().toISOString(),
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      // Log de auditoria
      const auditLogs = Array.from(selectedIds).map((id) => ({
        payable_id: id,
        action: "sent_to_bank",
        old_status: "ready_to_pay",
        new_status: "sent_to_bank",
        metadata: { submitted_count: selectedIds.size },
      }));

      await supabase.from("payment_audit_logs").insert(auditLogs);

      toast.success(
        `${selectedIds.size} título(s) enviado(s) ao banco com sucesso!`,
        {
          description: "Os títulos foram marcados para pagamento e aguardam processamento bancário.",
          duration: 5000,
        }
      );
      setSelectedIds(new Set());
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      console.error("Erro ao submeter:", error);
      toast.error("Erro ao enviar ao banco", {
        description: error?.message || "Não foi possível enviar os títulos. Tente novamente.",
        duration: 5000,
      });
    } finally {
      setProcessing(false);
      setShowSubmitDialog(false);
    }
  };

  const handleEditPayable = (payable: Payable) => {
    setEditingPayable(payable);
    setShowPayableForm(true);
  };

  const handleRetryPix = async (payment: PixPayment) => {
    setRetrying(payment.id);
    try {
      await supabase
        .from("inter_pix_payments")
        .update({ status: "pending", error_message: null })
        .eq("id", payment.id);

      const { data, error } = await supabase.functions.invoke("inter-pix-payment", {
        body: { paymentId: payment.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Pagamento PIX reenviado com sucesso!");
      } else {
        toast.error(data?.error || "Erro ao reenviar pagamento");
      }

      await fetchData();
    } catch (error) {
      console.error("Erro ao reenviar pagamento:", error);
      toast.error("Erro ao reenviar pagamento PIX");
    } finally {
      setRetrying(null);
    }
  };

  const totalSelected = Array.from(selectedIds).reduce((sum, id) => {
    const payable = payables.find((p) => p.id === id);
    return sum + (payable?.amount || 0);
  }, 0);

  const readyCount = pendingPayables.filter((p) => p.payment_status === "ready_to_pay").length;
  const submittedCount = pendingPayables.filter((p) => 
    p.payment_status === "sent_to_bank" || p.payment_status === "submitted_for_approval"
  ).length;

  const getKeyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cpf: "CPF",
      cnpj: "CNPJ",
      email: "E-mail",
      telefone: "Telefone",
      aleatorio: "Aleatória",
    };
    return labels[type] || type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5 text-primary" />
                Lançamentos
              </CardTitle>
              <CardDescription>
                {activeTab === "pendentes" 
                  ? `Títulos pendentes: ${pendingPayables.length} | Prontos: ${readyCount} | Enviados ao Banco: ${submittedCount}`
                  : `Histórico de pagamentos: ${paidPayables.length + pixPayments.length} registros`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setEditingPayable(null); setShowPayableForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
              {activeTab === "pendentes" && (
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={selectedIds.size === 0 || processing}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar ao Banco ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs internas */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pendentes" | "historico")} className="mb-4">
            <TabsList>
              <TabsTrigger value="pendentes" className="gap-2">
                <Clock className="h-4 w-4" />
                Pendentes ({pendingPayables.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, documento ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateFilter} onValueChange={(v: "all" | "today" | "week") => setDateFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as datas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={(v: "all" | "boleto" | "pix") => setMethodFilter(v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos métodos</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>
            {activeTab === "pendentes" && (
              <Select value={statusFilter} onValueChange={(v: "all" | "pending" | "submitted" | "paid") => setStatusFilter(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="submitted">Enviados ao Banco</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Seleção info */}
          {selectedIds.size > 0 && activeTab === "pendentes" && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
              <span className="text-sm">
                {selectedIds.size} título(s) selecionado(s)
              </span>
              <span className="font-semibold">
                Total: {formatCurrency(totalSelected)}
              </span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : activeTab === "pendentes" ? (
            /* Tabela de Pendentes */
            filteredPayables.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-medium">Nenhum título encontrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ajuste os filtros ou cadastre novos títulos.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.size === readyCount && readyCount > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayables.map((payable) => (
                    <TableRow
                      key={payable.id}
                      className={selectedIds.has(payable.id) ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(payable.id)}
                          onCheckedChange={() => toggleSelect(payable.id)}
                          disabled={payable.payment_status !== "ready_to_pay"}
                        />
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {payable.document_number || "-"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {payable.supplier?.nome_fantasia || payable.supplier?.razao_social || "—"}
                          </span>
                          {payable.description && (
                            <span className="block text-xs text-muted-foreground truncate max-w-[200px]">
                              {payable.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payable.purchase_order_id && payable.purchase_order ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              Compra #{payable.purchase_order.order_number}
                            </span>
                            <Link 
                              to={`/pedidos-compra?edit=${payable.purchase_order_id}`}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm"
                            >
                              ({payable.installment_number || 1}/{payable.total_installments || 1})
                              <ShoppingCart className="h-4 w-4" />
                            </Link>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Manual</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(payable.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getMethodBadge(payable.payment_method_type)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payable.amount)}
                      </TableCell>
                      <TableCell>{getPayableStatusBadge(payable)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEditPayable(payable)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            /* Histórico - Pagos + PIX */
            <div className="space-y-6">
              {/* Títulos Pagos */}
              {paidPayables.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">Títulos Pagos</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Pago em</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidPayables.map((payable) => (
                        <TableRow key={payable.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {payable.document_number || "-"}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">
                            {payable.supplier?.nome_fantasia || payable.supplier?.razao_social || "—"}
                          </TableCell>
                          <TableCell>{payable.description || "-"}</TableCell>
                          <TableCell>
                            {payable.paid_at 
                              ? format(new Date(payable.paid_at), "dd/MM/yyyy", { locale: ptBR })
                              : "-"
                            }
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(payable.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Pago
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagamentos PIX */}
              {pixPayments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Pagamentos PIX
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Doc</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Favorecido</TableHead>
                        <TableHead>Chave PIX Atual</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ID Transação</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pixPayments.map((payment) => {
                        // Usa a chave PIX atualizada do payable, se disponível
                        const currentPixKey = payment.payable?.pix_key || payment.pix_key;
                        const currentPixKeyType = payment.payable?.pix_key_type || payment.pix_key_type;
                        const documentNumber = payment.payable?.document_number;
                        
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {documentNumber || "-"}
                              </code>
                            </TableCell>
                            <TableCell>
                              {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium">{payment.recipient_name}</span>
                                {payment.recipient_document && (
                                  <span className="block text-xs text-muted-foreground">
                                    {payment.recipient_document}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="text-xs text-muted-foreground">
                                  {getKeyTypeLabel(currentPixKeyType)}:
                                </span>
                                <span className="block text-sm truncate max-w-[150px]">
                                  {currentPixKey}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>{getPixStatusBadge(payment.status)}</TableCell>
                            <TableCell>
                              {payment.inter_end_to_end_id ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {payment.inter_end_to_end_id.substring(0, 15)}...
                                </code>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {payment.status === "failed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetryPix(payment)}
                                  disabled={retrying === payment.id}
                                >
                                  {retrying === payment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <RotateCcw className="h-4 w-4 mr-1" />
                                      Tentar novamente
                                    </>
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {paidPayables.length === 0 && pixPayments.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-medium">Nenhum pagamento no histórico</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Os pagamentos realizados aparecerão aqui.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar ao Banco</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar {selectedIds.size} título(s) para o banco,
              no valor total de <strong>{formatCurrency(totalSelected)}</strong>.
              <br /><br />
              Os pagamentos serão processados e podem precisar de aprovação no próprio banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitToBank} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirmar Envio
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Formulário de edição */}
      <PayableForm
        open={showPayableForm}
        onOpenChange={setShowPayableForm}
        payable={editingPayable}
        onSuccess={() => {
          fetchData();
          setEditingPayable(null);
        }}
      />
    </>
  );
}
