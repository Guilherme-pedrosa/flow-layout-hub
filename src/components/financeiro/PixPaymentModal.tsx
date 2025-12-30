import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Send, 
  User, 
  Key, 
  FileText, 
  CreditCard,
  CheckCircle,
  Clock,
  Loader2,
  X,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentLog {
  id: string;
  step: string;
  message: string;
  status: "pending" | "processing" | "success" | "error";
  timestamp: Date;
}

interface PixPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  paymentData: {
    amount: number;
    recipientName: string;
    recipientDocument?: string;
    pixKey: string;
    pixKeyType: string;
    description?: string;
    dueDate?: string;
  };
}

const PIX_KEY_TYPE_LABELS: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatorio: "Chave Aleatória",
  evp: "Chave Aleatória",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDocument = (doc: string) => {
  const cleaned = doc.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
};

export function PixPaymentModal({
  open,
  onOpenChange,
  onConfirm,
  paymentData,
}: PixPaymentModalProps) {
  const [step, setStep] = useState<"confirm" | "processing" | "result">("confirm");
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [result, setResult] = useState<{ success: boolean; message: string; transactionId?: string } | null>(null);
  
  const keyTypeLabel = PIX_KEY_TYPE_LABELS[paymentData.pixKeyType?.toLowerCase()] || paymentData.pixKeyType;

  useEffect(() => {
    if (open) {
      setStep("confirm");
      setLogs([]);
      setResult(null);
    }
  }, [open]);

  const addLog = (log: Omit<PaymentLog, "id" | "timestamp">) => {
    setLogs(prev => [...prev, {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    }]);
  };

  const updateLastLog = (status: PaymentLog["status"]) => {
    setLogs(prev => {
      const newLogs = [...prev];
      if (newLogs.length > 0) {
        newLogs[newLogs.length - 1].status = status;
      }
      return newLogs;
    });
  };

  const handleConfirm = async () => {
    setStep("processing");
    
    // Simulate processing steps with logs
    addLog({ step: "validation", message: "Validando dados do pagamento...", status: "processing" });
    await new Promise(r => setTimeout(r, 800));
    updateLastLog("success");
    
    addLog({ step: "auth", message: "Conectando ao Banco Inter...", status: "processing" });
    await new Promise(r => setTimeout(r, 600));
    updateLastLog("success");
    
    addLog({ step: "auth", message: "Autenticando...", status: "processing" });
    await new Promise(r => setTimeout(r, 500));
    updateLastLog("success");
    
    addLog({ step: "send", message: "Enviando pagamento PIX...", status: "processing" });
    
    try {
      await onConfirm();
      updateLastLog("success");
      addLog({ step: "complete", message: "Pagamento processado com sucesso!", status: "success" });
      
      setResult({
        success: true,
        message: "Pagamento enviado com sucesso!",
        transactionId: `PIX-${Date.now()}`,
      });
    } catch (error) {
      updateLastLog("error");
      addLog({ 
        step: "error", 
        message: error instanceof Error ? error.message : "Erro ao processar pagamento", 
        status: "error" 
      });
      
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Erro ao processar pagamento",
      });
    }
    
    setStep("result");
  };

  const getLogIcon = (status: PaymentLog["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={step === "processing" ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Send className="h-6 w-6 text-primary" />
                Confirmar Pagamento PIX
              </DialogTitle>
              <DialogDescription>
                Revise todos os dados antes de confirmar o pagamento.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-5">
              {/* Valor em destaque */}
              <div className="text-center py-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                <p className="text-sm text-muted-foreground mb-2">Valor do Pagamento</p>
                <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(paymentData.amount)}
                </p>
              </div>

              {/* Dados do destinatário */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Destinatário</p>
                    <p className="font-bold text-lg truncate">{paymentData.recipientName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">Chave PIX</p>
                        <Badge variant="secondary" className="text-xs px-1.5">
                          {keyTypeLabel}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm break-all">{paymentData.pixKey}</p>
                    </div>
                  </div>

                  {paymentData.recipientDocument && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                      <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                        <p className="font-medium text-sm">{formatDocument(paymentData.recipientDocument)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {(paymentData.description || paymentData.dueDate) && (
                  <div className="grid grid-cols-2 gap-3">
                    {paymentData.description && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Descrição</p>
                          <p className="font-medium text-sm truncate">{paymentData.description}</p>
                        </div>
                      </div>
                    )}
                    {paymentData.dueDate && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Vencimento</p>
                          <p className="font-medium text-sm">{paymentData.dueDate}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
                    Atenção
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                    Pagamentos PIX são <strong>instantâneos</strong> e <strong>irreversíveis</strong>. 
                    Verifique todos os dados antes de confirmar.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConfirm} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <Send className="mr-2 h-4 w-4" />
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "processing" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                Processando Pagamento
              </DialogTitle>
              <DialogDescription>
                Não feche esta janela durante o processamento.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <ScrollArea className="h-[200px] rounded-lg border bg-muted/20 p-4">
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-center gap-3 text-sm",
                        "animate-in fade-in slide-in-from-left-2 duration-300"
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {getLogIcon(log.status)}
                      <span className={cn(
                        log.status === "success" && "text-emerald-600 dark:text-emerald-400",
                        log.status === "error" && "text-red-600 dark:text-red-400",
                        log.status === "processing" && "text-blue-600 dark:text-blue-400"
                      )}>
                        {log.message}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {log.timestamp.toLocaleTimeString("pt-BR", { 
                          hour: "2-digit", 
                          minute: "2-digit", 
                          second: "2-digit" 
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                ) : (
                  <X className="h-6 w-6 text-red-500" />
                )}
                {result.success ? "Pagamento Enviado!" : "Falha no Pagamento"}
              </DialogTitle>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className={cn(
                "text-center p-6 rounded-xl border",
                result.success 
                  ? "bg-emerald-500/10 border-emerald-500/20" 
                  : "bg-red-500/10 border-red-500/20"
              )}>
                <div className={cn(
                  "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                  result.success ? "bg-emerald-500/20" : "bg-red-500/20"
                )}>
                  {result.success ? (
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <X className="h-8 w-8 text-red-500" />
                  )}
                </div>
                <p className={cn(
                  "font-semibold text-lg",
                  result.success ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                )}>
                  {result.message}
                </p>
                {result.transactionId && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ID: <code className="bg-muted px-2 py-0.5 rounded">{result.transactionId}</code>
                  </p>
                )}
              </div>

              {result.success && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-700 dark:text-amber-400">
                      Status: AGUARDANDO APROVAÇÃO
                    </p>
                    <p className="text-amber-600 dark:text-amber-500 mt-1">
                      Este pagamento precisa ser aprovado no aplicativo do Banco Inter.
                      Após aprovação, o status será atualizado automaticamente.
                    </p>
                  </div>
                </div>
              )}

              {/* Logs do processamento */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Ver logs do processamento
                </summary>
                <ScrollArea className="h-[150px] rounded-lg border bg-muted/20 p-3 mt-2">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-center gap-2 text-xs">
                        {getLogIcon(log.status)}
                        <span>{log.message}</span>
                        <span className="ml-auto text-muted-foreground tabular-nums">
                          {log.timestamp.toLocaleTimeString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </details>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
