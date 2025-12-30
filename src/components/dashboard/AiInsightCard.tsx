import { AiInsight } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface AiInsightCardProps {
  insight?: AiInsight | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function AiInsightCard({ insight, isLoading, onRefresh }: AiInsightCardProps) {
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

  return (
    <div className="ai-banner animate-slide-down">
      {/* Icon */}
      <div className="ai-banner-icon">
        <Sparkles className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="ai-banner-content">
        <p className="ai-banner-text">
          <strong className="font-semibold">{insight.title}:</strong>{' '}
          {insight.description}
        </p>
      </div>

      {/* Action button */}
      <Button
        size="sm"
        onClick={() => navigate(insight.action.href)}
        className="ai-banner-action flex-shrink-0"
      >
        {insight.action.label}
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>

      {/* Refresh button */}
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/10 flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="ai-banner-dismiss flex-shrink-0"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
