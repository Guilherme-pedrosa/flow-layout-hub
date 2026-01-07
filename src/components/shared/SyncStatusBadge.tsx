import { useState } from 'react';
import { RefreshCw, Check, AlertCircle, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
  status: string | null;
  lastError?: string | null;
  entityType: 'customer' | 'equipment' | 'service_order';
  entityId: string;
  companyId: string;
  onSyncComplete?: () => void;
}

const STATUS_CONFIG = {
  synced: { icon: Check, label: 'Sincronizado', variant: 'default' as const, className: 'bg-green-500/10 text-green-700 border-green-200' },
  pending: { icon: Clock, label: 'Sincronizando...', variant: 'secondary' as const, className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  error: { icon: AlertCircle, label: 'Erro', variant: 'destructive' as const, className: 'bg-red-500/10 text-red-700 border-red-200' },
  not_synced: { icon: Clock, label: 'Não sincronizado', variant: 'outline' as const, className: 'bg-muted text-muted-foreground' },
};

export function SyncStatusBadge({ 
  status, 
  lastError, 
  entityType, 
  entityId, 
  companyId,
  onSyncComplete 
}: SyncStatusBadgeProps) {
  const [isResyncing, setIsResyncing] = useState(false);

  const normalizedStatus = (status || 'not_synced').toLowerCase().replace(' ', '_');
  const config = STATUS_CONFIG[normalizedStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_synced;
  const Icon = config.icon;

  const handleResync = async () => {
    setIsResyncing(true);
    try {
      // Criar job de sync manualmente
      const { error } = await supabase
        .from('sync_jobs')
        .insert({
          company_id: companyId,
          entity_type: entityType,
          entity_id: entityId,
          action: 'upsert',
          status: 'pending',
          attempts: 0,
          next_retry_at: new Date().toISOString()
        });

      if (error) throw error;

      // Chamar worker imediatamente
      const { error: invokeError } = await supabase.functions.invoke('field-sync-worker', {
        body: {}
      });

      if (invokeError) {
        console.warn('Erro chamando worker:', invokeError);
      }

      toast.success('Sincronização iniciada');
      onSyncComplete?.();
    } catch (err) {
      console.error('Erro ao resincronizar:', err);
      toast.error('Erro ao iniciar sincronização');
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={config.variant} 
              className={cn('gap-1.5 cursor-help', config.className)}
            >
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          {lastError && normalizedStatus === 'error' && (
            <TooltipContent className="max-w-xs">
              <p className="text-xs font-mono">{lastError}</p>
            </TooltipContent>
          )}
        </Tooltip>

        {(normalizedStatus === 'error' || normalizedStatus === 'not_synced') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleResync}
                disabled={isResyncing}
              >
                {isResyncing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reenviar ao Field Control</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
