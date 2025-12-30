import { Button } from "@/components/ui/button";
import { Send, Trash2, X, Loader2 } from "lucide-react";

interface PayablesBulkActionsProps {
  selectedCount: number;
  totalAmount: number;
  onSubmitToBank: () => void;
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
  onDelete,
  onClearSelection,
  isProcessing,
}: PayablesBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bulk-actions-bar shadow-xl">
        {/* Count and total */}
        <div className="flex items-center gap-3 pr-4 border-r border-primary/20">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">{selectedCount}</span>
          </div>
          <div>
            <p className="bulk-actions-count">
              {selectedCount} {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
            </p>
            <p className="text-[12px] text-muted-foreground tabular-nums">
              Total: {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onSubmitToBank}
            disabled={isProcessing}
            size="sm"
            className="gap-2"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spinner" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar para Aprovação
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isProcessing}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-8 w-8 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
