import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Loader2, Undo2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string | null;
  amount: number;
  type: string | null;
  nsu: string | null;
  is_reconciled: boolean;
  reconciled_with_id: string | null;
}

interface ReconciliationItem {
  id: string;
  financial_id: string;
  financial_type: string;
  amount_used: number;
  client_name?: string;
  supplier_name?: string;
  document_number?: string;
}

interface ReconciliationReverseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: BankTransaction | null;
  onSuccess: () => void;
}

export function ReconciliationReverseModal({
  open,
  onOpenChange,
  transaction,
  onSuccess
}: ReconciliationReverseModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && transaction?.reconciled_with_id) {
      loadReconciliationItems();
      setReason("");
    }
  }, [open, transaction]);

  const loadReconciliationItems = async () => {
    if (!transaction?.reconciled_with_id) return;
    
    setLoading(true);
    try {
      // Carregar itens da conciliação
      const { data: itemsData, error: itemsError } = await supabase
        .from("bank_reconciliation_items")
        .select("*")
        .eq("reconciliation_id", transaction.reconciled_with_id);

      if (itemsError) throw itemsError;

      // Enriquecer com dados dos títulos
      const enrichedItems: ReconciliationItem[] = [];
      
      for (const item of itemsData || []) {
        let enrichedItem: ReconciliationItem = {
          id: item.id,
          financial_id: item.financial_id,
          financial_type: item.financial_type,
          amount_used: item.amount_used
        };

        if (item.financial_type === 'receivable') {
          const { data: rec } = await supabase
            .from("accounts_receivable")
            .select("document_number, clientes(razao_social, nome_fantasia)")
            .eq("id", item.financial_id)
            .single();
          
          if (rec) {
            enrichedItem.document_number = rec.document_number || undefined;
            enrichedItem.client_name = rec.clientes?.nome_fantasia || rec.clientes?.razao_social || undefined;
          }
        } else {
          const { data: pay } = await supabase
            .from("payables")
            .select("document_number, pessoas:supplier_id(razao_social, nome_fantasia)")
            .eq("id", item.financial_id)
            .single();
          
          if (pay) {
            enrichedItem.document_number = pay.document_number || undefined;
            enrichedItem.supplier_name = (pay.pessoas as any)?.nome_fantasia || (pay.pessoas as any)?.razao_social || undefined;
          }
        }

        enrichedItems.push(enrichedItem);
      }

      setItems(enrichedItems);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar dados da conciliação");
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!transaction?.reconciled_with_id) return;
    
    setSaving(true);
    try {
      const reconciliationId = transaction.reconciled_with_id;

      // 1. Marcar conciliação como estornada
      const { error: recError } = await supabase
        .from("bank_reconciliations")
        .update({
          is_reversed: true,
          reversed_at: new Date().toISOString(),
          reversal_notes: reason || null
        })
        .eq("id", reconciliationId);

      if (recError) throw recError;

      // 2. Reverter transação bancária
      const { error: txError } = await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: false,
          reconciled_at: null,
          reconciled_with_id: null,
          reconciled_with_type: null
        })
        .eq("id", transaction.id);

      if (txError) throw txError;

      // 3. Reverter títulos financeiros
      for (const item of items) {
        if (item.financial_type === 'receivable') {
          const { error } = await supabase
            .from("accounts_receivable")
            .update({
              is_paid: false,
              paid_at: null,
              paid_amount: 0,
              bank_transaction_id: null,
              reconciled_at: null,
              reconciliation_id: null
            })
            .eq("id", item.financial_id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("payables")
            .update({
              is_paid: false,
              paid_at: null,
              paid_amount: 0,
              reconciliation_id: null
            })
            .eq("id", item.financial_id);
          
          if (error) throw error;
        }
      }

      toast.success("Conciliação estornada com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao estornar:", error);
      toast.error("Erro ao estornar conciliação");
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;

  const isCredit = transaction.type === "CREDIT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Undo2 className="h-5 w-5" />
            Estornar Conciliação
          </DialogTitle>
          <DialogDescription>
            Esta ação irá desfazer a conciliação e retornar os títulos ao status anterior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card da Transação */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className={`font-bold ${isCredit ? "text-green-600" : "text-red-600"}`}>
                    {isCredit ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NSU</p>
                  <p className="font-mono text-sm">{transaction.nsu || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge className="bg-green-500">Conciliado</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerta */}
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Atenção</p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Ao estornar esta conciliação, os títulos vinculados voltarão ao status "Em Aberto" 
                  e o histórico do estorno será mantido para auditoria.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Títulos vinculados */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Títulos que serão desvinculados:</Label>
              <div className="mt-2 border rounded-md">
                <Table>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.client_name || item.supplier_name || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.document_number || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.amount_used)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <Label htmlFor="reason" className="text-sm">Motivo do estorno (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Informe o motivo do estorno..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <Separator className="my-2" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            variant="destructive"
            onClick={handleReverse} 
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Undo2 className="h-4 w-4 mr-2" />
            )}
            Confirmar Estorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Force rebuild
