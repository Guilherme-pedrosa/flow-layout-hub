import { useState, useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, X, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WaiAlertBannerProps {
  entityType?: string;
  entityId?: string;
  className?: string;
}

interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  economic_reason: string;
  event_type: string;
}

const severityConfig = {
  critical: { 
    bg: "bg-destructive/10 border-destructive/30", 
    text: "text-destructive",
    icon: AlertTriangle 
  },
  warning: { 
    bg: "bg-yellow-500/10 border-yellow-500/30", 
    text: "text-yellow-600 dark:text-yellow-500",
    icon: AlertCircle 
  },
  info: { 
    bg: "bg-blue-500/10 border-blue-500/30", 
    text: "text-blue-600 dark:text-blue-500",
    icon: Info 
  },
};

export function WaiAlertBanner({ entityType, entityId, className }: WaiAlertBannerProps) {
  const { currentCompany } = useCompany();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentCompany?.id) return;

    const fetchAlerts = async () => {
      let query = supabase
        .from("ai_observer_alerts")
        .select("id, severity, economic_reason, event_type")
        .eq("company_id", currentCompany.id)
        .eq("is_read", false)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(5);

      // If we have entity context, prioritize those alerts
      if (entityType && entityId) {
        query = query.or(`event_source_id.eq.${entityId},severity.eq.critical`);
      } else {
        // On general pages, show only critical alerts
        query = query.eq("severity", "critical");
      }

      const { data } = await query;
      setAlerts((data || []) as Alert[]);
    };

    fetchAlerts();

    // Subscribe to new alerts
    const channel = supabase
      .channel("wai-alert-banner")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ai_observer_alerts",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          if (newAlert.severity === "critical" || 
              (entityId && payload.new.event_source_id === entityId)) {
            setAlerts(prev => [newAlert, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, entityType, entityId]);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const handleDismiss = async (alertId: string) => {
    setDismissed(prev => new Set([...prev, alertId]));
    
    // Mark as read in background
    await supabase
      .from("ai_observer_alerts")
      .update({ is_read: true })
      .eq("id", alertId);
  };

  // Show the most severe alert
  const primaryAlert = visibleAlerts.reduce((prev, curr) => {
    const severityOrder = { critical: 3, warning: 2, info: 1 };
    return severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev;
  });

  const config = severityConfig[primaryAlert.severity];
  const Icon = config.icon;

  return (
    <div className={cn(
      "border rounded-lg p-3 flex items-start gap-3",
      config.bg,
      className
    )}>
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.text)} />
      
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", config.text)}>
          {primaryAlert.event_type}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {primaryAlert.economic_reason}
        </p>
        
        {visibleAlerts.length > 1 && (
          <Link 
            to="/configuracoes/alertas"
            className="inline-flex items-center text-xs text-primary hover:underline mt-1"
          >
            +{visibleAlerts.length - 1} outros alertas
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className={config.text}
        >
          <Link to="/configuracoes/alertas">
            Ver todos
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => handleDismiss(primaryAlert.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
