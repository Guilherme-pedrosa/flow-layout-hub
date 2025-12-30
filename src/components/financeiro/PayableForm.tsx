import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Save, Receipt, QrCode, CreditCard, Plus, CheckCircle, AlertCircle, Search, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { CadastrarPessoaDialog } from "@/components/shared/CadastrarPessoaDialog";
import { useCompany } from "@/contexts/CompanyContext";

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

interface PixValidation {
  valid: boolean;
  name?: string;
  document?: string;
  documentMasked?: string;
  bank?: string;
  keyType?: string;
  error?: string;
}

export function PayableForm({ open, onOpenChange, payable, onSuccess }: PayableFormProps) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  
  const [loading, setLoading] = useState(false);
  const [showCadastrarFornecedor, setShowCadastrarFornecedor] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; nome_fantasia: string | null; razao_social: string | null }[]>([]);
  
  // PIX validation state
  const [validatingPix, setValidatingPix] = useState(false);
  const [pixValidation, setPixValidation] = useState<PixValidation | null>(null);
  const [showPixConfirmDialog, setShowPixConfirmDialog] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  
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
      // Reset validation state
      setPixValidation(null);
      setPixConfirmed(false);
      
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
        // If editing, consider PIX already confirmed if data exists
        if (payable.pix_key && payable.recipient_name) {
          setPixConfirmed(true);
        }
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
      return !!formData.pixKey && !!formData.recipientName && pixConfirmed;
    }
    return true;
  };

  const handleValidatePix = async () => {
    if (!formData.pixKey || !formData.pixKeyType) {
      toast.error("Informe a chave PIX e o tipo");
      return;
    }

    setValidatingPix(true);
    setPixValidation(null);

    console.log("[PIX Validation] 1. Iniciando validação...");
    console.log("[PIX Validation] Chave:", formData.pixKey, "Tipo:", formData.pixKeyType);

    try {
      console.log("[PIX Validation] 2. Verificando empresa...");
      
      if (!companyId) {
        console.error("[PIX Validation] Empresa não encontrada");
        throw new Error("Empresa não configurada");
      }
      console.log("[PIX Validation] 3. Empresa encontrada:", companyId);

      console.log("[PIX Validation] 4. Chamando edge function inter-validate-pix...");
      const { data, error } = await supabase.functions.invoke("inter-validate-pix", {
        body: {
          company_id: companyId,
          pix_key: formData.pixKey,
          pix_key_type: formData.pixKeyType,
        },
      });

      console.log("[PIX Validation] 5. Resposta recebida:", JSON.stringify(data));
      
      if (error) {
        console.error("[PIX Validation] Erro na edge function:", error);
        throw error;
      }

      setPixValidation(data);
      
      if (data.valid) {
        console.log("[PIX Validation] 6. Chave válida - mostrando confirmação");
        setShowPixConfirmDialog(true);
      } else {
        console.log("[PIX Validation] 6. Chave inválida:", data.error);
        toast.error(data.error || "Chave PIX inválida");
      }
    } catch (error) {
      console.error("[PIX Validation] ERRO:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao validar chave PIX: ${errorMessage}`);
    } finally {
      setValidatingPix(false);
      console.log("[PIX Validation] Finalizado");
    }
  };

  const handleConfirmPix = () => {
    if (pixValidation?.valid) {
      setFormData(prev => ({
        ...prev,
        recipientName: pixValidation.name || prev.recipientName,
        recipientDocument: pixValidation.document || prev.recipientDocument,
      }));
      setPixConfirmed(true);
      setShowPixConfirmDialog(false);
      toast.success("Destinatário confirmado!");
    }
  };

  const handlePixKeyChange = (value: string) => {
    setFormData({ ...formData, pixKey: value });
    // Reset validation when key changes
    setPixValidation(null);
    setPixConfirmed(false);
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
    <>
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
            <div className="flex gap-2">
              <Select
                value={formData.supplierId}
                onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
              >
                <SelectTrigger className="flex-1">
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
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => setShowCadastrarFornecedor(true)}
                title="Cadastrar novo fornecedor"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
              {/* Chave PIX e Tipo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Chave PIX *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Informe a chave PIX"
                      value={formData.pixKey}
                      onChange={(e) => handlePixKeyChange(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant={pixConfirmed ? "outline" : "default"}
                      onClick={handleValidatePix}
                      disabled={validatingPix || !formData.pixKey}
                      className="shrink-0"
                    >
                      {validatingPix ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : pixConfirmed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.pixKeyType}
                    onValueChange={(value: PixKeyType) => {
                      setFormData({ ...formData, pixKeyType: value });
                      setPixValidation(null);
                      setPixConfirmed(false);
                    }}
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

              {/* Status da validação */}
              {pixConfirmed && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Destinatário confirmado</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="ml-2 font-medium">{formData.recipientName}</span>
                    </div>
                    {formData.recipientDocument && (
                      <div>
                        <span className="text-muted-foreground">Documento:</span>
                        <span className="ml-2 font-medium">{formData.recipientDocument}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!pixConfirmed && formData.pixKey && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Clique no botão de busca para validar a chave PIX antes de prosseguir.</span>
                  </div>
                </div>
              )}

              {/* Campos manuais (caso a validação não funcione) */}
              {!pixConfirmed && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Preenchimento manual (opcional)</Label>
                    <Input
                      placeholder="Nome do favorecido"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">CPF/CNPJ</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.recipientDocument}
                      onChange={(e) => setFormData({ ...formData, recipientDocument: e.target.value })}
                    />
                  </div>
                  {formData.recipientName && (
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPixConfirmed(true)}
                        className="w-full"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirmar dados manualmente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status indicator */}
          {formData.paymentMethodType && (
            <div className={`p-3 rounded-lg text-sm ${isPaymentDataComplete() ? 'bg-green-500/10 text-green-700 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/20'}`}>
              {isPaymentDataComplete() 
                ? "✓ Dados de pagamento completos. Título pronto para pagamento."
                : formData.paymentMethodType === "pix" && !pixConfirmed
                  ? "⚠ Valide a chave PIX para poder submeter para pagamento."
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

    {/* Dialog de confirmação PIX */}
    <AlertDialog open={showPixConfirmDialog} onOpenChange={setShowPixConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Confirme os dados do destinatário
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>Verifique se os dados abaixo correspondem ao destinatário correto antes de prosseguir.</p>
              
              {pixValidation?.valid && (
                <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-semibold text-foreground">{pixValidation.name}</p>
                    </div>
                  </div>
                  
                  {pixValidation.documentMasked && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                        <p className="font-mono text-foreground">{pixValidation.documentMasked}</p>
                      </div>
                    </div>
                  )}
                  
                  {pixValidation.bank && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Instituição</p>
                        <p className="text-foreground">{pixValidation.bank}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Chave PIX</p>
                      <p className="font-mono text-sm text-foreground">{formData.pixKey}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmPix}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar e Usar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <CadastrarPessoaDialog
      open={showCadastrarFornecedor}
      onOpenChange={setShowCadastrarFornecedor}
      tipo="fornecedor"
      title="Cadastrar Fornecedor"
      onSuccess={(pessoaId) => {
        fetchSuppliers();
        setFormData(prev => ({ ...prev, supplierId: pessoaId }));
      }}
    />
    </>
  );
}
