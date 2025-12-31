import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { 
  Loader2, Save, Receipt, QrCode, CreditCard, Plus, CheckCircle, AlertCircle, 
  Search, Building2, User, FileText, Paperclip, DollarSign, Info 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { CadastrarPessoaDialog } from "@/components/shared/CadastrarPessoaDialog";
import { AuditValidationBadge } from "@/components/shared/AuditValidationBadge";
import { PayableAttachments } from "./PayableAttachments";
import { useAiAuditora, AuditResult } from "@/hooks/useAiAuditora";
import { useCompany } from "@/contexts/CompanyContext";
import { useFinancialSituations } from "@/hooks/useFinancialSituations";

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
    chart_account_id?: string | null;
    cost_center_id?: string | null;
    bank_account_id?: string | null;
    financial_situation_id?: string | null;
    notes?: string | null;
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

interface ChartAccount {
  id: string;
  code: string;
  name: string;
}

interface CostCenter {
  id: string;
  code: string;
  name: string;
}

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  account_number: string | null;
}

export function PayableForm({ open, onOpenChange, payable, onSuccess }: PayableFormProps) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const { auditPayable, loading: auditLoading } = useAiAuditora();
  const { situations, getDefaultSituation, getOverdueSituation } = useFinancialSituations();
  
  const [loading, setLoading] = useState(false);
  const [showCadastrarFornecedor, setShowCadastrarFornecedor] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; nome_fantasia: string | null; razao_social: string | null; tipo_pessoa?: string }[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [activeTab, setActiveTab] = useState("financeiro");
  
  // PIX validation state
  const [validatingPix, setValidatingPix] = useState(false);
  const [pixValidation, setPixValidation] = useState<PixValidation | null>(null);
  const [showPixConfirmDialog, setShowPixConfirmDialog] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  
  const [formData, setFormData] = useState({
    supplierId: "",
    amount: "",
    interestAmount: "",
    discountAmount: "",
    dueDate: "",
    scheduledPaymentDate: "",
    competenceDate: "",
    description: "",
    documentNumber: "",
    paymentMethodType: "" as PaymentMethodType | "",
    boletoBarcode: "",
    pixKey: "",
    pixKeyType: "cpf" as PixKeyType,
    recipientName: "",
    recipientDocument: "",
    chartAccountId: "",
    costCenterId: "",
    bankAccountId: "",
    financialSituationId: "",
    notes: "",
    invoiceName: "",
    isReconciled: false,
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchChartAccounts();
      fetchCostCenters();
      fetchBankAccounts();
      setPixValidation(null);
      setPixConfirmed(false);
      setActiveTab("financeiro");
      
      if (payable) {
        setFormData({
          supplierId: payable.supplier_id,
          amount: formatCurrencyInput(payable.amount * 100),
          interestAmount: "",
          discountAmount: "",
          dueDate: payable.due_date,
          scheduledPaymentDate: payable.scheduled_payment_date || "",
          competenceDate: format(new Date(), "yyyy-MM-dd"),
          description: payable.description || "",
          documentNumber: payable.document_number || "",
          paymentMethodType: (payable.payment_method_type as PaymentMethodType) || "",
          boletoBarcode: payable.boleto_barcode || "",
          pixKey: payable.pix_key || "",
          pixKeyType: (payable.pix_key_type as PixKeyType) || "cpf",
          recipientName: payable.recipient_name || "",
          recipientDocument: payable.recipient_document || "",
          chartAccountId: payable.chart_account_id || "",
          costCenterId: payable.cost_center_id || "",
          bankAccountId: payable.bank_account_id || "",
          financialSituationId: payable.financial_situation_id || "",
          notes: payable.notes || "",
          invoiceName: "",
          isReconciled: false,
        });
        if (payable.pix_key && payable.recipient_name) {
          setPixConfirmed(true);
        }
      } else {
        const defaultSituation = getDefaultSituation();
        setFormData({
          supplierId: "",
          amount: "",
          interestAmount: "",
          discountAmount: "",
          dueDate: format(new Date(), "yyyy-MM-dd"),
          scheduledPaymentDate: "",
          competenceDate: format(new Date(), "yyyy-MM-dd"),
          description: "",
          documentNumber: "",
          paymentMethodType: "",
          boletoBarcode: "",
          pixKey: "",
          pixKeyType: "cpf",
          recipientName: "",
          recipientDocument: "",
          chartAccountId: "",
          costCenterId: "",
          bankAccountId: "",
          financialSituationId: defaultSituation?.id || "",
          notes: "",
          invoiceName: "",
          isReconciled: false,
        });
      }
    }
  }, [open, payable]);

  const fetchSuppliers = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("pessoas")
      .select("id, nome_fantasia, razao_social, tipo_pessoa")
      .eq("is_active", true)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .order("razao_social");
    setSuppliers(data || []);
  };

  const fetchChartAccounts = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("code");
    setChartAccounts(data || []);
  };

  const fetchCostCenters = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("cost_centers")
      .select("id, code, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("code");
    setCostCenters(data || []);
  };

  const fetchBankAccounts = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("bank_accounts")
      .select("id, name, bank_name, account_number")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name");
    setBankAccounts(data || []);
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

  const calculateTotal = (): number => {
    const amount = parseCurrency(formData.amount);
    const interest = parseCurrency(formData.interestAmount);
    const discount = parseCurrency(formData.discountAmount);
    return amount + interest - discount;
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

    try {
      if (!companyId) throw new Error("Empresa não configurada");

      const { data, error } = await supabase.functions.invoke("inter-validate-pix", {
        body: {
          company_id: companyId,
          pix_key: formData.pixKey,
          pix_key_type: formData.pixKeyType,
        },
      });

      if (error) throw error;

      setPixValidation(data);
      
      if (data.valid) {
        setShowPixConfirmDialog(true);
      } else {
        toast.error(data.error || "Chave PIX inválida");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao validar chave PIX: ${errorMessage}`);
    } finally {
      setValidatingPix(false);
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
    setPixValidation(null);
    setPixConfirmed(false);
  };

  const handleAudit = async () => {
    const amount = parseCurrency(formData.amount);
    const result = await auditPayable({
      supplier_id: formData.supplierId,
      amount,
      due_date: formData.dueDate,
      description: formData.description,
      payment_method_type: formData.paymentMethodType,
      boleto_barcode: formData.boletoBarcode,
      pix_key: formData.pixKey,
    });
    setAuditResult(result);
  };

  const handleSubmit = async () => {
    if (!formData.supplierId || !formData.amount || !formData.dueDate) {
      toast.error("Preencha fornecedor, valor e vencimento");
      return;
    }

    if (!formData.chartAccountId) {
      toast.error("Selecione o Plano de Contas");
      return;
    }

    const amount = calculateTotal();
    if (amount <= 0) {
      toast.error("O valor total deve ser maior que zero");
      return;
    }

    const auditRes = await auditPayable({
      supplier_id: formData.supplierId,
      amount,
      due_date: formData.dueDate,
      description: formData.description,
      payment_method_type: formData.paymentMethodType,
      boleto_barcode: formData.boletoBarcode,
      pix_key: formData.pixKey,
    });
    setAuditResult(auditRes);

    if (!auditRes.valid) {
      toast.error("Corrija os erros antes de salvar");
      return;
    }

    setLoading(true);

    try {
      if (!companyId) throw new Error("Empresa não configurada");

      const paymentStatus = isPaymentDataComplete() ? "ready_to_pay" as const : "open" as const;

      let financialSituationId: string | null = formData.financialSituationId || null;
      if (!financialSituationId) {
        const today = startOfDay(new Date());
        const dueDate = startOfDay(parseISO(formData.dueDate));
        
        if (isBefore(dueDate, today)) {
          const overdueSituation = getOverdueSituation();
          financialSituationId = overdueSituation?.id || null;
        } else {
          const defaultSituation = getDefaultSituation();
          financialSituationId = defaultSituation?.id || null;
        }
      }

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
        financial_situation_id: financialSituationId,
        chart_account_id: formData.chartAccountId || null,
        cost_center_id: formData.costCenterId || null,
        bank_account_id: formData.bankAccountId || null,
        notes: formData.notes || null,
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {payable ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do lançamento financeiro.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="financeiro" className="gap-2">
              <FileText className="h-4 w-4" />
              Lançamento financeiro
            </TabsTrigger>
            <TabsTrigger value="outras" className="gap-2">
              <Info className="h-4 w-4" />
              Outras informações
            </TabsTrigger>
            <TabsTrigger value="anexos" className="gap-2">
              <Paperclip className="h-4 w-4" />
              Anexos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Lançamento Financeiro */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Dados Gerais */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dados gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Descrição e Vencimento */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Descrição do pagamento *</Label>
                      <Input
                        placeholder="Descrição do pagamento"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
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

                  {/* Plano de Contas e Centro de Custo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plano de contas *</Label>
                      <Select
                        value={formData.chartAccountId}
                        onValueChange={(value) => setFormData({ ...formData, chartAccountId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {chartAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Centro de custo</Label>
                      <Select
                        value={formData.costCenterId}
                        onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {costCenters.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id}>
                              {cc.code} - {cc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Forma de Pagamento e Conta Bancária */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Forma de pagamento *</Label>
                      <Select
                        value={formData.paymentMethodType}
                        onValueChange={(value: PaymentMethodType) => setFormData({ ...formData, paymentMethodType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boleto">Boleto Bancário</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Conta bancária *</Label>
                      <Select
                        value={formData.bankAccountId}
                        onValueChange={(value) => setFormData({ ...formData, bankAccountId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((ba) => (
                            <SelectItem key={ba.id} value={ba.id}>
                              {ba.name} {ba.bank_name ? `- ${ba.bank_name}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Situação e Data de compensação */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Situação *</Label>
                      <Select
                        value={formData.financialSituationId}
                        onValueChange={(value) => setFormData({ ...formData, financialSituationId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {situations.filter(s => s.allows_manual_change).map((sit) => (
                            <SelectItem key={sit.id} value={sit.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: sit.color }}
                                />
                                {sit.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de compensação</Label>
                      <Input
                        type="date"
                        value={formData.scheduledPaymentDate}
                        onChange={(e) => setFormData({ ...formData, scheduledPaymentDate: e.target.value })}
                      />
                    </div>
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
                            <span>Clique no botão de busca para validar a chave PIX.</span>
                          </div>
                        </div>
                      )}

                      {!pixConfirmed && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs">Preenchimento manual</Label>
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
                </CardContent>
              </Card>

              {/* Card de Valores */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Valor bruto *</Label>
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
                    <Label>Juros</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input
                        className="pl-10"
                        placeholder="0,00"
                        value={formData.interestAmount}
                        onChange={(e) => setFormData({ ...formData, interestAmount: formatCurrency(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Desconto</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input
                        className="pl-10"
                        placeholder="0,00"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData({ ...formData, discountAmount: formatCurrency(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Auditoria */}
            <AuditValidationBadge
              result={auditResult}
              loading={auditLoading}
              onAudit={handleAudit}
            />
          </TabsContent>

          {/* Tab: Outras Informações */}
          <TabsContent value="outras" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Fornecedor e Data de Competência */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Entidade</Label>
                    <Select defaultValue="fornecedor">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.supplierId}
                        onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2 border-b">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start gap-2 text-primary hover:text-primary"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowCadastrarFornecedor(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Cadastrar novo
                            </Button>
                          </div>
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
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de competência *</Label>
                    <Input
                      type="date"
                      value={formData.competenceDate}
                      onChange={(e) => setFormData({ ...formData, competenceDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nota Fiscal</Label>
                    <Input
                      placeholder="Nº da NF"
                      value={formData.documentNumber}
                      onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    />
                  </div>
                </div>

                {/* Nome na Fatura e Conciliado */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>OS Relacionada</Label>
                    <Input placeholder="" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Situação financeira</Label>
                    <Select
                      value={formData.financialSituationId}
                      onValueChange={(value) => setFormData({ ...formData, financialSituationId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {situations.filter(s => s.allows_manual_change).map((sit) => (
                          <SelectItem key={sit.id} value={sit.id}>
                            {sit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome na Fatura</Label>
                    <Input
                      placeholder=""
                      value={formData.invoiceName}
                      onChange={(e) => setFormData({ ...formData, invoiceName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conciliado?</Label>
                    <Select
                      value={formData.isReconciled ? "sim" : "nao"}
                      onValueChange={(value) => setFormData({ ...formData, isReconciled: value === "sim" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Negociação e Projeto */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Negociação / Unificado</Label>
                    <Input placeholder="" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Projeto</Label>
                    <Input placeholder="" disabled />
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label>Informações complementares</Label>
                  <Textarea
                    placeholder="Observações adicionais..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Anexos */}
          <TabsContent value="anexos" className="space-y-4 mt-4">
            {payable?.id ? (
              <PayableAttachments payableId={payable.id} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Salve o registro para adicionar anexos.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
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
                Cadastrar
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
              <p>Verifique se os dados abaixo correspondem ao destinatário correto.</p>
              
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
