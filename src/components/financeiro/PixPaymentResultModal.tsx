import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle, Copy } from "lucide-react";
import { PaymentLogs, PaymentLogEntry } from "./PaymentLogs";
import { toast } from "sonner";

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status?: string;
  paymentDate?: string;
  message?: string;
  error?: string;
}

interface PixPaymentResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: PaymentResult | null;
  logs: PaymentLogEntry[];
  processing?: boolean;
}

const STATUS_MESSAGES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  APROVACAO: {
    label: "Pagamento aprovado! Aguardando processamento.",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: <CheckCircle className="h-5 w-5" />,
  },
  APROVADO: {
    label: "Pagamento aprovado! Aguardando processamento.",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: <CheckCircle className="h-5 w-5" />,
  },
  EMPROCESSAMENTO: {
    label: "Pagamento em processamento.",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: <Clock className="h-5 w-5" />,
  },
  AGENDADO: {
    label: "Pagamento agendado com sucesso.",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: <Clock className="h-5 w-5" />,
  },
  PENDENTE: {
    label: "Pagamento pendente de aprovação no app do banco.",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
};

export function PixPaymentResultModal({
  open,
  onOpenChange,
  result,
  logs,
  processing,
}: PixPaymentResultModalProps) {
  const statusInfo = result?.status ? STATUS_MESSAGES[result.status.toUpperCase()] : null;

  const copyTransactionId = () => {
    if (result?.transactionId) {
      navigator.clipboard.writeText(result.transactionId);
      toast.success("ID copiado!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {processing ? (
              <>
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                Processando Pagamento...
              </>
            ) : result?.success ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Pagamento Processado
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Erro no Pagamento
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Logs em tempo real */}
          <PaymentLogs logs={logs} />

          {/* Resultado */}
          {!processing && result && (
            <div className="space-y-3">
              {result.success && statusInfo && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${statusInfo.color}`}>
                  {statusInfo.icon}
                  <span className="font-medium">{statusInfo.label}</span>
                </div>
              )}

              {result.success && result.transactionId && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ID da Transação</span>
                    <Button variant="ghost" size="sm" onClick={copyTransactionId}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-mono text-sm break-all">{result.transactionId}</p>
                </div>
              )}

              {result.success && result.paymentDate && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Data do Pagamento</span>
                  <span className="font-medium">{result.paymentDate}</span>
                </div>
              )}

              {!result.success && result.error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} disabled={processing}>
            {processing ? "Aguarde..." : "Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
