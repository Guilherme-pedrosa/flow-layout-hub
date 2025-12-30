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
import { AlertTriangle, Send, User, Key, FileText, CreditCard } from "lucide-react";

interface PixConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  paymentData: {
    amount: number;
    recipientName: string;
    recipientDocument?: string;
    pixKey: string;
    pixKeyType: string;
    description?: string;
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

export function PixConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
  paymentData,
}: PixConfirmationModalProps) {
  const keyTypeLabel = PIX_KEY_TYPE_LABELS[paymentData.pixKeyType.toLowerCase()] || paymentData.pixKeyType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Confirmar Pagamento PIX
          </DialogTitle>
          <DialogDescription>
            Revise os dados antes de confirmar o pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Valor em destaque */}
          <div className="text-center py-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-muted-foreground mb-1">Valor do Pagamento</p>
            <p className="text-3xl font-bold text-green-500">
              {formatCurrency(paymentData.amount)}
            </p>
          </div>

          {/* Dados do destinatário */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Destinatário</p>
                <p className="font-medium truncate">{paymentData.recipientName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Key className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Chave PIX</p>
                  <Badge variant="outline" className="text-xs">
                    {keyTypeLabel}
                  </Badge>
                </div>
                <p className="font-medium break-all">{paymentData.pixKey}</p>
              </div>
            </div>

            {paymentData.recipientDocument && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium">{formatDocument(paymentData.recipientDocument)}</p>
                </div>
              </div>
            )}

            {paymentData.description && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="font-medium">{paymentData.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Pagamentos PIX são <strong>instantâneos</strong> e <strong>irreversíveis</strong>. 
              Verifique todos os dados antes de confirmar.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-green-600 hover:bg-green-700">
            <Send className="mr-2 h-4 w-4" />
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
