import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle, Calendar, ListFilter } from "lucide-react";

export type PayableStatusFilter = "all" | "pending" | "overdue" | "paid" | "scheduled";

interface StatusCardData {
  key: PayableStatusFilter;
  label: string;
  count: number;
  amount: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
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

export function PayablesStatusCards({
  counts,
  amounts,
  activeFilter,
  onFilterChange,
}: PayablesStatusCardsProps) {
  const cards: StatusCardData[] = [
    {
      key: "all",
      label: "Todas",
      count: counts.all,
      amount: amounts.all,
      icon: ListFilter,
      color: "text-slate-600",
      bgColor: "bg-slate-50 dark:bg-slate-900/50",
      borderColor: "border-slate-200 dark:border-slate-800",
    },
    {
      key: "pending",
      label: "Pendentes",
      count: counts.pending,
      amount: amounts.pending,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      borderColor: "border-amber-200 dark:border-amber-800",
    },
    {
      key: "overdue",
      label: "Vencidas",
      count: counts.overdue,
      amount: amounts.overdue,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-800",
    },
    {
      key: "paid",
      label: "Pagas",
      count: counts.paid,
      amount: amounts.paid,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    },
    {
      key: "scheduled",
      label: "Agendadas",
      count: counts.scheduled,
      amount: amounts.scheduled,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        const Icon = card.icon;
        
        return (
          <Card
            key={card.key}
            onClick={() => onFilterChange(card.key)}
            className={cn(
              "relative cursor-pointer transition-all duration-200 overflow-hidden group",
              "border-2 hover:shadow-md",
              isActive
                ? `${card.bgColor} ${card.borderColor} shadow-sm`
                : "border-transparent hover:border-border bg-card"
            )}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    isActive ? card.color : "text-muted-foreground"
                  )}
                >
                  {card.label}
                </span>
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? card.color : "text-muted-foreground/50"
                  )}
                />
              </div>
              
              <div className="space-y-1">
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    isActive ? card.color : "text-foreground"
                  )}
                >
                  {card.count}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {formatCurrency(card.amount)}
                </p>
              </div>
            </div>
            
            {/* Active indicator */}
            {isActive && (
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-1",
                  card.key === "all" && "bg-slate-500",
                  card.key === "pending" && "bg-amber-500",
                  card.key === "overdue" && "bg-red-500",
                  card.key === "paid" && "bg-emerald-500",
                  card.key === "scheduled" && "bg-blue-500"
                )}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
