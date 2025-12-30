import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight,
  DollarSign,
  Eye,
  Edit,
  FileText,
  GripVertical,
  MoreVertical,
  Package,
  User,
} from "lucide-react";
import { useSales, useSaleStatuses, Sale, SaleStatus } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AIBanner } from "@/components/shared";

interface SalesPipelineProps {
  onEdit: (sale: Sale) => void;
  onView: (sale: Sale) => void;
}

interface PipelineColumn {
  status: SaleStatus;
  sales: Sale[];
  totalValue: number;
}

export function SalesPipeline({ onEdit, onView }: SalesPipelineProps) {
  const { sales, isLoading: salesLoading, updateSale, refetch } = useSales();
  const { statuses, isLoading: statusesLoading, getActiveStatuses } = useSaleStatuses();
  const [draggedSale, setDraggedSale] = useState<Sale | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const activeStatuses = getActiveStatuses();

  // Organizar vendas por status
  const columns: PipelineColumn[] = useMemo(() => {
    return activeStatuses.map(status => {
      const statusSales = sales.filter(s => s.status_id === status.id);
      const totalValue = statusSales.reduce((sum, s) => sum + s.total_value, 0);
      return { status, sales: statusSales, totalValue };
    });
  }, [activeStatuses, sales]);

  // Vendas sem status
  const unassignedSales = useMemo(() => {
    return sales.filter(s => !s.status_id || !activeStatuses.some(st => st.id === s.status_id));
  }, [sales, activeStatuses]);

  const handleDragStart = (e: React.DragEvent, sale: Sale) => {
    setDraggedSale(sale);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedSale(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(statusId);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    setDragOverStatus(null);

    if (!draggedSale || draggedSale.status_id === targetStatusId) return;

    const targetStatus = activeStatuses.find(s => s.id === targetStatusId);
    if (!targetStatus) return;

    try {
      await updateSale.mutateAsync({ 
        id: draggedSale.id, 
        sale: { status_id: targetStatusId } 
      });
      refetch();
      toast.success(`Venda movida para "${targetStatus.name}"`);
    } catch (error) {
      toast.error("Erro ao mover venda");
    }
  };

  const isLoading = salesLoading || statusesLoading;

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-shrink-0 w-80">
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-32 w-full mb-2" />
            <Skeleton className="h-32 w-full mb-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Banner */}
      <AIBanner
        insights={[{
          id: 'pipeline-tip',
          message: 'Arraste as vendas entre colunas para alterar o status. A movimentação automática de estoque e financeiro segue as regras configuradas em cada status.',
          type: 'info'
        }]}
        context="Pipeline de Vendas"
      />

      {/* Pipeline Columns */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {/* Coluna de não atribuídas */}
          {unassignedSales.length > 0 && (
            <div className="flex-shrink-0 w-80">
              <Card className="bg-muted/30">
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Sem Status
                    </CardTitle>
                    <Badge variant="outline">{unassignedSales.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {unassignedSales.map(sale => (
                    <SaleCard
                      key={sale.id}
                      sale={sale}
                      onEdit={onEdit}
                      onView={onView}
                      onDragStart={(e) => handleDragStart(e, sale)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Colunas de status */}
          {columns.map(column => (
            <div
              key={column.status.id}
              className="flex-shrink-0 w-80"
              onDragOver={(e) => handleDragOver(e, column.status.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.status.id)}
            >
              <Card
                className={cn(
                  "transition-all",
                  dragOverStatus === column.status.id && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ 
                  borderTopColor: column.status.color, 
                  borderTopWidth: '3px' 
                }}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">
                        {column.status.name}
                      </CardTitle>
                      <div className="flex gap-1">
                        {column.status.stock_behavior !== 'none' && (
                          <Package className="h-3 w-3 text-muted-foreground" />
                        )}
                        {column.status.financial_behavior !== 'none' && (
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{column.sales.length}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total: {formatCurrency(column.totalValue)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto min-h-[100px]">
                  {column.sales.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      Arraste vendas para cá
                    </div>
                  ) : (
                    column.sales.map(sale => (
                      <SaleCard
                        key={sale.id}
                        sale={sale}
                        onEdit={onEdit}
                        onView={onView}
                        onDragStart={(e) => handleDragStart(e, sale)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedSale?.id === sale.id}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

interface SaleCardProps {
  sale: Sale;
  onEdit: (sale: Sale) => void;
  onView: (sale: Sale) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
}

function SaleCard({ sale, onEdit, onView, onDragStart, onDragEnd, isDragging }: SaleCardProps) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
        isDragging && "opacity-50 rotate-2"
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm">#{sale.sale_number}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <User className="h-3 w-3" />
              <span className="truncate">
                {sale.client?.nome_fantasia || sale.client?.razao_social || 'Consumidor Final'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">
                {formatCurrency(sale.total_value)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(sale)}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(sale)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DollarSign className="h-4 w-4 mr-2" />
                Financeiro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}