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
import { Loader2, Save, Receipt, QrCode, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface PayableFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable?: {
    id: string;
    amount: number;
    description: string | null;
    supplier_id: string;
    due_date: string;
    document_number: string | null;
    payment_method_type?: string | null;
    boleto_barcode?: string | null;
    pix_key?: string | null;
    pix_key_type?: string | null;
    scheduled_payment_date?: string | null;
    recipient_name?: string | null;
    recipient_document?: string | null;
  } | null;
  onSuccess?: () => void;
}

type PaymentMethodType = "boleto" | "pix" | "transferencia" | "outro";
type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatorio";

export function PayableForm({ open, onOpenChange, payable, onSuccess }: PayableFormProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; nome_fantasia: string | null; razao_social: string | null }[]>([]);
  
  const [formData, setFormData] = useState({
    supplierId: "",
    amount: "",
    dueDate: "",
    scheduledPaymentDate: "",
    description: "",
    documentNumber: "",
    paymentMethodType: "" as PaymentMethodType | "",
    boletoBarcode: "",
    pixKey: "",
    pixKeyType: "cpf" as PixKeyType,
    recipientName: "",
    recipientDocument: "",
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      if (payable) {
        setFormData({
          supplierId: payable.supplier_id,
          amount: formatCurrencyInput(payable.amount * 100),
          dueDate: payable.due_date,
          scheduledPaymentDate: payable.scheduled_payment_date || "",
          description: payable.description || "",
          documentNumber: payable.document_number || "",
          paymentMethodType: (payable.payment_method_type as PaymentMethodType) || "",
          boletoBarcode: payable.boleto_barcode || "",
          pixKey: payable.pix_key || "",
          pixKeyType: (payable.pix_key_type as PixKeyType) || "cpf",
          recipientName: payable.recipient_name || "",
          recipientDocument: payable.recipient_document || "",
        });
      } else {
        setFormData({
          supplierId: "",
          amount: "",
          dueDate: format(new Date(), "yyyy-MM-dd"),
          scheduledPaymentDate: "",
          description: "",
          documentNumber: "",
          paymentMethodType: "",
          boletoBarcode: "",
          pixKey: "",
          pixKeyType: "cpf",
          recipientName: "",
          recipientDocument: "",
        });
      }
    }
  }, [open, payable]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("pessoas")
      .select("id, nome_fantasia, razao_social")
      .eq("is_fornecedor", true)
      .eq("is_active", true)
      .order("razao_social");
    setSuppliers(data || []);
  };

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

  const isPaymentDataComplete = (): boolean => {
    if (!formData.paymentMethodType) return false;
    
    if (formData.paymentMethodType === "boleto") {
      return !!formData.boletoBarcode && formData.boletoBarcode.length >= 44;
    }
    if (formData.paymentMethodType === "pix") {
      return !!formData.pixKey && !!formData.recipientName;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.supplierId || !formData.amount || !formData.dueDate) {
      toast.error("Preencha fornecedor, valor e vencimento");
      return;
    }

    const amount = parseCurrency(formData.amount);
    if (amount <= 0) {
      toast.error("O valor deve ser maior que zero");
      return;
    }

    setLoading(true);

    try {
      const { data: companies } = await supabase.from("companies").select("id").limit(1);
      const companyId = companies?.[0]?.id;
      
      if (!companyId) {
        throw new Error("Empresa não configurada");
      }

      // Determinar status baseado nos dados de pagamento
      const paymentStatus = isPaymentDataComplete() ? "ready_to_pay" as const : "open" as const;

      const payableData = {
        company_id: companyId,
        supplier_id: formData.supplierId,
        amount: amount,
        due_date: formData.dueDate,
        scheduled_payment_date: formData.scheduledPaymentDate || null,
        description: formData.description || null,
        document_number: formData.documentNumber || null,
        payment_method_type: formData.paymentMethodType || null,
        boleto_barcode: formData.paymentMethodType === "boleto" ? formData.boletoBarcode : null,
        pix_key: formData.paymentMethodType === "pix" ? formData.pixKey : null,
        pix_key_type: formData.paymentMethodType === "pix" ? formData.pixKeyType : null,
        recipient_name: formData.paymentMethodType === "pix" ? formData.recipientName : null,
        recipient_document: formData.paymentMethodType === "pix" ? formData.recipientDocument : null,
        payment_status: paymentStatus as "open" | "ready_to_pay",
      };

      if (payable?.id) {
        const { error } = await supabase
          .from("payables")
          .update(payableData)
          .eq("id", payable.id);
        if (error) throw error;
        toast.success("Conta a pagar atualizada");
      } else {
        const { error } = await supabase
          .from("payables")
          .insert(payableData);
        if (error) throw error;
        toast.success("Conta a pagar criada");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao salvar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {payable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
          </DialogTitle>
          <DialogDescription>
            Informe os dados da conta e o método de pagamento para agendar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Fornecedor */}
          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <Select
              value={formData.supplierId}
              onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome_fantasia || s.razao_social || "Sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor e Vencimento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  className="pl-10"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: formatCurrency(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          {/* Documento e Data Programada */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº Documento</Label>
              <Input
                placeholder="NF-e, boleto, etc."
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Programada Pagto</Label>
              <Input
                type="date"
                value={formData.scheduledPaymentDate}
                onChange={(e) => setFormData({ ...formData, scheduledPaymentDate: e.target.value })}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descrição do pagamento"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Método de Pagamento
            </Label>
            <Select
              value={formData.paymentMethodType}
              onValueChange={(value: PaymentMethodType) => setFormData({ ...formData, paymentMethodType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione como será pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boleto">Boleto Bancário</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campos de Boleto */}
          {formData.paymentMethodType === "boleto" && (
            <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
              <Label className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Código de Barras / Linha Digitável *
              </Label>
              <Input
                placeholder="Cole a linha digitável do boleto (47 ou 48 dígitos)"
                value={formData.boletoBarcode}
                onChange={(e) => setFormData({ ...formData, boletoBarcode: e.target.value.replace(/\D/g, "") })}
                maxLength={48}
              />
              {formData.boletoBarcode && formData.boletoBarcode.length < 44 && (
                <p className="text-xs text-destructive">
                  A linha digitável deve ter pelo menos 44 dígitos
                </p>
              )}
            </div>
          )}

          {/* Campos de PIX */}
          {formData.paymentMethodType === "pix" && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Favorecido *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ do Favorecido</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={formData.recipientDocument}
                    onChange={(e) => setFormData({ ...formData, recipientDocument: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Chave PIX *
                  </Label>
                  <Input
                    placeholder="Informe a chave PIX"
                    value={formData.pixKey}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
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
            </div>
          )}

          {/* Status indicator */}
          {formData.paymentMethodType && (
            <div className={`p-3 rounded-lg text-sm ${isPaymentDataComplete() ? 'bg-green-500/10 text-green-700 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/20'}`}>
              {isPaymentDataComplete() 
                ? "✓ Dados de pagamento completos. Título pronto para pagamento."
                : "⚠ Complete os dados de pagamento para poder submeter para aprovação."}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
