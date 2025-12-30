import { Bell, Shield, TrendingUp, Bot, Cog, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAiInsights, AiInsight } from '@/hooks/useAiInsights';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const modeIcons = {
  auditora: Shield,
  cfo_bot: TrendingUp,
  especialista: Bot,
  executora: Cog,
};

const modeColors = {
  auditora: 'text-amber-500',
  cfo_bot: 'text-emerald-500',
  especialista: 'text-primary',
  executora: 'text-blue-500',
};

const typeColors = {
  info: 'bg-primary/10 text-primary',
  warning: 'bg-amber-500/10 text-amber-500',
  success: 'bg-emerald-500/10 text-emerald-500',
  critical: 'bg-destructive/10 text-destructive',
};

export function AINotificationsDropdown() {
  const navigate = useNavigate();
  const { insights, unreadCount, markAsRead, dismiss, markAllAsRead } = useAiInsights();

  const handleInsightClick = (insight: AiInsight) => {
    markAsRead(insight.id);
    if (insight.action_url) {
      navigate(insight.action_url);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Insights da IA</span>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-primary hover:bg-transparent"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum insight no momento
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A IA está monitorando o sistema
              </p>
            </div>
          ) : (
            insights.slice(0, 10).map((insight) => {
              const ModeIcon = modeIcons[insight.mode];
              
              return (
                <DropdownMenuItem
                  key={insight.id}
                  className={cn(
                    'flex flex-col items-start gap-1 py-3 px-4 cursor-pointer',
                    !insight.is_read && 'bg-muted/50'
                  )}
                  onClick={() => handleInsightClick(insight)}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                      <ModeIcon className={cn('h-4 w-4', modeColors[insight.mode])} />
                      <span className="font-medium text-sm">{insight.title}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn('text-[10px] px-1.5', typeColors[insight.type])}
                    >
                      {insight.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {insight.message}
                  </p>
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(insight.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
        
        {insights.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-primary cursor-pointer"
              onClick={() => navigate('/insights')}
            >
              Ver todos os insights
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
