import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  TrendingDown,
  Eye,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { WaiObserverAlert } from "@/hooks/useWaiObserver";

interface WaiObserverAlertCardProps {
  alert: WaiObserverAlert;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onRecordAction: (id: string, action: string) => void;
}

export function WaiObserverAlertCard({
  alert,
  onMarkRead,
  onDismiss,
  onRecordAction,
}: WaiObserverAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionText, setActionText] = useState("");
  const [showActionInput, setShowActionInput] = useState(false);

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

  const handleRecordAction = () => {
    if (actionText.trim()) {
      onRecordAction(alert.id, actionText);
      setShowActionInput(false);
      setActionText("");
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-4",
        alert.severity === "critical" && "border-l-red-500",
        alert.severity === "warning" && "border-l-yellow-500",
        alert.severity === "info" && "border-l-blue-500",
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
                <Badge variant="secondary" className="text-xs">
                  {alert.event_type}
                </Badge>
                {alert.is_actioned && (
                  <Badge variant="default" className="bg-green-500 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ação tomada
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
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
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDismiss(alert.id)}
              title="Dispensar"
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

        {/* Recomendação */}
        {alert.recommendation && (
          <div className="p-2 bg-primary/5 rounded-md border border-primary/20 mb-3">
            <p className="text-xs font-medium text-primary">💡 Recomendação</p>
            <p className="text-sm">{alert.recommendation}</p>
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
                    disabled={!actionText.trim()}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Registrar
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
