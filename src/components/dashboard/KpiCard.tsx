import { KpiData } from '@/lib/types';
import { formatCurrency, formatNumber, calculatePercentageChange } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, DollarSign, ShoppingCart, AlertTriangle, Package, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  data?: KpiData;
  isLoading?: boolean;
  onClick?: () => void;
}

const iconMap = {
  dollar: Wallet,
  cart: ShoppingCart,
  alert: AlertTriangle,
  box: Package,
};

export function KpiCard({ data, isLoading, onClick }: KpiCardProps) {
  const navigate = useNavigate();

  if (isLoading || !data) {
    return (
      <div className="kpi-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32 mb-3" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  const percentageChange = calculatePercentageChange(data.value, data.previousValue);
  const formattedValue = data.format === 'currency'
    ? formatCurrency(data.value)
    : formatNumber(data.value);

  const Icon = iconMap[data.icon];
  const isPositive = data.trend === 'up';
  const isNegative = data.trend === 'down';

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={cn(
        "kpi-card p-6",
        onClick && "cursor-pointer"
      )}
      onClick={onClick ? handleClick : undefined}
    >
      {/* Title with icon */}
      <div className="kpi-card-title">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="uppercase tracking-wide">{data.title}</span>
      </div>
      
      {/* Main value - Display size (32px Bold) */}
      <div className="kpi-card-value mb-3 tabular-nums">
        {formattedValue}
      </div>
      
      {/* Trend indicator */}
      <div className={cn(
        "kpi-card-trend",
        isPositive && "kpi-card-trend-up",
        isNegative && "kpi-card-trend-down",
        !isPositive && !isNegative && "text-muted-foreground"
      )}>
        {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
        {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
        {!isPositive && !isNegative && <MinusIcon className="h-3.5 w-3.5" />}
        <span>
          {isPositive && '+'}
          {Math.abs(percentageChange).toFixed(1)}%
        </span>
        <span className="text-muted-foreground ml-1">vs mês anterior</span>
      </div>
    </div>
  );
}
