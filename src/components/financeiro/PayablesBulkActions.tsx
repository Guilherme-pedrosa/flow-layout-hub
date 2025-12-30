import { Button } from "@/components/ui/button";
import { Send, CheckCircle, Trash2, X, Loader2 } from "lucide-react";
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          "flex items-center gap-4 px-6 py-4 rounded-xl shadow-2xl",
          "bg-background/95 backdrop-blur-sm border-2 border-primary/20",
          "animate-in slide-in-from-bottom-4 duration-300"
        )}
      >
        <div className="flex items-center gap-3 pr-4 border-r border-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Total: {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onSubmitToBank}
            disabled={isProcessing}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Pagar Selecionados
          </Button>

          <Button
            variant="secondary"
            onClick={onMarkAsPaid}
            disabled={isProcessing}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Marcar como Pago
          </Button>

          <Button
            variant="outline"
            onClick={onDelete}
            disabled={isProcessing}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-9 w-9 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
