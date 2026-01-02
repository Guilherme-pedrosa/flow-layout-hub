import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, RefreshCw, X, AlertTriangle, AlertCircle, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { WaiInsight } from '@/hooks/useWaiInsights';

// Backward compatibility with old AiInsight type
interface LegacyAiInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  confidence: number;
  action: { label: string; href: string };
  createdAt: string;
}

interface AiInsightCardProps {
  insight?: WaiInsight | LegacyAiInsight | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onDismiss?: (id: string, source?: 'ai_insights' | 'ai_observer_alerts') => void;
}

const typeConfig = {
  critical: {
    bg: 'bg-gradient-to-r from-destructive to-destructive/80',
    icon: AlertTriangle,
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
  warning: {
    bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    icon: AlertCircle,
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
  opportunity: {
    bg: 'bg-gradient-to-r from-primary to-primary/80',
    icon: Lightbulb,
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
  info: {
    bg: 'bg-gradient-to-r from-primary to-primary/80',
    icon: Sparkles,
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
};

export function AiInsightCard({ insight, isLoading, onRefresh, onDismiss }: AiInsightCardProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (isLoading) {
    return (
      <div className="ai-banner">
        <Skeleton className="h-5 w-5 rounded bg-primary/20 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 bg-primary/10" />
          <Skeleton className="h-4 w-1/2 bg-primary/10" />
        </div>
      </div>
    );
  }

  if (!insight) return null;

  const config = typeConfig[insight.type] || typeConfig.info;
  const Icon = config.icon;
  const source = 'source' in insight ? insight.source : undefined;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss && source) {
      onDismiss(insight.id, source);
    }
  };

  return (
    <div className={cn(
      "rounded-lg border-0 p-4 animate-slide-down",
      config.bg
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", config.iconBg)}>
            <Icon className={cn("h-5 w-5", config.textColor)} />
          </div>
          <div>
            <p className={cn("font-medium", config.textColor)}>{insight.title}</p>
            <p className={cn("text-sm opacity-80", config.textColor)}>{insight.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-primary hover:bg-white/90"
            onClick={() => navigate(insight.action.href)}
          >
            {insight.action.label}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          <button
            onClick={handleDismiss}
            className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Dispensar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
