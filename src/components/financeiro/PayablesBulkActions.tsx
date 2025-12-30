import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send, CheckCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PayablesBulkActionsProps {
  selectedCount: number;
  totalAmount: number;
  onSubmitToBank: () => void;
  onMarkAsPaid: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PayablesBulkActions({
  selectedCount,
  totalAmount,
  onSubmitToBank,
  onMarkAsPaid,
  onDelete,
  onClearSelection,
  isProcessing,
}: PayablesBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <Card
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-4 px-4 py-3",
        "bg-card border shadow-xl",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      <div className="flex items-center gap-3 pr-4 border-r">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="text-sm">
          <span className="font-semibold">{selectedCount}</span>
          <span className="text-muted-foreground"> selecionado{selectedCount > 1 ? "s" : ""}</span>
        </div>
        <div className="text-sm font-semibold text-primary">
          {formatCurrency(totalAmount)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onSubmitToBank}
          disabled={isProcessing}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Pagar Selecionados
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkAsPaid}
          disabled={isProcessing}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Marcar como Pago
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isProcessing}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>
    </Card>
  );
}
