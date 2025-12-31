import { useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit, Trash2, MoreVertical, DollarSign, FileText, Printer, Link, Share2, Wrench, Package, CircleDollarSign, CheckCircle } from "lucide-react";
import { useServiceOrders, useServiceOrderStatuses, ServiceOrder } from "@/hooks/useServiceOrders";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { useSortableData } from "@/hooks/useSortableData";
import { useSelectionSum } from "@/hooks/useSelectionSum";
import { SortableTableHeader, SelectionSummaryBar } from "@/components/shared";

interface ServiceOrdersListProps {
  onEdit: (order: ServiceOrder) => void;
  onView: (order: ServiceOrder) => void;
}

export function ServiceOrdersList({ onEdit, onView }: ServiceOrdersListProps) {
  const { orders, isLoading, updateOrder, deleteOrder, refetch } = useServiceOrders();
  const { statuses, getActiveStatuses } = useServiceOrderStatuses();
  const { printDocument, printSummary, isGenerating } = useDocumentPdf();
  const [search, setSearch] = useState("");

  const activeStatuses = getActiveStatuses();

  const filteredOrders = orders.filter(o => 
    o.client?.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
    o.client?.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number?.toString().includes(search) ||
    o.equipment_type?.toLowerCase().includes(search.toLowerCase()) ||
    o.equipment_brand?.toLowerCase().includes(search.toLowerCase())
  );

  // Preparar dados com campos para ordenação
  const ordersWithSortKey = filteredOrders.map((o) => ({
    ...o,
    _clientName: o.client?.nome_fantasia || o.client?.razao_social || "",
    _equipment: [o.equipment_type, o.equipment_brand, o.equipment_model].filter(Boolean).join(' - '),
  }));

  const { items: sortedOrders, requestSort, sortConfig } = useSortableData(
    ordersWithSortKey,
    "order_date"
  );

  // Selection with sum
  const getId = useCallback((item: ServiceOrder) => item.id, []);
  const getAmount = useCallback((item: ServiceOrder) => item.total_value, []);

  const {
    selectedCount,
    totalSum,
    toggleSelection,
    clearSelection,
    isSelected,
    toggleSelectAll,
    isAllSelected,
    isSomeSelected,
  } = useSelectionSum({ items: filteredOrders, getAmount, getId });

  const handleCopyLink = (order: ServiceOrder) => {
    const url = `${window.location.origin}/os/${order.tracking_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handlePrintComplete = async (order: ServiceOrder) => {
    await printDocument(order.id, "service_order");
  };

  const handlePrintSummary = async (order: ServiceOrder) => {
    await printSummary(order.id, "service_order");
  };

  const handleChangeStatus = async (orderId: string, newStatusId: string) => {
    const newStatus = statuses.find(s => s.id === newStatusId);
    if (!newStatus) return;

    try {
      await updateOrder.mutateAsync({ 
        id: orderId, 
        order: { status_id: newStatusId } 
      });
      refetch();
      toast.success(`Status alterado para "${newStatus.name}"`);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const getStatusBadge = (order: ServiceOrder) => {
    if (order.status) {
      return (
        <Badge 
          style={{ 
            backgroundColor: order.status.color,
            color: '#fff'
          }}
        >
          {order.status.name}
        </Badge>
      );
    }
    return <Badge variant="secondary">Sem status</Badge>;
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar ordens..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                label=""
                sortKey=""
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={() => {}}
                className="w-12"
              />
              <SortableTableHeader
                label="Nº"
                sortKey="order_number"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
                className="w-[80px]"
              />
              <SortableTableHeader
                label="Cliente"
                sortKey="_clientName"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Equipamento"
                sortKey="_equipment"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Data"
                sortKey="order_date"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
                className="w-[120px]"
              />
              <SortableTableHeader
                label="Situação"
                sortKey="status_id"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
                className="w-[180px]"
              />
              <SortableTableHeader
                label="Valor"
                sortKey="total_value"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
                className="w-[120px] text-right"
              />
              <SortableTableHeader
                label="Ações"
                sortKey=""
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={() => {}}
                className="w-[100px]"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma OS encontrada</TableCell></TableRow>
            ) : (
              sortedOrders.map(order => (
                <TableRow key={order.id} className={isSelected(order.id) ? "bg-muted/30" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={isSelected(order.id)}
                      onCheckedChange={() => toggleSelection(order.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>{order.client?.razao_social || '-'}</div>
                    {order.client?.nome_fantasia && <div className="text-sm text-muted-foreground">({order.client.nome_fantasia})</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Wrench className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {order.equipment_type || order.equipment_brand || order.equipment_model 
                          ? [order.equipment_type, order.equipment_brand, order.equipment_model].filter(Boolean).join(' - ')
                          : '-'
                        }
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(order.order_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Select 
                      value={order.status_id || ""} 
                      onValueChange={(value) => handleChangeStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-40 h-8">
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
                              {status.checkout_behavior === 'required' && (
                                <CheckCircle className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(order.total_value)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView(order)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(order)}><Edit className="h-4 w-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyLink(order)}><Link className="h-4 w-4 mr-2" />Link de acompanhamento</DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Printer className="h-4 w-4 mr-2" />Imprimir PDF</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handlePrintComplete(order)} disabled={isGenerating}>
                                <FileText className="h-4 w-4 mr-2" />Relatório Completo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintSummary(order)} disabled={isGenerating}>
                                <FileText className="h-4 w-4 mr-2" />Resumido
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><FileText className="h-4 w-4 mr-2" />Emitir</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem>NF-e (Produtos)</DropdownMenuItem>
                              <DropdownMenuItem>NFS-e (Serviços)</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem><Share2 className="h-4 w-4 mr-2" />Compartilhar</DropdownMenuItem>
                          <DropdownMenuItem><DollarSign className="h-4 w-4 mr-2" />Ver no financeiro</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteOrder.mutate(order.id)}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Selection Summary Bar */}
      <SelectionSummaryBar
        selectedCount={selectedCount}
        totalSum={totalSum}
        onClear={clearSelection}
      />
    </div>
  );
}
