import { AiInsight } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, RefreshCw, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AiInsightCardProps {
  insight?: AiInsight | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const typeConfig = {
  opportunity: {
    icon: TrendingUp,
    bgClass: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    borderClass: 'border-emerald-200',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-gradient-to-br from-amber-500 to-orange-600',
    borderClass: 'border-amber-200',
  },
  info: {
    icon: Info,
    bgClass: 'bg-gradient-to-br from-blue-500 to-blue-600',
    borderClass: 'border-blue-200',
  },
};

export function AiInsightCard({ insight, isLoading, onRefresh }: AiInsightCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-xl bg-white/10" />
          <div className="flex-1">
            <Skeleton className="h-5 w-48 mb-2 bg-white/10" />
            <Skeleton className="h-4 w-full bg-white/10" />
          </div>
        </div>
      </Card>
    );
  }

  if (!insight) return null;

  const config = typeConfig[insight.type];
  const TypeIcon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(insight.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600 text-white border-0">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shadow-lg', config.bgClass)}>
            <Sparkles className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon className="h-4 w-4 text-white/70" />
              <span className="text-sm font-medium text-white/70">
                {insight.type === 'opportunity' && 'Oportunidade'}
                {insight.type === 'warning' && 'Atenção'}
                {insight.type === 'info' && 'Informação'}
              </span>
            </div>

            <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
            <p className="text-white/80 text-sm mb-4">{insight.description}</p>

            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(insight.action.href)}
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                {insight.action.label}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50">
                  Confiança: {insight.confidence}%
                </span>
                <span className="text-xs text-white/30">•</span>
                <span className="text-xs text-white/50">{timeAgo}</span>
                
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
