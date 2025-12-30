import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle, Calendar, LayoutGrid } from "lucide-react";

export type PayableStatusFilter = "all" | "pending" | "overdue" | "paid" | "scheduled";

interface StatusCardData {
  key: PayableStatusFilter;
  label: string;
  count: number;
  amount: number;
  icon: React.ElementType;
  iconColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  activeBg: string;
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
      key: "all",
      label: "TODAS",
      count: counts.all,
      amount: amounts.all,
      icon: LayoutGrid,
      iconColor: "text-slate-500",
      textColor: "text-slate-700 dark:text-slate-300",
      bgColor: "bg-slate-100 dark:bg-slate-800/50",
      borderColor: "border-slate-300 dark:border-slate-700",
      activeBg: "bg-slate-200 dark:bg-slate-700",
    },
    {
      key: "pending",
      label: "PENDENTES",
      count: counts.pending,
      amount: amounts.pending,
      icon: Clock,
      iconColor: "text-amber-500",
      textColor: "text-amber-700 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      borderColor: "border-amber-300 dark:border-amber-700",
      activeBg: "bg-amber-100 dark:bg-amber-900/40",
    },
    {
      key: "overdue",
      label: "VENCIDAS",
      count: counts.overdue,
      amount: amounts.overdue,
      icon: AlertTriangle,
      iconColor: "text-red-500",
      textColor: "text-red-700 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-300 dark:border-red-700",
      activeBg: "bg-red-100 dark:bg-red-900/40",
    },
    {
      key: "paid",
      label: "PAGAS",
      count: counts.paid,
      amount: amounts.paid,
      icon: CheckCircle,
      iconColor: "text-emerald-500",
      textColor: "text-emerald-700 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      borderColor: "border-emerald-300 dark:border-emerald-700",
      activeBg: "bg-emerald-100 dark:bg-emerald-900/40",
    },
    {
      key: "scheduled",
      label: "AGENDADAS",
      count: counts.scheduled,
      amount: amounts.scheduled,
      icon: Calendar,
      iconColor: "text-blue-500",
      textColor: "text-blue-700 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-300 dark:border-blue-700",
      activeBg: "bg-blue-100 dark:bg-blue-900/40",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        const Icon = card.icon;
        
        return (
          <Card
            key={card.key}
            onClick={() => onFilterChange(card.key)}
            className={cn(
              "relative cursor-pointer transition-all duration-200 overflow-hidden",
              "border-2 hover:shadow-lg hover:-translate-y-0.5",
              isActive
                ? `${card.activeBg} ${card.borderColor} shadow-md ring-2 ring-offset-2 ring-offset-background`
                : `${card.bgColor} border-transparent hover:${card.borderColor}`,
              card.key === "all" && isActive && "ring-slate-400",
              card.key === "pending" && isActive && "ring-amber-400",
              card.key === "overdue" && isActive && "ring-red-400",
              card.key === "paid" && isActive && "ring-emerald-400",
              card.key === "scheduled" && isActive && "ring-blue-400"
            )}
          >
            <div className="p-4">
              {/* Header com label e icon */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={cn(
                    "text-xs font-bold tracking-wider",
                    card.textColor
                  )}
                >
                  {card.label}
                </span>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isActive ? "bg-background/80" : "bg-background/50"
                )}>
                  <Icon className={cn("h-4 w-4", card.iconColor)} />
                </div>
              </div>
              
              {/* Count grande */}
              <div className="space-y-1">
                <p
                  className={cn(
                    "text-3xl font-extrabold tabular-nums tracking-tight",
                    card.textColor
                  )}
                >
                  {card.count}
                </p>
                <p className={cn(
                  "text-sm font-semibold tabular-nums",
                  isActive ? card.textColor : "text-muted-foreground"
                )}>
                  {formatCurrency(card.amount)}
                </p>
              </div>
            </div>
            
            {/* Bottom indicator bar */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 transition-all",
                isActive && card.key === "all" && "bg-slate-500",
                isActive && card.key === "pending" && "bg-amber-500",
                isActive && card.key === "overdue" && "bg-red-500",
                isActive && card.key === "paid" && "bg-emerald-500",
                isActive && card.key === "scheduled" && "bg-blue-500",
                !isActive && "bg-transparent"
              )}
            />
          </Card>
        );
      })}
    </div>
  );
}
