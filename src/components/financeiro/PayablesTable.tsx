import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  QrCode,
  Receipt,
  CheckCircle,
  Copy,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Calendar,
  ArrowUpDown,
  Link2,
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export interface PayableRow {
  id: string;
  amount: number;
  due_date: string;
  scheduled_payment_date: string | null;
  description: string | null;
  document_number: string | null;
  supplier_id: string;
  purchase_order_id: string | null;
  payment_method_type: string | null;
  boleto_barcode: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  payment_status: string;
  recipient_name: string | null;
  recipient_document: string | null;
  is_paid: boolean;
  paid_at: string | null;
  reconciliation_id: string | null;
  supplier?: {
    razao_social: string | null;
    nome_fantasia: string | null;
    cpf_cnpj?: string | null;
  };
  purchase_order?: {
    order_number: number;
  } | null;
}

interface PayablesTableProps {
  payables: PayableRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (payable: PayableRow) => void;
  onDelete: (payable: PayableRow) => void;
  onPayPix: (payable: PayableRow) => void;
  onPayBoleto: (payable: PayableRow) => void;
  onMarkAsPaid: (payable: PayableRow) => void;
  onDuplicate: (payable: PayableRow) => void;
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PayablesTable({
  payables,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onPayPix,
  onPayBoleto,
  onMarkAsPaid,
  onDuplicate,
  loading,
}: PayablesTableProps) {
  const [sortField, setSortField] = useState<"due_date" | "amount" | "supplier">("due_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const selectablePayables = payables.filter(
    (p) => !p.is_paid && p.payment_status !== "sent_to_bank"
  );
  
  const allSelected = selectablePayables.length > 0 && 
    selectablePayables.every((p) => selectedIds.has(p.id));

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedPayables = [...payables].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === "due_date") {
      comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    } else if (sortField === "amount") {
      comparison = a.amount - b.amount;
    } else if (sortField === "supplier") {
      const nameA = a.supplier?.nome_fantasia || a.supplier?.razao_social || "";
      const nameB = b.supplier?.nome_fantasia || b.supplier?.razao_social || "";
      comparison = nameA.localeCompare(nameB);
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const getStatusBadge = (payable: PayableRow) => {
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(payable.due_date));
    const isOverdue = isBefore(dueDate, today);
    const isReconciled = !!payable.reconciliation_id;

    if (payable.is_paid) {
      return (
        <div className="flex flex-wrap gap-1">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Pago
          </Badge>
          {isReconciled && (
            <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/30">
              <Link2 className="mr-1 h-3 w-3" />
              Conciliado
            </Badge>
          )}
        </div>
      );
    }

    if (payable.payment_status === "sent_to_bank" || payable.payment_status === "submitted_for_approval") {
      return (
        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 hover:bg-purple-500/20">
          <Calendar className="mr-1 h-3 w-3" />
          Agendado
        </Badge>
      );
    }

    if (isOverdue) {
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Vencida
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
        <Clock className="mr-1 h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method: string | null) => {
    if (!method) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    
    if (method === "pix") {
      return (
        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
          <QrCode className="mr-1 h-3 w-3" />
          PIX
        </Badge>
      );
    }
    
    if (method === "boleto") {
      return (
        <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-500/20">
          <Receipt className="mr-1 h-3 w-3" />
          Boleto
        </Badge>
      );
    }
    
    return <Badge variant="outline">{method}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (payables.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Nenhuma conta encontrada</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Não há contas a pagar para o período e filtros selecionados.
        </p>
      </div>
    );
  }

  const isMobile = useIsMobile();

  // Mobile card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {sortedPayables.map((payable) => {
          const isSelected = selectedIds.has(payable.id);
          const canSelect = !payable.is_paid && payable.payment_status !== "sent_to_bank";
          
          return (
            <div
              key={payable.id}
              className={cn(
                "rounded-lg border bg-card p-3 space-y-3",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {canSelect && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(payable.id)}
                      className="mt-0.5"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm line-clamp-1">
                      {payable.description || "Sem descrição"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {payable.supplier?.nome_fantasia || payable.supplier?.razao_social || "—"}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onEdit(payable)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalhes
                    </DropdownMenuItem>
                    {!payable.is_paid && (
                      <DropdownMenuItem onClick={() => onEdit(payable)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {!payable.is_paid && payable.pix_key && (
                      <DropdownMenuItem onClick={() => onPayPix(payable)}>
                        <QrCode className="mr-2 h-4 w-4 text-emerald-600" />
                        Pagar com PIX
                      </DropdownMenuItem>
                    )}
                    {!payable.is_paid && payable.boleto_barcode && (
                      <DropdownMenuItem onClick={() => onPayBoleto(payable)}>
                        <Receipt className="mr-2 h-4 w-4 text-blue-600" />
                        Pagar Boleto
                      </DropdownMenuItem>
                    )}
                    {!payable.is_paid && (
                      <DropdownMenuItem onClick={() => onMarkAsPaid(payable)}>
                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                        Marcar como pago
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDuplicate(payable)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    {!payable.is_paid && (
                      <DropdownMenuItem
                        onClick={() => onDelete(payable)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Details */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="tabular-nums text-muted-foreground">
                  {format(parseISO(payable.due_date), "dd/MM/yyyy")}
                </span>
                {getPaymentMethodBadge(payable.payment_method_type)}
                {getStatusBadge(payable)}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-lg font-bold tabular-nums">
                  {formatCurrency(payable.amount)}
                </span>
                {!payable.is_paid && payable.pix_key && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPayPix(payable)}
                    className="h-8 text-xs gap-1"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Pagar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-semibold"
                onClick={() => handleSort("supplier")}
              >
                Descrição
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-semibold"
                onClick={() => handleSort("due_date")}
              >
                Vencimento
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 font-semibold"
                onClick={() => handleSort("amount")}
              >
                Valor
                <ArrowUpDown className="ml-1 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPayables.map((payable) => {
            const isSelected = selectedIds.has(payable.id);
            const canSelect = !payable.is_paid && payable.payment_status !== "sent_to_bank";
            
            return (
              <TableRow
                key={payable.id}
                className={cn(
                  "group transition-colors",
                  isSelected && "bg-primary/5"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(payable.id)}
                    disabled={!canSelect}
                    aria-label={`Selecionar ${payable.description}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <span className="font-medium text-foreground line-clamp-1">
                      {payable.description || "Sem descrição"}
                    </span>
                    {payable.document_number && (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                        {payable.document_number}
                      </code>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">
                      {payable.supplier?.nome_fantasia || payable.supplier?.razao_social || "—"}
                    </span>
                    {payable.purchase_order && (
                      <Link
                        to={`/pedidos-compra?edit=${payable.purchase_order_id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        Pedido #{payable.purchase_order.order_number}
                      </Link>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm tabular-nums">
                    {format(parseISO(payable.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </TableCell>
                <TableCell>
                  {getPaymentMethodBadge(payable.payment_method_type)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(payable.amount)}
                  </span>
                </TableCell>
                <TableCell>{getStatusBadge(payable)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onEdit(payable)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      
                      {!payable.is_paid && (
                        <DropdownMenuItem onClick={() => onEdit(payable)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      {!payable.is_paid && payable.pix_key && (
                        <DropdownMenuItem onClick={() => onPayPix(payable)}>
                          <QrCode className="mr-2 h-4 w-4 text-emerald-600" />
                          Pagar com PIX
                        </DropdownMenuItem>
                      )}
                      
                      {!payable.is_paid && payable.boleto_barcode && (
                        <DropdownMenuItem onClick={() => onPayBoleto(payable)}>
                          <Receipt className="mr-2 h-4 w-4 text-blue-600" />
                          Pagar Boleto
                        </DropdownMenuItem>
                      )}
                      
                      {!payable.is_paid && (
                        <DropdownMenuItem onClick={() => onMarkAsPaid(payable)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                          Marcar como pago
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => onDuplicate(payable)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      
                      {!payable.is_paid && (
                        <DropdownMenuItem
                          onClick={() => onDelete(payable)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
