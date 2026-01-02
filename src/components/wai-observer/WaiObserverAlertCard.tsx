import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  TrendingDown,
  Eye,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ThumbsDown,
  Clock,
  ExternalLink,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAiFeedback } from "@/hooks/useAiFeedback";
import type { WaiObserverAlert } from "@/hooks/useWaiObserver";

interface WaiObserverAlertCardProps {
  alert: WaiObserverAlert;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onRecordAction: (id: string, action: string) => void;
  onAlertUpdated?: () => void;
}

export function WaiObserverAlertCard({
  alert,
  onMarkRead,
  onDismiss,
  onRecordAction,
  onAlertUpdated,
}: WaiObserverAlertCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionText, setActionText] = useState("");
  const [showActionInput, setShowActionInput] = useState(false);
  
  const { dismissAsFalsePositive, markAsActioned, escalateAlert, isLoading } = useAiFeedback();

  // SLA config
  const roleLabels: Record<string, string> = {
    diretoria: "Diretoria",
    financeiro: "Financeiro",
    operacoes: "Operações",
  };

  const priorityLabels: Record<string, { label: string; color: string }> = {
    strategic_risk: { label: "Estratégico", color: "bg-red-600 text-white" },
    economic_risk: { label: "Econômico", color: "bg-orange-500 text-white" },
    tactical_attention: { label: "Tático", color: "bg-yellow-500 text-white" },
  };

  const getSlaStatus = () => {
    if (!alert.sla_deadline) return null;
    const deadline = new Date(alert.sla_deadline);
    const now = new Date();
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (alert.is_sla_breached) return { status: "breached", label: "SLA Estourado", color: "text-red-700 bg-red-100" };
    if (hoursRemaining < 0) return { status: "overdue", label: "Atrasado", color: "text-red-600 bg-red-50" };
    if (hoursRemaining < 4) return { status: "urgent", label: `${Math.ceil(hoursRemaining)}h restantes`, color: "text-orange-600 bg-orange-50" };
    if (hoursRemaining < 24) return { status: "soon", label: `${Math.ceil(hoursRemaining)}h restantes`, color: "text-yellow-600 bg-yellow-50" };
    return { status: "ok", label: `${Math.ceil(hoursRemaining / 24)}d restantes`, color: "text-green-600 bg-green-50" };
  };

  const slaStatus = getSlaStatus();

  const severityConfig = {
    info: {
      color: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      icon: Eye,
      label: "Informativo",
    },
    warning: {
      color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      icon: AlertTriangle,
      label: "Atenção",
    },
    critical: {
      color: "bg-red-500/10 text-red-700 border-red-500/20",
      icon: TrendingDown,
      label: "Crítico",
    },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  const handleRecordAction = async () => {
    if (actionText.trim()) {
      const success = await markAsActioned(alert.id, actionText);
      if (success) {
        onRecordAction(alert.id, actionText);
        setShowActionInput(false);
        setActionText("");
        onAlertUpdated?.();
      }
    }
  };

  const handleDismissAsFalsePositive = async () => {
    const success = await dismissAsFalsePositive(alert.id);
    if (success) {
      onDismiss(alert.id);
      onAlertUpdated?.();
    }
  };

  const handleEscalate = async () => {
    const success = await escalateAlert(alert.id, "Escalado pelo usuário");
    if (success) {
      onAlertUpdated?.();
    }
  };

  // Handle deep-link navigation
  const handleActionClick = () => {
    if (alert.action_url) {
      navigate(alert.action_url);
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-4",
        alert.severity === "critical" && "border-l-red-500",
        alert.severity === "warning" && "border-l-yellow-500",
        alert.severity === "info" && "border-l-blue-500",
        alert.is_sla_breached && "ring-2 ring-red-500 ring-offset-2",
        !alert.is_read && "bg-muted/50"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className={cn("p-2 rounded-full", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
                {/* Priority Level Badge */}
                {alert.priority_level && priorityLabels[alert.priority_level] && (
                  <Badge className={cn("text-xs", priorityLabels[alert.priority_level].color)}>
                    {priorityLabels[alert.priority_level].label}
                  </Badge>
                )}
                {/* Responsible Role */}
                {alert.responsible_role && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <User className="h-3 w-3" />
                    {roleLabels[alert.responsible_role] || alert.responsible_role}
                  </Badge>
                )}
                {/* SLA Status */}
                {slaStatus && (
                  <Badge variant="outline" className={cn("text-xs gap-1", slaStatus.color)}>
                    <Clock className="h-3 w-3" />
                    {slaStatus.label}
                  </Badge>
                )}
                {alert.is_actioned && (
                  <Badge variant="default" className="bg-green-500 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ação tomada
                  </Badge>
                )}
                {alert.escalation_reason && (
                  <Badge variant="destructive" className="text-xs">
                    Escalado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
                {alert.escalated_at && (
                  <span className="ml-2 text-red-600">
                    • Escalado {formatDistanceToNow(new Date(alert.escalated_at), { locale: ptBR, addSuffix: true })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!alert.is_read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onMarkRead(alert.id)}
                title="Marcar como lido"
                disabled={isLoading}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {alert.severity !== "critical" && !alert.is_actioned && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={handleEscalate}
                title="Escalar para decisão crítica"
                disabled={isLoading}
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleDismissAsFalsePositive}
              title="Falso positivo"
              disabled={isLoading}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDismiss(alert.id)}
              title="Dispensar"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm font-medium mb-2">{alert.economic_reason}</p>

        {/* Indicadores de margem */}
        {(alert.margin_before !== null || alert.margin_after !== null) && (
          <div className="flex items-center gap-4 mb-3 p-2 bg-muted rounded-md">
            {alert.margin_before !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Margem Antes</p>
                <p className="font-mono font-bold text-green-600">
                  {alert.margin_before.toFixed(1)}%
                </p>
              </div>
            )}
            {alert.margin_after !== null && (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Margem Depois</p>
                  <p className="font-mono font-bold text-red-600">
                    {alert.margin_after.toFixed(1)}%
                  </p>
                </div>
              </>
            )}
            {alert.margin_change_percent !== null && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Variação</p>
                <p
                  className={cn(
                    "font-mono font-bold",
                    alert.margin_change_percent < 0
                      ? "text-red-600"
                      : "text-green-600"
                  )}
                >
                  {alert.margin_change_percent > 0 ? "+" : ""}
                  {alert.margin_change_percent.toFixed(1)}%
                </p>
              </div>
            )}
            {alert.potential_loss !== null && alert.potential_loss > 0 && (
              <div className="text-center ml-auto">
                <p className="text-xs text-muted-foreground">Perda Potencial</p>
                <p className="font-mono font-bold text-red-600">
                  R$ {alert.potential_loss.toLocaleString("pt-BR")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recomendação + Deep Link */}
        {alert.recommendation && (
          <div className="p-2 bg-primary/5 rounded-md border border-primary/20 mb-3">
            <p className="text-xs font-medium text-primary">💡 Recomendação</p>
            <p className="text-sm">{alert.recommendation}</p>
            {alert.action_url && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto mt-2 text-primary"
                onClick={handleActionClick}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Corrigir agora
              </Button>
            )}
          </div>
        )}

        {/* Entidades impactadas (colapsável) */}
        {alert.impacted_entities && alert.impacted_entities.length > 0 && (
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between p-2 h-auto"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="text-xs text-muted-foreground">
                {alert.impacted_entities.length} entidade(s) impactada(s)
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            {isExpanded && (
              <div className="mt-2 space-y-1">
                {alert.impacted_entities.map((entity, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 bg-muted rounded flex items-center gap-2"
                  >
                    <Badge variant="outline" className="text-xs">
                      {entity.type}
                    </Badge>
                    <span>{entity.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ação tomada ou input para registrar */}
        {alert.is_actioned ? (
          <div className="p-2 bg-green-50 rounded-md border border-green-200">
            <p className="text-xs font-medium text-green-700">
              ✓ Ação registrada
            </p>
            <p className="text-sm text-green-800">{alert.action_taken}</p>
          </div>
        ) : alert.requires_human_decision ? (
          <div className="mt-2">
            {showActionInput ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Descreva a ação tomada..."
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleRecordAction}
                    disabled={!actionText.trim() || isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {isLoading ? "Salvando..." : "Registrar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowActionInput(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowActionInput(true)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Registrar ação tomada
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
