import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileSpreadsheet, 
  Search, 
  Eye, 
  MoreHorizontal,
  RefreshCw,
  Upload,
  Package,
  CircleDollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePurchaseOrders, PurchaseOrder, PurchaseOrderItem } from "@/hooks/usePurchaseOrders";
import { usePurchaseOrderStatuses } from "@/hooks/usePurchaseOrderStatuses";
import { useStockMovements } from "@/hooks/useStockMovements";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export default function NotasCompra() {
  const navigate = useNavigate();
  const { orders, isLoading, updateOrderStatus, getOrderItems, refetch } = usePurchaseOrders();
  const { statuses, getActiveStatuses } = usePurchaseOrderStatuses();
  const { createMovement } = useStockMovements();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const activeStatuses = getActiveStatuses();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_cnpj?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || order.status_id === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = async (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    setDetailsDialogOpen(true);
    
    try {
      const items = await getOrderItems(order.id);
      setOrderItems(items);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar itens do pedido");
    } finally {
      setLoadingItems(false);
    }
  };

  const handleChangeStatus = async (orderId: string, newStatusId: string) => {
    const order = orders.find(o => o.id === orderId);
    const oldStatus = order?.purchase_order_status;
    const newStatus = statuses.find(s => s.id === newStatusId);
    if (!newStatus) return;

    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status_id: newStatusId });

      // Só criar movimentação de estoque se:
      // 1. O NOVO status tem stock_behavior = 'entry' (dá entrada no estoque)
      // 2. O status ANTERIOR não tinha stock_behavior = 'entry' (para não duplicar)
      const shouldCreateStockEntry = 
        newStatus.stock_behavior === 'entry' && 
        oldStatus?.stock_behavior !== 'entry';

      if (shouldCreateStockEntry) {
        const items = await getOrderItems(orderId);
        for (const item of items) {
          if (item.product_id) {
            await createMovement.mutateAsync({
              product_id: item.product_id,
              type: "ENTRADA_COMPRA",
              quantity: item.quantity,
              unit_price: item.unit_price || 0,
              total_value: item.total_value || 0,
              reason: `NF ${order?.invoice_number} - Status: ${newStatus.name}`,
              reference_type: "purchase_order",
              reference_id: orderId,
            });
          }
        }
        toast.success("Entrada de estoque registrada!");
      }

      // TODO: Implementar comportamento financeiro quando houver tabela de contas a pagar
      if (newStatus.financial_behavior === 'payable' && oldStatus?.financial_behavior !== 'payable') {
        toast.info("Contas a pagar serão geradas quando o módulo estiver disponível.");
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (order: PurchaseOrder) => {
    if (order.purchase_order_status) {
      return (
        <Badge 
          style={{ 
            backgroundColor: order.purchase_order_status.color,
            color: '#fff'
          }}
        >
          {order.purchase_order_status.name}
        </Badge>
      );
    }
    return <Badge variant="secondary">{order.status || "Sem status"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas de Compra"
        description="Gerencie notas fiscais de entrada e seus status"
        breadcrumbs={[
          { label: "Compras" },
          { label: "Notas de Compra" },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">Pedidos de Compra</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por NF, fornecedor..."
                  className="pl-8 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {activeStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={() => navigate("/importar-xml")}>
                <Upload className="h-4 w-4 mr-2" />
                Importar XML
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Nenhum pedido encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "Tente ajustar os filtros de busca."
                  : "Importe uma nota fiscal XML para começar."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NF / Série</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.invoice_number || "-"} / {order.invoice_series || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.supplier_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.supplier_cnpj}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(order.invoice_date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total_value || 0)}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={order.status_id || ""} 
                        onValueChange={(value) => handleChangeStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue>
                            {getStatusBadge(order)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {activeStatuses.map(status => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: status.color }}
                                />
                                <span>{status.name}</span>
                                {status.stock_behavior !== 'none' && (
                                  <Package className="h-3 w-3 text-muted-foreground" />
                                )}
                                {status.financial_behavior !== 'none' && (
                                  <CircleDollarSign className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Pedido - NF {selectedOrder?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Informações completas do pedido de compra
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Fornecedor</span>
                  <p className="font-medium">{selectedOrder.supplier_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.supplier_cnpj}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Nota Fiscal</span>
                  <p className="font-medium">
                    {selectedOrder.invoice_number} / {selectedOrder.invoice_series}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedOrder.invoice_date)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <p className="font-medium text-lg">
                    {formatCurrency(selectedOrder.total_value || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedOrder)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Itens do Pedido</h4>
                {loadingItems ? (
                  <p className="text-muted-foreground">Carregando itens...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.product?.code || item.xml_code}
                          </TableCell>
                          <TableCell>
                            {item.product?.description || item.xml_description}
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price || 0)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_value || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
