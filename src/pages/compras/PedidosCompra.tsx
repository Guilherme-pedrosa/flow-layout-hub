import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileSpreadsheet, AlertTriangle, CheckCircle2, Sparkles, RefreshCw, X, MoreHorizontal, FileText, Printer, DollarSign, Download, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePurchaseOrders, PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { usePurchaseOrderStatuses } from "@/hooks/usePurchaseOrderStatuses";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PurchaseOrderForm } from "@/components/pedidos-compra/PurchaseOrderForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // AI Insight state
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);

  const { orders, isLoading, deleteOrder, canDeleteOrder } = usePurchaseOrders();
  const { statuses } = usePurchaseOrderStatuses();

  // Load AI insight on mount
  useEffect(() => {
    if (orders.length > 0 && !aiDismissed) {
      loadAiInsight();
    }
  }, [orders.length]);

  const loadAiInsight = async () => {
    if (orders.length === 0) return;
    
    setAiLoading(true);
    try {
      const { data: credData } = await supabase
        .from('inter_credentials')
        .select('company_id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const companyId = credData?.company_id;
      
      // Buscar TODOS os itens de TODOS os pedidos
      const orderIds = orders.map(o => o.id);
      const { data: allItems } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          product:products(code, description, ncm)
        `)
        .in('purchase_order_id', orderIds);
      
      // Agregar dados dos itens
      const itemsByProduct: Record<string, { description: string, qty: number, total: number, orders: number }> = {};
      const itemsBySupplier: Record<string, { name: string, total: number, items: number }> = {};
      
      allItems?.forEach(item => {
        const productKey = item.product_id || item.description || 'sem_produto';
        const productDesc = item.product?.description || item.description || 'Produto sem descrição';
        
        if (!itemsByProduct[productKey]) {
          itemsByProduct[productKey] = { description: productDesc, qty: 0, total: 0, orders: 0 };
        }
        itemsByProduct[productKey].qty += item.quantity || 0;
        itemsByProduct[productKey].total += item.total_value || 0;
        itemsByProduct[productKey].orders += 1;
      });
      
      orders.forEach(order => {
        const supplierKey = order.supplier_id || order.supplier_name || 'sem_fornecedor';
        const supplierName = order.supplier?.razao_social || order.supplier_name || 'Fornecedor desconhecido';
        
        if (!itemsBySupplier[supplierKey]) {
          itemsBySupplier[supplierKey] = { name: supplierName, total: 0, items: 0 };
        }
        itemsBySupplier[supplierKey].total += order.total_value || 0;
        itemsBySupplier[supplierKey].items += 1;
      });
      
      // Top 5 produtos mais comprados
      const topProducts = Object.values(itemsByProduct)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(p => `${p.description}: ${p.qty} un, R$ ${p.total.toFixed(2)}`);
      
      // Top 3 fornecedores
      const topSuppliers = Object.values(itemsBySupplier)
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map(s => `${s.name}: ${s.items} pedidos, R$ ${s.total.toFixed(2)}`);
      
      // Estatísticas gerais
      const pendingReceiptOrders = orders.filter(o => o.receipt_status !== 'complete');
      const totalPendingReceipt = pendingReceiptOrders.reduce((sum, o) => sum + (o.total_value || 0), 0);
      const requiresReapproval = orders.filter(o => o.requires_reapproval).length;
      const completeOrders = orders.filter(o => o.receipt_status === 'complete');
      const totalGeral = orders.reduce((sum, o) => sum + (o.total_value || 0), 0);
      const totalItens = allItems?.length || 0;
      
      // Pedidos por finalidade
      const byPurpose = orders.reduce((acc, o) => {
        acc[o.purpose] = (acc[o.purpose] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const prompt = `Você é JARVIS, o assistente de compras inteligente. Analise TODOS estes dados e dê UM insight estratégico curto (máx 150 caracteres):

📊 VISÃO GERAL:
- Total: ${orders.length} pedidos, ${totalItens} itens, R$ ${totalGeral.toFixed(2)}
- Aguardando conferência: ${pendingReceiptOrders.length} pedidos (R$ ${totalPendingReceipt.toFixed(2)})
- Recebimento concluído: ${completeOrders.length} pedidos
- Aguardando reaprovação: ${requiresReapproval}

📦 TOP 5 PRODUTOS MAIS COMPRADOS:
${topProducts.join('\n')}

🏭 TOP 3 FORNECEDORES:
${topSuppliers.join('\n')}

🎯 FINALIDADES:
- Estoque: ${byPurpose['estoque'] || 0} pedidos
- Ordem de Serviço: ${byPurpose['ordem_de_servico'] || 0} pedidos  
- Despesa Operacional: ${byPurpose['despesa_operacional'] || 0} pedidos

Foque no insight mais relevante: pode ser sobre produtos, fornecedores, valores, pendências, oportunidades de economia, ou qualquer padrão interessante. Responda APENAS com o texto do insight, sem JSON.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            companyId,
          }),
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar insight');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let textBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch {
              // Incomplete JSON
            }
          }
        }
      }

      setAiInsight(fullText.trim().slice(0, 250));
    } catch (error) {
      console.error('Error loading AI insight:', error);
      setAiInsight('Analise seus pedidos de compra para otimizar compras e reduzir custos.');
    } finally {
      setAiLoading(false);
    }
  };

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

  const { updateOrderStatus } = usePurchaseOrders();

  const handleStatusChange = async (orderId: string, newStatusId: string) => {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status_id: newStatusId });
    } catch (error) {
      // Error handled in hook
    }
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

  const handleViewFinanceiro = (order: PurchaseOrder) => {
    // Redireciona para contas a pagar filtrado pelo fornecedor
    navigate(`/contas-pagar?supplier=${order.supplier_id}`);
  };

  const handlePrintOrder = async (order: PurchaseOrder) => {
    toast.info("Gerando PDF do pedido de compra...");
    // TODO: Implementar geração de PDF
  };

  const handleDeleteClick = async (order: PurchaseOrder) => {
    // Check if can delete before opening dialog
    const check = await canDeleteOrder(order.id);
    if (!check.canDelete) {
      toast.error(check.reason || "Não é possível excluir este pedido");
      return;
    }
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (): Promise<boolean> => {
    if (!orderToDelete) return false;
    try {
      await deleteOrder.mutateAsync(orderToDelete.id);
      setOrderToDelete(null);
      return true;
    } catch (error) {
      // Error handled in hook
      return false;
    }
  };

  const handleDownloadNF = (order: PurchaseOrder) => {
    if (order.nfe_xml_url) {
      window.open(order.nfe_xml_url, '_blank');
    } else {
      toast.warning("NF-e não disponível para download");
    }
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={editingOrder ? `Pedido #${editingOrder.order_number}` : "Novo Pedido de Compra"}
          description={editingOrder ? "Editar pedido de compra" : "Criar novo pedido de compra"}
          breadcrumbs={[
            { label: "Compras", onClick: handleCloseForm },
            { label: "Pedidos de Compra", onClick: handleCloseForm },
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
          { label: "Compras" },
          { label: "Pedidos de Compra" },
        ]}
        actions={
          <Button onClick={handleNewOrder}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        }
      />

      {/* AI Insight Banner */}
      {!aiDismissed && (
        <div className="ai-banner">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {aiLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Analisando pedidos...</span>
              </div>
            ) : (
              <p className="text-sm text-foreground">{aiInsight || 'Clique em atualizar para gerar insights sobre seus pedidos.'}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => loadAiInsight()}
            disabled={aiLoading}
          >
            <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setAiDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
                <TableHead>NF Entrada</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Recebimento</TableHead>
                <TableHead className="text-center w-[80px]">Ações</TableHead>
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
                    {order.nfe_number ? (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono text-sm">{order.nfe_number}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
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
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={order.status_id || ""}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                    >
                      <SelectTrigger className="h-8 w-[140px] mx-auto">
                        <div className="flex items-center gap-2">
                          {order.purchase_order_status && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: order.purchase_order_status.color || "#6b7280" }}
                            />
                          )}
                          <span className="truncate text-xs">
                            {order.purchase_order_status?.name || "Sem status"}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: status.color || "#6b7280" }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    {getReceiptStatusBadge(order.receipt_status)}
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintOrder(order)}>
                          <Printer className="mr-2 h-4 w-4" />
                          Imprimir Pedido
                        </DropdownMenuItem>
                        {order.nfe_number && (
                          <DropdownMenuItem onClick={() => handleDownloadNF(order)}>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar NF-e
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewFinanceiro(order)}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          Ver no Financeiro
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(order)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir Pedido
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Excluir Pedido de Compra"
        description={`Tem certeza que deseja excluir o pedido #${orderToDelete?.order_number}? Esta ação não pode ser desfeita. Os registros financeiros associados (não pagos) também serão excluídos.`}
      />
    </div>
  );
}
