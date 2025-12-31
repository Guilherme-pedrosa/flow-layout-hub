import { cn } from "@/lib/utils";

export type ReceivableStatusFilter = "all" | "pending" | "overdue" | "received" | "today";

interface StatusCardData {
  key: ReceivableStatusFilter;
  label: string;
  count: number;
  amount: number;
  colorClass: string;
}

interface ReceivablesStatusCardsProps {
  counts: {
    all: number;
    pending: number;
    overdue: number;
    received: number;
    today?: number;
  };
  amounts: {
    all: number;
    pending: number;
    overdue: number;
    received: number;
    today?: number;
  };
  activeFilter: ReceivableStatusFilter;
  onFilterChange: (filter: ReceivableStatusFilter) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function ReceivablesStatusCards({
  counts,
  amounts,
  activeFilter,
  onFilterChange,
}: ReceivablesStatusCardsProps) {
  const cards: StatusCardData[] = [
    { 
      key: "overdue", 
      label: "Vencidos", 
      count: counts.overdue,
      amount: amounts.overdue,
      colorClass: "status-card-overdue",
    },
    { 
      key: "today", 
      label: "Vence Hoje", 
      count: counts.today || 0,
      amount: amounts.today || 0,
      colorClass: "status-card-today",
    },
    { 
      key: "pending", 
      label: "A Vencer", 
      count: counts.pending,
      amount: amounts.pending,
      colorClass: "status-card-upcoming",
    },
    { 
      key: "received", 
      label: "Recebidos", 
      count: counts.received,
      amount: amounts.received,
      colorClass: "status-card-paid",
    },
    { 
      key: "all", 
      label: "Total", 
      count: counts.all,
      amount: amounts.all,
      colorClass: "status-card-total",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        
        return (
          <button
            key={card.key}
            onClick={() => onFilterChange(card.key)}
            className={cn(
              "status-card text-left",
              isActive && "status-card-active",
              isActive && card.colorClass
            )}
          >
            {/* Count */}
            <span className={cn(
              "status-card-count",
              card.key === "overdue" && "text-destructive",
              card.key === "today" && "text-warning",
              card.key === "pending" && "text-info",
              card.key === "received" && "text-success",
              card.key === "all" && "text-foreground"
            )}>
              {card.count}
            </span>
            
            {/* Amount */}
            <span className="status-card-value">
              R$ {formatCurrency(card.amount)}
            </span>
            
            {/* Label */}
            <span className="status-card-label">
              {card.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
