import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Send, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

interface PixPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable?: {
    id: string;
    amount: number;
    description: string | null;
    supplier_id: string;
  } | null;
  onSuccess?: () => void;
}

type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatorio";

export function PixPaymentForm({ open, onOpenChange, payable, onSuccess }: PixPaymentFormProps) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientDocument: "",
    pixKey: "",
    pixKeyType: "cpf" as PixKeyType,
    amount: "",
    description: "",
  });

  // Reset form when payable changes
  useEffect(() => {
    if (open) {
      setFormData({
        recipientName: "",
        recipientDocument: "",
        pixKey: "",
        pixKeyType: "cpf",
        amount: payable?.amount ? formatCurrencyInput(payable.amount * 100) : "",
        description: payable?.description || "",
      });
      setResult(null);
    }
  }, [open, payable]);

  const formatCurrencyInput = (cents: number) => {
    const amount = cents / 100;
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const amount = parseInt(numbers || "0") / 100;
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  };

  const parseCurrency = (value: string): number => {
    const numbers = value.replace(/\D/g, "");
    return parseInt(numbers || "0") / 100;
  };

  const handleSubmit = async () => {
    if (!formData.recipientName || !formData.pixKey || !formData.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const amount = parseCurrency(formData.amount);
    if (amount <= 0) {
      toast.error("O valor deve ser maior que zero");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (!companyId) {
        throw new Error("Empresa não configurada");
      }

      // Criar registro do pagamento como PENDENTE (aguardando aprovação)
      const { error } = await supabase
        .from("inter_pix_payments")
        .insert({
          company_id: companyId,
          payable_id: payable?.id || null,
          recipient_name: formData.recipientName,
          recipient_document: formData.recipientDocument,
          pix_key: formData.pixKey,
          pix_key_type: formData.pixKeyType,
          amount: amount,
          description: formData.description || `PIX para ${formData.recipientName}`,
          status: "pending", // Aguardando aprovação
        });

      if (error) throw error;

      setResult({
        success: true,
        message: "PIX lançado com sucesso! Aguardando aprovação.",
      });
      toast.success("PIX lançado! Aguarde aprovação.");
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao lançar PIX";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setFormData({
      recipientName: "",
      recipientDocument: "",
      pixKey: "",
      pixKeyType: "cpf",
      amount: "",
      description: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Lançar Pagamento PIX
          </DialogTitle>
          <DialogDescription>
            Registre um pagamento PIX para aprovação. Após aprovado, será enviado automaticamente.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="py-8 text-center">
            {result.success ? (
              <>
                <Clock className="mx-auto h-16 w-16 text-yellow-500" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">{result.message}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  O pagamento aparecerá na aba "Aprovar PIX" para confirmação.
                </p>
                <Button className="mt-6" onClick={handleClose}>
                  Fechar
                </Button>
              </>
            ) : (
              <>
                <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">Erro no lançamento</h3>
                <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
                <Button className="mt-6" variant="outline" onClick={() => setResult(null)}>
                  Tentar novamente
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">Nome do Favorecido *</Label>
                  <Input
                    id="recipientName"
                    placeholder="Nome completo"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipientDocument">CPF/CNPJ</Label>
                  <Input
                    id="recipientDocument"
                    placeholder="000.000.000-00"
                    value={formData.recipientDocument}
                    onChange={(e) => setFormData({ ...formData, recipientDocument: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="pixKey">Chave PIX *</Label>
                  <Input
                    id="pixKey"
                    placeholder="Informe a chave PIX"
                    value={formData.pixKey}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Chave</Label>
                  <Select
                    value={formData.pixKeyType}
                    onValueChange={(value: PixKeyType) => setFormData({ ...formData, pixKeyType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatorio">Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="amount"
                    className="pl-10"
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: formatCurrency(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição do pagamento (opcional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Lançando...
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Lançar para Aprovação
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
