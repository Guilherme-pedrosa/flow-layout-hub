import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useCompany } from "@/contexts/CompanyContext";
import { CheckSquare, AlertTriangle, CheckCircle, XCircle, Loader2, FileText, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function Aprovacoes() {
  const { insights, dismiss, markAsRead } = useAiInsights('purchases');
  const { orders, clearReapproval, refetch } = usePurchaseOrders();
  const { currentCompany } = useCompany();
  
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Filtrar pedidos que requerem reaprovação
  const pendingApprovals = orders?.filter(order => order.requires_reapproval) || [];

  const handleApprove = async (orderId: string) => {
    setApproving(true);
    try {
      await clearReapproval.mutateAsync(orderId);
      toast.success("Pedido aprovado com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(`Erro ao aprovar: ${error.message}`);
    } finally {
      setApproving(false);
      setSelectedOrder(null);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    // Por enquanto, apenas fecha o dialog - a rejeição pode ser implementada depois
    toast.info("Funcionalidade de rejeição será implementada em breve");
    setShowRejectDialog(false);
    setRejectReason("");
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprovações"
        description="Aprove ou rejeite pedidos de compra que requerem reaprovação"
        breadcrumbs={[
          { label: "Compras" },
          { label: "Aprovações" },
        ]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA analisando solicitações pendentes de aprovação"
      />

      {/* Contadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingApprovals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de pedidos pendentes */}
      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma aprovação pendente</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Todos os pedidos estão aprovados ou não requerem aprovação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pedidos Aguardando Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">#{order.order_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.supplier?.razao_social || order.supplier?.nome_fantasia || order.supplier_name || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.total_value)}
                      </TableCell>
                      <TableCell>
                        {order.created_at ? format(new Date(order.created_at), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {order.reapproval_reason || "Alteração no pedido"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/pedidos-compra?edit=${order.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(order.id)}
                            disabled={approving}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pedido</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição do pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Rejeição</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Descreva o motivo da rejeição..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
