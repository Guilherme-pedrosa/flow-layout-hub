import { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AIInsight {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: 'info' | 'warning' | 'success';
}

interface AIBannerProps {
  insights: AIInsight[];
  onDismiss?: (id: string) => void;
  className?: string;
  context?: string;
}

/**
 * Banner de IA - Componente Global
 * Regras conforme WeDo ERP Spec v3.2 (A.5):
 * - Máximo de 1 insight + 1 ação por vez
 * - Não repete mensagens descartadas
 * - Nunca bloqueia o fluxo de trabalho
 */
export function AIBanner({ insights, onDismiss, className, context }: AIBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentInsight, setCurrentInsight] = useState<AIInsight | null>(null);

  useEffect(() => {
    // Mostrar apenas o primeiro insight não descartado
    const activeInsight = insights.find(i => !dismissedIds.has(i.id));
    setCurrentInsight(activeInsight || null);
  }, [insights, dismissedIds]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    onDismiss?.(id);
  };

  if (!currentInsight) return null;

  const bgColor = {
    info: 'bg-primary/10 border-primary/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    success: 'bg-emerald-500/10 border-emerald-500/20',
  }[currentInsight.type || 'info'];

  const iconColor = {
    info: 'text-primary',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
  }[currentInsight.type || 'info'];

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-all',
      bgColor,
      className
    )}>
      <div className={cn('flex-shrink-0', iconColor)}>
        {currentInsight.type === 'warning' ? (
          <Lightbulb className="h-5 w-5" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90">
          {currentInsight.message}
        </p>
        {context && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Contexto: {context}
          </p>
        )}
      </div>
      
      {currentInsight.action && (
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 gap-1"
          onClick={currentInsight.action.onClick}
        >
          {currentInsight.action.label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => handleDismiss(currentInsight.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
