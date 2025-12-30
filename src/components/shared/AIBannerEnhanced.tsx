import { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, AlertTriangle, CheckCircle, Info, Bot, Shield, TrendingUp, Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { AiInsight } from '@/hooks/useAiInsights';

interface AIBannerEnhancedProps {
  insights: AiInsight[];
  onDismiss?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  className?: string;
  defaultMessage?: string;
  showModeIcon?: boolean;
}

const modeIcons = {
  auditora: Shield,
  cfo_bot: TrendingUp,
  especialista: Bot,
  executora: Cog,
};

const modeLabels = {
  auditora: 'Auditora',
  cfo_bot: 'CFO-Bot',
  especialista: 'Especialista',
  executora: 'Executora',
};

const typeStyles = {
  info: {
    bg: 'bg-primary/10 border-primary/20',
    icon: 'text-primary',
    IconComponent: Info,
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: 'text-amber-500',
    IconComponent: AlertTriangle,
  },
  success: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: 'text-emerald-500',
    IconComponent: CheckCircle,
  },
  critical: {
    bg: 'bg-destructive/10 border-destructive/20',
    icon: 'text-destructive',
    IconComponent: AlertTriangle,
  },
};

export function AIBannerEnhanced({ 
  insights, 
  onDismiss, 
  onMarkAsRead,
  className, 
  defaultMessage = "IA monitorando em tempo real",
  showModeIcon = true,
}: AIBannerEnhancedProps) {
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [currentInsight, setCurrentInsight] = useState<AiInsight | null>(null);

  useEffect(() => {
    // Mostrar apenas o primeiro insight não descartado, priorizando por priority e created_at
    const activeInsight = insights
      .filter(i => !dismissedIds.has(i.id))
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })[0];
    
    setCurrentInsight(activeInsight || null);
    
    // Marcar como lido quando exibido
    if (activeInsight && !activeInsight.is_read && onMarkAsRead) {
      onMarkAsRead(activeInsight.id);
    }
  }, [insights, dismissedIds, onMarkAsRead]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
    onDismiss?.(id);
  };

  const handleAction = (insight: AiInsight) => {
    if (insight.action_url) {
      navigate(insight.action_url);
    }
  };

  // Se não há insights, mostrar mensagem padrão de monitoramento
  if (!currentInsight) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        'bg-muted/50 border-border/50',
        className
      )}>
        <div className="flex-shrink-0 text-muted-foreground">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">
          {defaultMessage}
        </p>
      </div>
    );
  }

  const typeStyle = typeStyles[currentInsight.type] || typeStyles.info;
  const ModeIcon = modeIcons[currentInsight.mode];
  const TypeIcon = typeStyle.IconComponent;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-all',
      typeStyle.bg,
      className
    )}>
      {/* Ícone do tipo */}
      <div className={cn('flex-shrink-0', typeStyle.icon)}>
        <TypeIcon className="h-5 w-5" />
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {showModeIcon && ModeIcon && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ModeIcon className="h-3 w-3" />
              {modeLabels[currentInsight.mode]}
            </span>
          )}
          {currentInsight.title && (
            <span className="text-sm font-medium text-foreground">
              {currentInsight.title}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/90">
          {currentInsight.message}
        </p>
        {currentInsight.context && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentInsight.context}
          </p>
        )}
      </div>
      
      {/* Botão de ação */}
      {currentInsight.action_label && currentInsight.action_url && (
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 gap-1"
          onClick={() => handleAction(currentInsight)}
        >
          {currentInsight.action_label}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      
      {/* Botão de dispensar */}
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
