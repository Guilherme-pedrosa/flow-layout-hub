import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Loader2, Send, Trash2, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { PayablesStatusCards, PayableStatusFilter } from "./PayablesStatusCards";
import { PayablesFilters, PayablesFiltersState } from "./PayablesFilters";
import { PayablesTable, PayableRow } from "./PayablesTable";
import { PayablesBulkActions } from "./PayablesBulkActions";
import { PayableForm } from "./PayableForm";

interface PayablesPageProps {
  onRefresh?: () => void;
}

export function PayablesPage({ onRefresh }: PayablesPageProps) {
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<PayableStatusFilter>("all");
  const [filters, setFilters] = useState<PayablesFiltersState>({
    search: "",
    supplierId: "all",
    category: "all",
    paymentMethod: "all",
    currentMonth: startOfMonth(new Date()),
  });
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [showPayableForm, setShowPayableForm] = useState(false);
  const [editingPayable, setEditingPayable] = useState<PayableRow | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingPayable, setDeletingPayable] = useState<PayableRow | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    fetchPayables();
  }, [filters.currentMonth]);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(filters.currentMonth);
      const monthEnd = endOfMonth(filters.currentMonth);

      const { data, error } = await supabase
        .from("payables")
        .select(`
          *,
          supplier:pessoas!payables_supplier_id_fkey(razao_social, nome_fantasia, cpf_cnpj),
          purchase_order:purchase_orders!payables_purchase_order_id_fkey(order_number)
        `)
        .gte("due_date", monthStart.toISOString())
        .lte("due_date", monthEnd.toISOString())
        .order("due_date", { ascending: true });

      if (error) throw error;
      setPayables((data as PayableRow[]) || []);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      toast.error("Erro ao carregar contas a pagar");
    } finally {
      setLoading(false);
    }
  };

  // Calculate counts and amounts for status cards
  const { counts, amounts, filteredPayables } = useMemo(() => {
    const today = startOfDay(new Date());
    
    const calc = {
      all: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      scheduled: { count: 0, amount: 0 },
    };

    payables.forEach((p) => {
      calc.all.count++;
      calc.all.amount += p.amount;

      if (p.is_paid) {
        calc.paid.count++;
        calc.paid.amount += p.amount;
      } else if (p.payment_status === "sent_to_bank" || p.payment_status === "submitted_for_approval") {
        calc.scheduled.count++;
        calc.scheduled.amount += p.amount;
      } else {
        const dueDate = startOfDay(parseISO(p.due_date));
        if (isBefore(dueDate, today)) {
          calc.overdue.count++;
          calc.overdue.amount += p.amount;
        } else {
          calc.pending.count++;
          calc.pending.amount += p.amount;
        }
      }
    });

    // Filter payables based on status and search
    let filtered = payables;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => {
        if (statusFilter === "paid") return p.is_paid;
        if (statusFilter === "scheduled") {
          return p.payment_status === "sent_to_bank" || p.payment_status === "submitted_for_approval";
        }
        if (statusFilter === "overdue") {
          const dueDate = startOfDay(parseISO(p.due_date));
          return !p.is_paid && isBefore(dueDate, today) && 
                 p.payment_status !== "sent_to_bank" && p.payment_status !== "submitted_for_approval";
        }
        if (statusFilter === "pending") {
          const dueDate = startOfDay(parseISO(p.due_date));
          return !p.is_paid && !isBefore(dueDate, today) && 
                 p.payment_status !== "sent_to_bank" && p.payment_status !== "submitted_for_approval";
        }
        return true;
      });
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((p) =>
        p.description?.toLowerCase().includes(search) ||
        p.document_number?.toLowerCase().includes(search) ||
        p.supplier?.razao_social?.toLowerCase().includes(search) ||
        p.supplier?.nome_fantasia?.toLowerCase().includes(search) ||
        p.amount.toString().includes(search)
      );
    }

    // Supplier filter
    if (filters.supplierId !== "all") {
      filtered = filtered.filter((p) => p.supplier_id === filters.supplierId);
    }

    // Payment method filter
    if (filters.paymentMethod !== "all") {
      filtered = filtered.filter((p) => p.payment_method_type === filters.paymentMethod);
    }

    return {
      counts: {
        all: calc.all.count,
        pending: calc.pending.count,
        overdue: calc.overdue.count,
        paid: calc.paid.count,
        scheduled: calc.scheduled.count,
      },
      amounts: {
        all: calc.all.amount,
        pending: calc.pending.amount,
        overdue: calc.overdue.amount,
        paid: calc.paid.amount,
        scheduled: calc.scheduled.amount,
      },
      filteredPayables: filtered,
    };
  }, [payables, statusFilter, filters]);

  const selectedTotal = useMemo(() => {
    return Array.from(selectedIds).reduce((sum, id) => {
      const p = payables.find((x) => x.id === id);
      return sum + (p?.amount || 0);
    }, 0);
  }, [selectedIds, payables]);

  // Handlers
  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleToggleSelectAll = () => {
    const selectableIds = filteredPayables
      .filter((p) => !p.is_paid && p.payment_status !== "sent_to_bank")
      .map((p) => p.id);
    
    if (selectableIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const handleNewPayable = () => {
    setEditingPayable(null);
    setShowPayableForm(true);
  };

  const handleEdit = (payable: PayableRow) => {
    setEditingPayable(payable);
    setShowPayableForm(true);
  };

  const handleDelete = (payable: PayableRow) => {
    setDeletingPayable(payable);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingPayable) return;
    
    setProcessing(true);
    try {
      await supabase.from("payment_audit_logs").delete().eq("payable_id", deletingPayable.id);
      await supabase.from("inter_pix_payments").delete().eq("payable_id", deletingPayable.id);
      
      const { error } = await supabase.from("payables").delete().eq("id", deletingPayable.id);
      if (error) throw error;
      
      toast.success("Conta excluída com sucesso");
      fetchPayables();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir conta");
    } finally {
      setProcessing(false);
      setShowDeleteDialog(false);
      setDeletingPayable(null);
    }
  };

  const handlePayPix = (payable: PayableRow) => {
    toast.info("Processando pagamento PIX...");
    // TODO: Open PIX payment modal
  };

  const handlePayBoleto = (payable: PayableRow) => {
    toast.info("Processando pagamento de boleto...");
    // TODO: Open boleto payment modal
  };

  const handleMarkAsPaid = async (payable: PayableRow) => {
    try {
      const { error } = await supabase
        .from("payables")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          payment_status: "paid",
        })
        .eq("id", payable.id);

      if (error) throw error;
      
      toast.success("Conta marcada como paga");
      fetchPayables();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.error("Erro ao atualizar conta");
    }
  };

  const handleDuplicate = async (payable: PayableRow) => {
    try {
      const { error } = await supabase.from("payables").insert([{
        amount: payable.amount,
        due_date: payable.due_date,
        description: `${payable.description} (cópia)`,
        document_number: null,
        supplier_id: payable.supplier_id,
        payment_method_type: payable.payment_method_type as "pix" | "boleto" | "transferencia" | "outro" | null,
        pix_key: payable.pix_key,
        pix_key_type: payable.pix_key_type,
        boleto_barcode: payable.boleto_barcode,
        recipient_name: payable.recipient_name,
        recipient_document: payable.recipient_document,
        company_id: (payable as any).company_id,
      }]);

      if (error) throw error;
      
      toast.success("Conta duplicada com sucesso");
      fetchPayables();
    } catch (error) {
      console.error("Erro ao duplicar:", error);
      toast.error("Erro ao duplicar conta");
    }
  };

  const handleBulkSubmit = () => {
    setShowSubmitDialog(true);
  };

  const confirmBulkSubmit = async () => {
    setProcessing(true);
    let successCount = 0;

    try {
      const { data: companies } = await supabase.from("companies").select("id").limit(1);
      const companyId = companies?.[0]?.id;
      if (!companyId) throw new Error("Empresa não configurada");

      for (const id of selectedIds) {
        const payable = payables.find((p) => p.id === id);
        if (!payable) continue;

        if (payable.payment_method_type === "pix" && payable.pix_key) {
          await supabase
            .from("payables")
            .update({ payment_status: "sent_to_bank", submitted_at: new Date().toISOString() })
            .eq("id", id);

          const { data, error } = await supabase.functions.invoke("inter-pix-payment", {
            body: {
              company_id: companyId,
              payable_id: id,
              pix_key: payable.pix_key,
              pix_key_type: payable.pix_key_type || "cpf",
              amount: payable.amount,
              recipient_name: payable.recipient_name || payable.supplier?.nome_fantasia || payable.supplier?.razao_social || "Favorecido",
              recipient_document: payable.recipient_document || payable.supplier?.cpf_cnpj || "",
              description: payable.description || `Pagamento ${payable.document_number || ""}`,
            },
          });

          if (!error && data?.success) {
            successCount++;
            await supabase
              .from("payables")
              .update({
                inter_payment_id: data.paymentId,
                payment_status: data.pendingApproval ? "submitted_for_approval" : "paid",
                is_paid: !data.pendingApproval,
                paid_at: data.pendingApproval ? null : new Date().toISOString(),
              } as any)
              .eq("id", id);
          }
        } else {
          await supabase
            .from("payables")
            .update({ payment_status: "sent_to_bank", submitted_at: new Date().toISOString() })
            .eq("id", id);
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} pagamento(s) processado(s) com sucesso`);
      }

      setSelectedIds(new Set());
      fetchPayables();
      onRefresh?.();
    } catch (error) {
      console.error("Erro ao enviar pagamentos:", error);
      toast.error("Erro ao processar pagamentos");
    } finally {
      setProcessing(false);
      setShowSubmitDialog(false);
    }
  };

  const handleBulkMarkAsPaid = async () => {
    setProcessing(true);
    try {
      for (const id of selectedIds) {
        await supabase
          .from("payables")
          .update({
            is_paid: true,
            paid_at: new Date().toISOString(),
            payment_status: "paid",
          })
          .eq("id", id);
      }

      toast.success(`${selectedIds.size} conta(s) marcada(s) como paga(s)`);
      setSelectedIds(new Set());
      fetchPayables();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar contas");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setProcessing(true);
    try {
      for (const id of selectedIds) {
        await supabase.from("payment_audit_logs").delete().eq("payable_id", id);
        await supabase.from("inter_pix_payments").delete().eq("payable_id", id);
        await supabase.from("payables").delete().eq("id", id);
      }

      toast.success(`${selectedIds.size} conta(s) excluída(s)`);
      setSelectedIds(new Set());
      fetchPayables();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao excluir contas");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" />
            Contas a Pagar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie pagamentos e execute via integração bancária
          </p>
        </div>
        <Button onClick={handleNewPayable} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Status Cards */}
      <PayablesStatusCards
        counts={counts}
        amounts={amounts}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Filters */}
      <PayablesFilters
        filters={filters}
        onFiltersChange={setFilters}
        showCategoryFilter={false}
      />

      {/* Summary Bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Exibindo <span className="font-medium text-foreground">{filteredPayables.length}</span> de{" "}
          <span className="font-medium text-foreground">{payables.length}</span> conta(s)
        </span>
        <span className="text-muted-foreground">
          Total do período: <span className="font-semibold text-foreground">{formatCurrency(amounts.all)}</span>
        </span>
      </div>

      {/* Table */}
      <PayablesTable
        payables={filteredPayables}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPayPix={handlePayPix}
        onPayBoleto={handlePayBoleto}
        onMarkAsPaid={handleMarkAsPaid}
        onDuplicate={handleDuplicate}
        loading={loading}
      />

      {/* Bulk Actions */}
      <PayablesBulkActions
        selectedCount={selectedIds.size}
        totalAmount={selectedTotal}
        onSubmitToBank={handleBulkSubmit}
        onMarkAsPaid={handleBulkMarkAsPaid}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        isProcessing={processing}
      />

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar{" "}
              <strong>{selectedIds.size}</strong> pagamento(s) para o banco,
              totalizando <strong>{formatCurrency(selectedTotal)}</strong>.
              <br /><br />
              Os pagamentos serão processados e podem precisar de aprovação no aplicativo do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkSubmit} disabled={processing}>
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta a pagar?
              {deletingPayable && (
                <div className="mt-3 p-3 bg-muted rounded-lg space-y-1 text-sm">
                  <p><strong>Fornecedor:</strong> {deletingPayable.supplier?.nome_fantasia || deletingPayable.supplier?.razao_social}</p>
                  <p><strong>Valor:</strong> {formatCurrency(deletingPayable.amount)}</p>
                  <p><strong>Vencimento:</strong> {format(parseISO(deletingPayable.due_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              )}
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form */}
      <PayableForm
        open={showPayableForm}
        onOpenChange={setShowPayableForm}
        payable={editingPayable}
        onSuccess={() => {
          fetchPayables();
          setEditingPayable(null);
        }}
      />
    </div>
  );
}
