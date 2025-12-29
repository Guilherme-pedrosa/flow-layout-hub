import { useState, useEffect } from "react";
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
  payment_method_type: string | null;
  boleto_barcode: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  payment_status: string;
  recipient_name: string | null;
  supplier?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
}

interface ScheduledPaymentsListProps {
  onSubmitted?: () => void;
}

export function ScheduledPaymentsList({ onSubmitted }: ScheduledPaymentsListProps) {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "boleto" | "pix">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "ready_to_pay">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPayableForm, setShowPayableForm] = useState(false);
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null);

  useEffect(() => {
    fetchPayables();
  }, []);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payables")
        .select(`
          *,
          supplier:pessoas!payables_supplier_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("is_paid", false)
        .in("payment_status", ["open", "ready_to_pay"])
        .order("due_date", { ascending: true });

      if (error) throw error;
      setPayables((data as unknown as Payable[]) || []);
    } catch (error) {
      console.error("Erro ao carregar títulos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayables = payables.filter((p) => {
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

    const matchesStatus =
      statusFilter === "all" || p.payment_status === statusFilter;

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

  const getStatusBadge = (status: string) => {
    if (status === "ready_to_pay") {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="mr-1 h-3 w-3" />
          Pronto
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <AlertCircle className="mr-1 h-3 w-3" />
        Incompleto
      </Badge>
    );
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

  const handleSubmitForApproval = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um título");
      return;
    }

    setProcessing(true);
    try {
      // Atualizar status para submitted_for_approval
      const { error } = await supabase
        .from("payables")
        .update({
          payment_status: "submitted_for_approval",
          submitted_at: new Date().toISOString(),
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      // Log de auditoria
      const { data: companies } = await supabase.from("companies").select("id").limit(1);
      const auditLogs = Array.from(selectedIds).map((id) => ({
        payable_id: id,
        action: "submitted_for_approval",
        old_status: "ready_to_pay",
        new_status: "submitted_for_approval",
        metadata: { submitted_count: selectedIds.size },
      }));

      await supabase.from("payment_audit_logs").insert(auditLogs);

      toast.success(`${selectedIds.size} título(s) enviado(s) para aprovação`);
      setSelectedIds(new Set());
      fetchPayables();
      onSubmitted?.();
    } catch (error) {
      console.error("Erro ao submeter:", error);
      toast.error("Erro ao submeter para aprovação");
    } finally {
      setProcessing(false);
      setShowSubmitDialog(false);
    }
  };

  const handleEditPayable = (payable: Payable) => {
    setEditingPayable(payable);
    setShowPayableForm(true);
  };

  const totalSelected = Array.from(selectedIds).reduce((sum, id) => {
    const payable = payables.find((p) => p.id === id);
    return sum + (payable?.amount || 0);
  }, 0);

  const readyCount = filteredPayables.filter((p) => p.payment_status === "ready_to_pay").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Pagamentos Programados
              </CardTitle>
              <CardDescription>
                Selecione títulos prontos e submeta para aprovação. Total pronto: {readyCount}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setEditingPayable(null); setShowPayableForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={selectedIds.size === 0 || processing}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submeter para Aprovação ({selectedIds.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
            <Select value={statusFilter} onValueChange={(v: "all" | "open" | "ready_to_pay") => setStatusFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="ready_to_pay">Prontos</SelectItem>
                <SelectItem value="open">Incompletos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seleção info */}
          {selectedIds.size > 0 && (
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
          ) : filteredPayables.length === 0 ? (
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
                  <TableHead>Fornecedor</TableHead>
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
                      {format(parseISO(payable.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getMethodBadge(payable.payment_method_type)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(payable.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payable.payment_status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEditPayable(payable)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submeter para Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar {selectedIds.size} título(s) para aprovação,
              no valor total de <strong>{formatCurrency(totalSelected)}</strong>.
              <br /><br />
              Os títulos aparecerão na tela de aprovação para serem confirmados antes do envio ao banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitForApproval} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirmar Submissão
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
          fetchPayables();
          setEditingPayable(null);
        }}
      />
    </>
  );
}
