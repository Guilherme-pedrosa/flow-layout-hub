import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle, Calendar, LayoutGrid } from "lucide-react";

export type PayableStatusFilter = "all" | "pending" | "overdue" | "paid" | "scheduled";

interface StatusCardData {
  key: PayableStatusFilter;
  label: string;
  count: number;
  amount: number;
  icon: React.ElementType;
}

interface PayablesStatusCardsProps {
  counts: {
    all: number;
    pending: number;
    overdue: number;
    paid: number;
    scheduled: number;
  };
  amounts: {
    all: number;
    pending: number;
    overdue: number;
    paid: number;
    scheduled: number;
  };
  activeFilter: PayableStatusFilter;
  onFilterChange: (filter: PayableStatusFilter) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getCardStyles = (key: PayableStatusFilter, isActive: boolean) => {
  const styles: Record<PayableStatusFilter, { bg: string; text: string; icon: string; border: string; activeBg: string }> = {
    all: {
      bg: "bg-slate-50 dark:bg-slate-800/30",
      activeBg: "bg-slate-100 dark:bg-slate-800/50",
      text: "text-slate-700 dark:text-slate-300",
      icon: "text-slate-500",
      border: "border-slate-200 dark:border-slate-700",
    },
    pending: {
      bg: "bg-amber-50/50 dark:bg-amber-900/10",
      activeBg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
      icon: "text-amber-500",
      border: "border-amber-200 dark:border-amber-800",
    },
    overdue: {
      bg: "bg-red-50/50 dark:bg-red-900/10",
      activeBg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
      icon: "text-red-500",
      border: "border-red-200 dark:border-red-800",
    },
    paid: {
      bg: "bg-emerald-50/50 dark:bg-emerald-900/10",
      activeBg: "bg-emerald-50 dark:bg-emerald-900/20",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: "text-emerald-500",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    scheduled: {
      bg: "bg-blue-50/50 dark:bg-blue-900/10",
      activeBg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-700 dark:text-blue-400",
      icon: "text-blue-500",
      border: "border-blue-200 dark:border-blue-800",
    },
  };
  return styles[key];
};

export function PayablesStatusCards({
  counts,
  amounts,
  activeFilter,
  onFilterChange,
}: PayablesStatusCardsProps) {
  const cards: StatusCardData[] = [
    { key: "all", label: "Total", count: counts.all, amount: amounts.all, icon: LayoutGrid },
    { key: "pending", label: "Pendentes", count: counts.pending, amount: amounts.pending, icon: Clock },
    { key: "overdue", label: "Vencidas", count: counts.overdue, amount: amounts.overdue, icon: AlertTriangle },
    { key: "paid", label: "Pagas", count: counts.paid, amount: amounts.paid, icon: CheckCircle },
    { key: "scheduled", label: "Agendadas", count: counts.scheduled, amount: amounts.scheduled, icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        const styles = getCardStyles(card.key, isActive);
        const Icon = card.icon;
        
        return (
          <button
            key={card.key}
            onClick={() => onFilterChange(card.key)}
            className={cn(
              "relative text-left p-5 rounded-xl border transition-all duration-200",
              "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20",
              isActive ? styles.activeBg : styles.bg,
              isActive ? styles.border : "border-transparent",
            )}
          >
            {/* Label + Icon */}
            <div className="flex items-center justify-between mb-3">
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                isActive ? styles.text : "text-muted-foreground"
              )}>
                {card.label}
              </span>
              <Icon className={cn("h-4 w-4", styles.icon)} />
            </div>
            
            {/* Count */}
            <p className={cn(
              "text-2xl font-bold tabular-nums mb-1",
              styles.text
            )}>
              {card.count}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {card.count === 1 ? "título" : "títulos"}
              </span>
            </p>
            
            {/* Amount */}
            <p className="text-sm font-semibold text-muted-foreground tabular-nums">
              {formatCurrency(card.amount)}
            </p>

            {/* Active indicator */}
            {isActive && (
              <div className={cn(
                "absolute bottom-0 left-4 right-4 h-0.5 rounded-full",
                card.key === "all" && "bg-slate-400",
                card.key === "pending" && "bg-amber-500",
                card.key === "overdue" && "bg-red-500",
                card.key === "paid" && "bg-emerald-500",
                card.key === "scheduled" && "bg-blue-500"
              )} />
            )}
          </button>
        );
      })}
    </div>
  );
}