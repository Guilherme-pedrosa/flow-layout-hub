import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Package, CheckCircle2, Clock, AlertCircle, PackageCheck } from "lucide-react";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function Recebimento() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [receiptFilter, setReceiptFilter] = useState<string>("pending");

  const { orders, isLoading } = usePurchaseOrders();

  // Filter orders that need receipt attention (exclude complete)
  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      order.supplier?.razao_social?.toLowerCase().includes(searchLower) ||
      order.supplier_name?.toLowerCase().includes(searchLower) ||
      order.order_number?.toString().includes(search);

    const matchesReceipt =
      receiptFilter === "all" || order.receipt_status === receiptFilter;

    return matchesSearch && matchesReceipt;
  });

  // Stats
  const pendingCount = orders.filter(o => o.receipt_status === 'pending').length;
  const partialCount = orders.filter(o => o.receipt_status === 'partial').length;
  const completeCount = orders.filter(o => o.receipt_status === 'complete').length;
  const pendingValue = orders
    .filter(o => o.receipt_status !== 'complete')
    .reduce((sum, o) => sum + (o.total_value || 0), 0);

  const getReceiptStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completo
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-500 gap-1">
            <Clock className="h-3 w-3" />
            Parcial
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  const handleOpenOrder = (order: PurchaseOrder) => {
    navigate(`/pedidos-compra?edit=${order.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recebimento de Mercadorias"
        description="Confira e dê entrada nos pedidos de compra recebidos"
        breadcrumbs={[
          { label: "Compras", href: "/pedidos-compra" },
          { label: "Recebimento" },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{partialCount}</p>
              <p className="text-sm text-muted-foreground">Parciais</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completeCount}</p>
              <p className="text-sm text-muted-foreground">Completos</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(pendingValue)}</p>
              <p className="text-sm text-muted-foreground">Valor pendente</p>
            </div>
          </div>
        </div>
      </div>

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
        <Select value={receiptFilter} onValueChange={setReceiptFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status do recebimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="partial">Parciais</SelectItem>
            <SelectItem value="complete">Completos</SelectItem>
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
          <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhum pedido encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search ? "Tente ajustar sua busca" : "Não há pedidos aguardando recebimento"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Pedido</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Status do Pedido</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Recebimento</TableHead>
                <TableHead className="text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">
                    #{order.order_number || "-"}
                  </TableCell>
                  <TableCell>
                    {order.supplier?.razao_social || order.supplier_name || "-"}
                  </TableCell>
                  <TableCell>
                    {order.created_at
                      ? format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.purchase_order_status ? (
                      <Badge
                        style={{
                          backgroundColor: order.purchase_order_status.color || "#6b7280",
                          color: "#fff",
                        }}
                      >
                        {order.purchase_order_status.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sem status</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.total_value)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getReceiptStatusBadge(order.receipt_status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant={order.receipt_status === 'complete' ? 'outline' : 'default'}
                      onClick={() => handleOpenOrder(order)}
                    >
                      {order.receipt_status === 'complete' ? 'Ver' : 'Conferir'}
                    </Button>
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
