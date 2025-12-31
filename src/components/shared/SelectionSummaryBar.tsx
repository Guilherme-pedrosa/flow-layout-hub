import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, CheckSquare } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface SelectionSummaryBarProps {
  selectedCount: number;
  totalSum: number;
  positiveSum?: number;
  negativeSum?: number;
  onClear: () => void;
  showBreakdown?: boolean;
  className?: string;
}

export function SelectionSummaryBar({
  selectedCount,
  totalSum,
  positiveSum,
  negativeSum,
  onClear,
  showBreakdown = false,
  className
}: SelectionSummaryBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200",
      className
    )}>
      <Card className="flex items-center gap-4 px-6 py-3 shadow-lg border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2 text-primary">
          <CheckSquare className="h-5 w-5" />
          <span className="font-medium">{selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-4">
          {showBreakdown && positiveSum !== undefined && negativeSum !== undefined ? (
            <>
              {positiveSum > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Entradas: </span>
                  <span className="font-semibold text-green-600">{formatCurrency(positiveSum)}</span>
                </div>
              )}
              {negativeSum < 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Saídas: </span>
                  <span className="font-semibold text-red-600">{formatCurrency(Math.abs(negativeSum))}</span>
                </div>
              )}
              <div className="h-4 w-px bg-border" />
            </>
          ) : null}
          
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className={cn(
              "font-bold text-lg",
              totalSum >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(Math.abs(totalSum))}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-2"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}
