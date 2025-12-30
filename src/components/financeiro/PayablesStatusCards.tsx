import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export type PayableStatusFilter = "all" | "pending" | "overdue" | "paid" | "today" | "scheduled";

interface StatusCardData {
  key: PayableStatusFilter;
  label: string;
  amount: number;
  headerColor: string;
  valueColor: string;
}

interface PayablesStatusCardsProps {
  counts: {
    all: number;
    pending: number;
    overdue: number;
    paid: number;
    scheduled: number;
    today?: number;
  };
  amounts: {
    all: number;
    pending: number;
    overdue: number;
    paid: number;
    scheduled: number;
    today?: number;
  };
  activeFilter: PayableStatusFilter;
  onFilterChange: (filter: PayableStatusFilter) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function PayablesStatusCards({
  counts,
  amounts,
  activeFilter,
  onFilterChange,
}: PayablesStatusCardsProps) {
  const cards: StatusCardData[] = [
    { 
      key: "overdue", 
      label: "Vencidos", 
      amount: amounts.overdue,
      headerColor: "bg-red-500",
      valueColor: "text-red-500",
    },
    { 
      key: "today", 
      label: "Vencem hoje", 
      amount: amounts.today || 0,
      headerColor: "bg-orange-500",
      valueColor: "text-orange-500",
    },
    { 
      key: "pending", 
      label: "A vencer", 
      amount: amounts.pending,
      headerColor: "bg-gray-500",
      valueColor: "text-gray-600",
    },
    { 
      key: "paid", 
      label: "Pagos", 
      amount: amounts.paid,
      headerColor: "bg-green-500",
      valueColor: "text-green-500",
    },
    { 
      key: "all", 
      label: "Total", 
      amount: amounts.all,
      headerColor: "bg-gray-800",
      valueColor: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        
        return (
          <button
            key={card.key}
            onClick={() => onFilterChange(card.key)}
            className={cn(
              "text-left rounded-lg overflow-hidden border transition-all",
              isActive 
                ? "border-primary ring-2 ring-primary/20" 
                : "border-border hover:border-primary/30"
            )}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-3 py-2",
              card.headerColor,
              "text-white"
            )}>
              <span className="text-xs font-medium">{card.label}</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </div>
            
            {/* Value */}
            <div className="bg-card px-3 py-4">
              <p className={cn(
                "text-xl font-semibold tabular-nums",
                card.valueColor
              )}>
                {formatCurrency(card.amount)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}