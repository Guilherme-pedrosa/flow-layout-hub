import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ShieldCheck, Send, XCircle, Loader2, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PixPayment {
  id: string;
  recipient_name: string;
  recipient_document: string;
  pix_key: string;
  pix_key_type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
}

interface PixApprovalListProps {
  onApproved?: () => void;
}

export function PixApprovalList({ onApproved }: PixApprovalListProps) {
  const [payments, setPayments] = useState<PixPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inter_pix_payments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments((data as PixPayment[]) || []);
    } catch (error) {
      console.error("Erro ao carregar pagamentos pendentes:", error);
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
    if (selectedIds.size === payments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payments.map(p => p.id)));
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

      for (const paymentId of selectedIds) {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) continue;

        // Chamar edge function para processar o PIX
        const { data, error } = await supabase.functions.invoke("inter-pix-payment", {
          body: {
            company_id: companyId,
            payment_id: paymentId, // Indica que é aprovação de um existente
            recipient_name: payment.recipient_name,
            recipient_document: payment.recipient_document,
            pix_key: payment.pix_key,
            pix_key_type: payment.pix_key_type,
            amount: payment.amount,
            description: payment.description,
            is_approval: true,
          },
        });

        if (error || !data?.success) {
          errorCount++;
          console.error(`Erro ao aprovar ${paymentId}:`, error || data?.error);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} pagamento(s) aprovado(s) e enviado(s)`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} pagamento(s) com erro`);
      }

      setSelectedIds(new Set());
      fetchPendingPayments();
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
        .from("inter_pix_payments")
        .update({ 
          status: "cancelled",
          error_message: "Rejeitado pelo aprovador"
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} pagamento(s) rejeitado(s)`);
      setSelectedIds(new Set());
      fetchPendingPayments();
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
    const payment = payments.find(p => p.id === id);
    return sum + (payment?.amount || 0);
  }, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Aprovar Pagamentos PIX
              </CardTitle>
              <CardDescription>
                Pagamentos lançados aguardando sua aprovação. Selecione e aprove para enviar.
              </CardDescription>
            </div>
            {payments.length > 0 && (
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
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500/50" />
              <h3 className="mt-4 text-lg font-medium">Nenhum pagamento pendente</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Todos os pagamentos foram aprovados ou não há lançamentos.
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
                        checked={selectedIds.size === payments.length && payments.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Favorecido</TableHead>
                    <TableHead>Chave PIX</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow 
                      key={payment.id}
                      className={selectedIds.has(payment.id) ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(payment.id)}
                          onCheckedChange={() => toggleSelect(payment.id)}
                        />
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
                            {getKeyTypeLabel(payment.pix_key_type)}:
                          </span>
                          <span className="block text-sm truncate max-w-[150px]">
                            {payment.pix_key}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {payment.description || "-"}
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
            <AlertDialogTitle>Confirmar Aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a aprovar e enviar {selectedIds.size} pagamento(s) PIX 
              no valor total de <strong>{formatCurrency(totalSelected)}</strong>.
              <br /><br />
              Esta ação não pode ser desfeita. O valor será debitado da conta Inter.
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
            <AlertDialogTitle>Confirmar Rejeição</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a rejeitar {selectedIds.size} pagamento(s) PIX.
              Os pagamentos serão cancelados e não serão enviados.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
    </>
  );
}
