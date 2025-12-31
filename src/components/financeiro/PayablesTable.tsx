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
  Copy,
  Trash2,
  ShoppingCart,
  Link2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { SituationSelect } from "./SituationSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSortableData } from "@/hooks/useSortableData";
import { SortableTableHeader } from "@/components/shared";

interface FinancialSituation {
  id: string;
  name: string;
  color: string;
  confirms_payment: boolean;
  allows_manual_change: boolean;
}

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
  financial_situation_id: string | null;
  supplier?: {
    razao_social: string | null;
    nome_fantasia: string | null;
    cpf_cnpj?: string | null;
  };
  purchase_order?: {
    order_number: number;
  } | null;
  financial_situation?: FinancialSituation | null;
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
  onDuplicate: (payable: PayableRow) => void;
  onRefresh?: () => void;
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
  onDuplicate,
  onRefresh,
  loading,
}: PayablesTableProps) {
  const isMobile = useIsMobile();

  // Preparar dados com campo de ordenação por fornecedor
  const payablesWithSortKey = payables.map(p => ({
    ...p,
    _supplierName: p.supplier?.nome_fantasia || p.supplier?.razao_social || ""
  }));

  const { items: sortedPayables, requestSort, sortConfig } = useSortableData(payablesWithSortKey, 'due_date');

  const selectablePayables = payables.filter(
    (p) => !p.is_paid && p.payment_status !== "sent_to_bank"
  );
  
  const allSelected = selectablePayables.length > 0 && 
    selectablePayables.every((p) => selectedIds.has(p.id));

  // Handler para atualizar situação financeira
  const handleSituationChange = async (payableId: string, situationId: string) => {
    try {
      const { error } = await supabase
        .from("payables")
        .update({ financial_situation_id: situationId })
        .eq("id", payableId);

      if (error) throw error;
      
      toast.success("Situação atualizada");
      onRefresh?.();
    } catch (error) {
      console.error("Erro ao atualizar situação:", error);
      toast.error("Erro ao atualizar situação");
    }
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
                    {!payable.is_paid && (payable.pix_key || payable.boleto_barcode) && (
                      <DropdownMenuItem onClick={() => payable.pix_key ? onPayPix(payable) : onPayBoleto(payable)}>
                        {payable.pix_key ? (
                          <>
                            <QrCode className="mr-2 h-4 w-4 text-emerald-600" />
                            Enviar para Aprovação
                          </>
                        ) : (
                          <>
                            <Receipt className="mr-2 h-4 w-4 text-blue-600" />
                            Enviar Boleto
                          </>
                        )}
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
              </div>

              {/* Situação */}
              <div className="pt-1">
                <SituationSelect
                  value={payable.financial_situation_id}
                  onValueChange={(situationId) => handleSituationChange(payable.id, situationId)}
                  className="w-full"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-lg font-bold tabular-nums">
                  {formatCurrency(payable.amount)}
                </span>
                {!payable.is_paid && (payable.pix_key || payable.boleto_barcode) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => payable.pix_key ? onPayPix(payable) : onPayBoleto(payable)}
                    className="h-8 text-xs gap-1"
                  >
                    {payable.pix_key ? (
                      <QrCode className="h-3.5 w-3.5" />
                    ) : (
                      <Receipt className="h-3.5 w-3.5" />
                    )}
                    Enviar
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
            <SortableTableHeader
              label="Descrição"
              sortKey="description"
              currentSortKey={sortConfig.key}
              sortDirection={sortConfig.direction}
              onSort={requestSort}
              className="min-w-[200px]"
            />
            <SortableTableHeader
              label="Fornecedor"
              sortKey="_supplierName"
              currentSortKey={sortConfig.key}
              sortDirection={sortConfig.direction}
              onSort={requestSort}
            />
            <SortableTableHeader
              label="Vencimento"
              sortKey="due_date"
              currentSortKey={sortConfig.key}
              sortDirection={sortConfig.direction}
              onSort={requestSort}
            />
            <TableHead>Método</TableHead>
            <SortableTableHeader
              label="Valor"
              sortKey="amount"
              currentSortKey={sortConfig.key}
              sortDirection={sortConfig.direction}
              onSort={requestSort}
              className="text-right"
            />
            <TableHead>Situação</TableHead>
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
                  "group transition-colors cursor-pointer hover:bg-muted/50",
                  isSelected && "bg-primary/5"
                )}
                onClick={() => onEdit(payable)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
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
                      {payable.recipient_name || payable.supplier?.nome_fantasia || payable.supplier?.razao_social || "—"}
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <SituationSelect
                    value={payable.financial_situation_id}
                    onValueChange={(situationId) => handleSituationChange(payable.id, situationId)}
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
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
                      
                      {!payable.is_paid && (payable.pix_key || payable.boleto_barcode) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => payable.pix_key ? onPayPix(payable) : onPayBoleto(payable)}>
                            {payable.pix_key ? (
                              <>
                                <QrCode className="mr-2 h-4 w-4 text-emerald-600" />
                                Enviar para Aprovação
                              </>
                            ) : (
                              <>
                                <Receipt className="mr-2 h-4 w-4 text-blue-600" />
                                Enviar Boleto
                              </>
                            )}
                          </DropdownMenuItem>
                        </>
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
