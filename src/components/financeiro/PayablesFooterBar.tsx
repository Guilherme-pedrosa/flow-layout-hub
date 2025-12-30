import { cn } from "@/lib/utils";

interface PayablesFooterBarProps {
  selectedCount: number;
  totalPending: number;
  totalPage: number;
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PayablesFooterBar({
  selectedCount,
  totalPending,
  totalPage,
  className,
}: PayablesFooterBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 bg-muted/50 border-t rounded-b-lg",
        "text-sm font-medium",
        className
      )}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Selecionados:</span>
          <span className={cn(
            "font-bold tabular-nums",
            selectedCount > 0 ? "text-primary" : "text-foreground"
          )}>
            {selectedCount}
          </span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total Pendente:</span>
          <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {formatCurrency(totalPending)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total Página:</span>
        <span className="font-bold tabular-nums">{totalPage}</span>
      </div>
    </div>
  );
}
