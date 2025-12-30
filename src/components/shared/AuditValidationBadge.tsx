import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, Sparkles, ChevronDown, ChevronUp, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { AuditResult, AuditValidation } from '@/hooks/useAiAuditora';

interface AuditValidationBadgeProps {
  result: AuditResult | null;
  loading?: boolean;
  onAudit?: () => void;
  compact?: boolean;
  className?: string;
}

const riskColors = {
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

const riskLabels = {
  low: 'Baixo Risco',
  medium: 'Risco Médio',
  high: 'Alto Risco',
  critical: 'Risco Crítico',
};

const typeIcons = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const typeColors = {
  error: 'text-destructive',
  warning: 'text-amber-500',
  info: 'text-primary',
  success: 'text-emerald-500',
};

function ValidationItem({ validation }: { validation: AuditValidation }) {
  const Icon = typeIcons[validation.type];
  
  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0">
      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', typeColors[validation.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{validation.message}</p>
        {validation.suggestion && (
          <p className="text-xs text-muted-foreground mt-0.5">
            💡 {validation.suggestion}
          </p>
        )}
        {validation.autoFix && (
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 text-xs text-primary"
            onClick={validation.autoFix}
          >
            Corrigir automaticamente
          </Button>
        )}
      </div>
    </div>
  );
}

export function AuditValidationBadge({ 
  result, 
  loading, 
  onAudit, 
  compact = false,
  className 
}: AuditValidationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Não renderizar nada se não há resultado e não está carregando
  if (!result && !loading && !onAudit) {
    return null;
  }

  // Botão para iniciar auditoria
  if (!result && onAudit) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onAudit}
        disabled={loading}
        className={cn('gap-2', className)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        <span>Validar com IA</span>
      </Button>
    );
  }

  if (!result) return null;

  const hasValidations = result.validations.length > 0;
  const errorCount = result.validations.filter(v => v.type === 'error').length;
  const warningCount = result.validations.filter(v => v.type === 'warning').length;

  // Modo compacto - apenas badge
  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className={cn(riskColors[result.riskLevel], 'gap-1', className)}
      >
        <Shield className="h-3 w-3" />
        {result.score}%
      </Badge>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        riskColors[result.riskLevel]
      )}>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{riskLabels[result.riskLevel]}</span>
              <Badge variant="secondary" className="text-xs">
                Score: {result.score}%
              </Badge>
            </div>
            {hasValidations && (
              <p className="text-xs mt-0.5">
                {errorCount > 0 && `${errorCount} erro(s)`}
                {errorCount > 0 && warningCount > 0 && ' • '}
                {warningCount > 0 && `${warningCount} alerta(s)`}
              </p>
            )}
          </div>
        </div>

        {hasValidations && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              {isOpen ? (
                <>
                  Ocultar <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Ver detalhes <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      {hasValidations && (
        <CollapsibleContent>
          <div className="mt-2 p-3 rounded-lg border bg-muted/30 space-y-0">
            {result.validations.map((validation, index) => (
              <ValidationItem key={index} validation={validation} />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
