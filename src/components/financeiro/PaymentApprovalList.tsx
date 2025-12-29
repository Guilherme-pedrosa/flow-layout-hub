import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Send,
  XCircle,
  Loader2,
  CheckCircle,
  Receipt,
  QrCode,
  AlertCircle,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
  recipient_document: string | null;
  submitted_at: string | null;
  supplier?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
}

interface PaymentApprovalListProps {
  onApproved?: () => void;
}

export function PaymentApprovalList({ onApproved }: PaymentApprovalListProps) {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingPayable, setViewingPayable] = useState<Payable | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payables")
        .select(`
          *,
          supplier:pessoas!payables_supplier_id_fkey(razao_social, nome_fantasia)
        `)
        .eq("payment_status", "submitted_for_approval")
        .order("submitted_at", { ascending: true });

      if (error) throw error;
      setPayables((data as unknown as Payable[]) || []);
    } catch (error) {
      console.error("Erro ao carregar aprovações:", error);
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

  const getMethodBadge = (method: string | null) => {
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
    return <Badge variant="outline">{method || "—"}</Badge>;
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === payables.length && payables.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payables.map((p) => p.id)));
    }
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um pagamento");
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { data: companies } = await supabase.from("companies").select("id").limit(1);
      const companyId = companies?.[0]?.id;

      for (const payableId of selectedIds) {
        const payable = payables.find((p) => p.id === payableId);
        if (!payable) continue;

        // Atualizar status para aprovado
        await supabase
          .from("payables")
          .update({
            payment_status: "approved",
            approved_at: new Date().toISOString(),
          })
          .eq("id", payableId);

        // Enviar para o banco via edge function
        const { data, error } = await supabase.functions.invoke("inter-pix-payment", {
          body: {
            company_id: companyId,
            payable_id: payableId,
            recipient_name: payable.recipient_name || payable.supplier?.razao_social,
            recipient_document: payable.recipient_document || "",
            pix_key: payable.pix_key,
            pix_key_type: payable.pix_key_type,
            boleto_barcode: payable.boleto_barcode,
            payment_method: payable.payment_method_type,
            amount: payable.amount,
            description: payable.description || `Pagamento ${payable.document_number || ""}`,
            is_approval: true,
          },
        });

        if (error || !data?.success) {
          errorCount++;
          console.error(`Erro ao processar ${payableId}:`, error || data?.error);
          
          // Marcar como falha
          await supabase
            .from("payables")
            .update({ payment_status: "failed" })
            .eq("id", payableId);
        } else {
          successCount++;
          
          // Atualizar com ID do banco
          await supabase
            .from("payables")
            .update({
              payment_status: "sent_to_bank",
              inter_payment_id: data.inter_payment_id || null,
            })
            .eq("id", payableId);
        }

        // Log de auditoria
        await supabase.from("payment_audit_logs").insert({
          payable_id: payableId,
          action: error ? "approval_failed" : "approved_and_sent",
          old_status: "submitted_for_approval",
          new_status: error ? "failed" : "sent_to_bank",
          metadata: { error: error?.message || data?.error },
        });
      }

      if (successCount > 0) {
        toast.success(`${successCount} pagamento(s) aprovado(s) e enviado(s) ao banco`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} pagamento(s) com erro`);
      }

      setSelectedIds(new Set());
      fetchPendingApprovals();
      onApproved?.();
    } catch (error) {
      toast.error("Erro ao processar aprovações");
      console.error(error);
    } finally {
      setProcessing(false);
      setShowApproveDialog(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um pagamento");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("payables")
        .update({
          payment_status: "open",
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      // Log de auditoria
      const auditLogs = Array.from(selectedIds).map((id) => ({
        payable_id: id,
        action: "rejected",
        old_status: "submitted_for_approval",
        new_status: "open",
        metadata: { reason: rejectReason },
      }));
      await supabase.from("payment_audit_logs").insert(auditLogs);

      toast.success(`${selectedIds.size} pagamento(s) rejeitado(s)`);
      setSelectedIds(new Set());
      setRejectReason("");
      fetchPendingApprovals();
      onApproved?.();
    } catch (error) {
      toast.error("Erro ao rejeitar pagamentos");
      console.error(error);
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
    }
  };

  const totalSelected = Array.from(selectedIds).reduce((sum, id) => {
    const payable = payables.find((p) => p.id === id);
    return sum + (payable?.amount || 0);
  }, 0);

  const maskData = (value: string | null, showChars: number = 4): string => {
    if (!value) return "—";
    if (value.length <= showChars * 2) return value;
    return `${value.slice(0, showChars)}...${value.slice(-showChars)}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Aprovação de Pagamentos
              </CardTitle>
              <CardDescription>
                Pagamentos aguardando sua aprovação. Após aprovar, serão enviados ao Banco Inter.
              </CardDescription>
            </div>
            {payables.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={selectedIds.size === 0 || processing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeitar ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={selectedIds.size === 0 || processing}
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Aprovar e Enviar ({selectedIds.size})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : payables.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500/50" />
              <h3 className="mt-4 text-lg font-medium">Nenhum pagamento pendente</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Todos os pagamentos foram aprovados ou não há submissões.
              </p>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <span className="text-sm">
                    {selectedIds.size} pagamento(s) selecionado(s)
                  </span>
                  <span className="font-semibold">
                    Total: {formatCurrency(totalSelected)}
                  </span>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.size === payables.length && payables.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Dados Pagto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.map((payable) => (
                    <TableRow
                      key={payable.id}
                      className={selectedIds.has(payable.id) ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(payable.id)}
                          onCheckedChange={() => toggleSelect(payable.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {payable.supplier?.nome_fantasia || payable.supplier?.razao_social || "—"}
                          </span>
                          {payable.document_number && (
                            <span className="block text-xs text-muted-foreground">
                              Doc: {payable.document_number}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(payable.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getMethodBadge(payable.payment_method_type)}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {payable.payment_method_type === "boleto" && (
                            <span className="font-mono">{maskData(payable.boleto_barcode, 6)}</span>
                          )}
                          {payable.payment_method_type === "pix" && (
                            <>
                              <span>{payable.recipient_name}</span>
                              <span className="block text-muted-foreground">
                                {maskData(payable.pix_key, 4)}
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payable.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingPayable(payable)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Aprovação */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Confirmar Aprovação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a aprovar e enviar {selectedIds.size} pagamento(s)
              no valor total de <strong>{formatCurrency(totalSelected)}</strong>.
              <br /><br />
              <strong className="text-destructive">Esta ação não pode ser desfeita.</strong> O valor será debitado da conta Inter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveSelected} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Aprovar e Enviar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Rejeição */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Pagamentos</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a rejeitar {selectedIds.size} pagamento(s).
              Os títulos voltarão para o status "Aberto".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo da rejeição (opcional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectSelected}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeitar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Visualização */}
      <Dialog open={!!viewingPayable} onOpenChange={() => setViewingPayable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              Informações completas do pagamento aguardando aprovação.
            </DialogDescription>
          </DialogHeader>
          {viewingPayable && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">
                    {viewingPayable.supplier?.nome_fantasia || viewingPayable.supplier?.razao_social}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold text-lg">{formatCurrency(viewingPayable.amount)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p>{format(parseISO(viewingPayable.due_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Documento</p>
                  <p>{viewingPayable.document_number || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p>{viewingPayable.description || "—"}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-2">Dados de Pagamento</p>
                <p className="font-medium">{getMethodBadge(viewingPayable.payment_method_type)}</p>
                {viewingPayable.payment_method_type === "boleto" && (
                  <p className="mt-2 font-mono text-sm break-all">{viewingPayable.boleto_barcode}</p>
                )}
                {viewingPayable.payment_method_type === "pix" && (
                  <div className="mt-2 space-y-1 text-sm">
                    <p><strong>Favorecido:</strong> {viewingPayable.recipient_name}</p>
                    <p><strong>CPF/CNPJ:</strong> {viewingPayable.recipient_document || "—"}</p>
                    <p><strong>Chave:</strong> {viewingPayable.pix_key}</p>
                    <p><strong>Tipo:</strong> {viewingPayable.pix_key_type}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingPayable(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
