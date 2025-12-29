import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePurchaseOrders, PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { usePurchaseOrderStatuses } from "@/hooks/usePurchaseOrderStatuses";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PurchaseOrderForm } from "@/components/pedidos-compra/PurchaseOrderForm";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const purposeLabels: Record<string, string> = {
  estoque: "Estoque",
  ordem_de_servico: "Ordem de Serviço",
  despesa_operacional: "Despesa Operacional",
};

export default function PedidosCompra() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { orders, isLoading } = usePurchaseOrders();
  const { statuses } = usePurchaseOrderStatuses();

  // Handle edit query param to open directly to a purchase order
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && orders.length > 0 && !showForm) {
      const orderToEdit = orders.find((o) => o.id === editId);
      if (orderToEdit) {
        setEditingOrder(orderToEdit);
        setShowForm(true);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, orders, showForm, setSearchParams]);

  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      order.supplier?.razao_social?.toLowerCase().includes(searchLower) ||
      order.supplier_name?.toLowerCase().includes(searchLower) ||
      order.nfe_number?.includes(search) ||
      order.order_number?.toString().includes(search);

    const matchesStatus =
      statusFilter === "all" || order.status_id === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleNewOrder = () => {
    setEditingOrder(null);
    setShowForm(true);
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  const getStatusBadge = (order: PurchaseOrder) => {
    const status = order.purchase_order_status;
    if (!status) return <Badge variant="outline">Sem status</Badge>;

    return (
      <Badge
        style={{
          backgroundColor: status.color || "#6b7280",
          color: "#fff",
        }}
      >
        {status.name}
      </Badge>
    );
  };

  const getReceiptStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-500">Completo</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={editingOrder ? `Pedido #${editingOrder.order_number}` : "Novo Pedido de Compra"}
          description={editingOrder ? "Editar pedido de compra" : "Criar novo pedido de compra"}
          breadcrumbs={[
            { label: "Compras", href: "/pedidos-compra" },
            { label: "Pedidos de Compra", href: "/pedidos-compra" },
            { label: editingOrder ? `#${editingOrder.order_number}` : "Novo" },
          ]}
        />
        <PurchaseOrderForm
          order={editingOrder}
          onClose={handleCloseForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos de Compra"
        description="Gerencie pedidos de compra com importação de XML e validação de divergências"
        breadcrumbs={[
          { label: "Compras", href: "/pedidos-compra" },
          { label: "Pedidos de Compra" },
        ]}
        actions={
          <Button onClick={handleNewOrder}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fornecedor, número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhum pedido encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search ? "Tente ajustar sua busca" : "Crie o primeiro pedido de compra"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Nº</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Recebimento</TableHead>
                <TableHead className="text-center">Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleEditOrder(order)}
                >
                  <TableCell className="font-mono font-medium">
                    {order.order_number || "-"}
                  </TableCell>
                  <TableCell>
                    {order.supplier?.razao_social || order.supplier_name || "-"}
                  </TableCell>
                  <TableCell>
                    {purposeLabels[order.purpose] || order.purpose}
                  </TableCell>
                  <TableCell>
                    {order.created_at
                      ? format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total_value)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(order)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getReceiptStatusBadge(order.receipt_status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {order.requires_reapproval && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Reaprovação
                        </Badge>
                      )}
                      {order.nfe_imported_at && (
                        <span title="NF-e importada">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </span>
                      )}
                      {order.cte_imported_at && (
                        <span title="CT-e importado">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
