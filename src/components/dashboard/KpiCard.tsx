import { KpiData } from '@/lib/types';
import { formatCurrency, formatNumber, calculatePercentageChange, getTrendColorClass } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, DollarSign, ShoppingCart, AlertTriangle, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface KpiCardProps {
  data?: KpiData;
  isLoading?: boolean;
}

const iconMap = {
  dollar: DollarSign,
  cart: ShoppingCart,
  alert: AlertTriangle,
  box: Package,
};

export function KpiCard({ data, isLoading }: KpiCardProps) {
  if (isLoading || !data) {
    return (
      <Card className="p-6">
        <Skeleton className="h-4 w-24 mb-3" data-testid="skeleton" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </Card>
    );
  }

  const percentageChange = calculatePercentageChange(data.value, data.previousValue);
  const formattedValue = data.format === 'currency'
    ? formatCurrency(data.value)
    : formatNumber(data.value);

  const TrendIcon = data.trend === 'up'
    ? ArrowUpIcon
    : data.trend === 'down'
    ? ArrowDownIcon
    : MinusIcon;

  const Icon = iconMap[data.icon];
  const trendClass = getTrendColorClass(data.trend);

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{data.title}</span>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <div className="text-3xl font-bold mb-2">{formattedValue}</div>
      
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendClass}`}>
          <TrendIcon className="w-3 h-3" />
          {Math.abs(percentageChange).toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">vs mês anterior</span>
      </div>
    </Card>
  );
}
