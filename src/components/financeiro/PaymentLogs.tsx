import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export interface PaymentLogEntry {
  id: string;
  timestamp: Date;
  message: string;
  status: "loading" | "success" | "error" | "warning" | "info";
  details?: string;
}

interface PaymentLogsProps {
  logs: PaymentLogEntry[];
  className?: string;
}

export function PaymentLogs({ logs, className }: PaymentLogsProps) {
  const getStatusIcon = (status: PaymentLogEntry["status"]) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case "info":
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: PaymentLogEntry["status"]) => {
    switch (status) {
      case "loading":
        return "text-blue-400";
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "info":
      default:
        return "text-muted-foreground";
    }
  };

  if (logs.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-zinc-950 p-4 font-mono text-sm overflow-hidden",
        className
      )}
    >
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3">
            <span className="text-zinc-500 text-xs whitespace-nowrap mt-0.5">
              {format(log.timestamp, "HH:mm:ss")}
            </span>
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(log.status)}
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn("break-words", getStatusColor(log.status))}>
                {log.message}
              </span>
              {log.details && (
                <div className="mt-1 text-xs text-zinc-500 bg-zinc-900 p-2 rounded border border-zinc-800 break-words">
                  {log.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook para gerenciar logs
import { useState, useCallback } from "react";

export function usePaymentLogs() {
  const [logs, setLogs] = useState<PaymentLogEntry[]>([]);

  const addLog = useCallback((
    message: string,
    status: PaymentLogEntry["status"] = "info",
    details?: string
  ) => {
    const newLog: PaymentLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message,
      status,
      details,
    };
    setLogs((prev) => [...prev, newLog]);
    return newLog.id;
  }, []);

  const updateLog = useCallback((id: string, updates: Partial<Omit<PaymentLogEntry, "id" | "timestamp">>) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...updates } : log))
    );
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, addLog, updateLog, clearLogs };
}
