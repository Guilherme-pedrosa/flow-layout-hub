import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, X, FileUp, AlertTriangle, Package, FileText, Truck, DollarSign, Plus, Trash2, CheckCircle, Sparkles, Bot } from "lucide-react";
import { usePurchaseOrders, PurchaseOrder, PurchaseOrderInsert, PurchaseOrderItemInsert } from "@/hooks/usePurchaseOrders";
import { useCompany } from "@/contexts/CompanyContext";
import { usePurchaseOrderStatuses } from "@/hooks/usePurchaseOrderStatuses";
import { usePurchaseOrderLimits } from "@/hooks/usePurchaseOrderLimits";
import { usePessoas } from "@/hooks/usePessoas";
import { useChartOfAccounts, useCostCenters } from "@/hooks/useFinanceiro";
import { toast } from "sonner";
import { PurchaseOrderItems, LocalItem } from "./PurchaseOrderItems";
import { CadastrarPessoaDialog } from "@/components/shared/CadastrarPessoaDialog";
import { XMLUploadButton } from "./XMLUploadButton";
import { PurchaseOrderAIAudit } from "./PurchaseOrderAIAudit";
import { CFOPSelect } from "@/components/shared/CFOPSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, addDays } from "date-fns";

interface PurchaseOrderFormProps {
  order: PurchaseOrder | null;
  onClose: () => void;
}

export interface LocalInstallment {
  installment_number: number;
  due_date: string;
  amount: number;
}

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function PurchaseOrderForm({ order, onClose }: PurchaseOrderFormProps) {
  const [activeTab, setActiveTab] = useState("dados");
  const [showCadastroFornecedor, setShowCadastroFornecedor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState(order?.supplier_id || "");
  const [purpose, setPurpose] = useState<"estoque" | "ordem_de_servico" | "despesa_operacional" | "garantia">(
    order?.purpose || "estoque"
  );
  const [observations, setObservations] = useState(order?.observations || "");
  const [freightValue, setFreightValue] = useState(order?.freight_value?.toString() || "0");
  const [hasExternalFreight, setHasExternalFreight] = useState(order?.has_external_freight || false);
  const [statusId, setStatusId] = useState(order?.status_id || "");
  const [chartAccountId, setChartAccountId] = useState(order?.chart_account_id || "");
  const [costCenterId, setCostCenterId] = useState(order?.cost_center_id || "");
  const [cfopGeral, setCfopGeral] = useState("");

  // Sincronizar estado com os dados do pedido quando mudar
  useEffect(() => {
    if (order) {
      console.log("[DEBUG] Order changed, syncing state:", order.supplier_id, order.supplier?.razao_social);
      setSupplierId(order.supplier_id || "");
      setPurpose(order.purpose || "estoque");
      setObservations(order.observations || "");
      setFreightValue(order.freight_value?.toString() || "0");
      setHasExternalFreight(order.has_external_freight || false);
      setStatusId(order.status_id || "");
      setChartAccountId(order.chart_account_id || "");
      setCostCenterId(order.cost_center_id || "");
    }
  }, [order?.id]);

  // Items state (managed here, passed to child)
  const [items, setItems] = useState<LocalItem[]>([]);

  // Installments state
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [installmentInterval, setInstallmentInterval] = useState(30);
  const [installments, setInstallments] = useState<LocalInstallment[]>([]);
  const [installmentsFromNfe, setInstallmentsFromNfe] = useState(false); // Se as parcelas vieram da NF-e

  const { createOrder, updateOrder, getOrderItems, createOrderItems, deleteOrderItems, getOrderInstallments, createOrderInstallments, deleteOrderInstallments, refetch } = usePurchaseOrders();
  const { statuses } = usePurchaseOrderStatuses();
  const { checkOrderLimits } = usePurchaseOrderLimits();
  const { activeFornecedores, refetch: refetchPessoas, getPessoaById } = usePessoas();
  const { accounts: chartOfAccounts, fetchAccounts } = useChartOfAccounts();
  const { costCenters, fetchCostCenters } = useCostCenters();
  const { currentCompany } = useCompany();
  
  // Estado do fornecedor selecionado para validação de CFOP
  const [supplierState, setSupplierState] = useState<string | null>(null);
  
  // UF da empresa vem do contexto
  const companyState = currentCompany?.estado || "GO";

  // Load financial data
  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
  }, []);

  // Atualizar UF do fornecedor quando mudar seleção
  useEffect(() => {
    const loadSupplierState = async () => {
      console.log("[DEBUG] loadSupplierState - supplierId:", supplierId);
      console.log("[DEBUG] activeFornecedores count:", activeFornecedores.length);
      
      if (supplierId) {
        const supplier = activeFornecedores.find(f => f.id === supplierId);
        console.log("[DEBUG] Found supplier in cache:", supplier?.razao_social, "estado:", supplier?.estado);
        
        if (supplier?.estado) {
          setSupplierState(supplier.estado);
          console.log("[DEBUG] Set supplierState from cache:", supplier.estado);
        } else {
          // Buscar do banco se não estiver em cache
          console.log("[DEBUG] Fetching supplier from DB...");
          try {
            const pessoa = await getPessoaById(supplierId);
            console.log("[DEBUG] Fetched pessoa:", pessoa?.razao_social, "estado:", pessoa?.estado);
            setSupplierState(pessoa?.estado || null);
          } catch (err) {
            console.error("[DEBUG] Error fetching pessoa:", err);
            setSupplierState(null);
          }
        }
      } else {
        setSupplierState(null);
      }
    };
    loadSupplierState();
  }, [supplierId, activeFornecedores]);

  // Load existing items and installments when editing
  useEffect(() => {
    if (order?.id) {
      loadExistingItems();
      loadExistingInstallments();
    }
  }, [order?.id]);

  const loadExistingInstallments = async () => {
    if (!order?.id) return;
    try {
      const savedInstallments = await getOrderInstallments(order.id);
      if (savedInstallments && savedInstallments.length > 0) {
        // Se há parcelas salvas, usar elas
        setInstallments(savedInstallments.map(inst => ({
          installment_number: inst.installment_number,
          due_date: inst.due_date,
          amount: Number(inst.amount),
        })));
        setInstallmentsCount(savedInstallments.length);
        setFirstDueDate(savedInstallments[0].due_date);
        setInstallmentsFromNfe(savedInstallments[0].source === 'nfe');
      }
    } catch (error) {
      console.error("Erro ao carregar parcelas:", error);
    }
  };

  const loadExistingItems = async () => {
    if (!order?.id) return;
    setLoadingItems(true);
    try {
      const orderItems = await getOrderItems(order.id);
      setItems(
        orderItems.map((item) => ({
          id: item.id,
          product_id: item.product_id || "",
          description: item.description || item.product?.description || "",
          quantity: item.quantity,
          unit_price: item.unit_price || 0,
          total_value: item.total_value || 0,
          chart_account_id: item.chart_account_id || "",
          cost_center_id: item.cost_center_id || "",
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  // Set default status
  useEffect(() => {
    if (!statusId && statuses.length > 0) {
      const defaultStatus = statuses.find((s) => s.is_default) || statuses[0];
      setStatusId(defaultStatus.id);
    }
  }, [statuses, statusId]);

  // Calculate total from items
  const totalItems = items.reduce((acc, item) => acc + item.total_value, 0);
  const totalValue = totalItems + (parseFloat(freightValue) || 0);

  // Generate installments when values change (SOMENTE se não vieram da NF-e)
  useEffect(() => {
    // Não gerar novas parcelas se já existem parcelas da NF-e
    if (!installmentsFromNfe) {
      generateInstallments();
    }
  }, [installmentsCount, firstDueDate, installmentInterval, totalValue, installmentsFromNfe]);

  const generateInstallments = () => {
    if (totalValue <= 0 || installmentsCount <= 0) {
      setInstallments([]);
      return;
    }

    const installmentAmount = totalValue / installmentsCount;
    const newInstallments: LocalInstallment[] = [];

    for (let i = 0; i < installmentsCount; i++) {
      const dueDate = addDays(new Date(firstDueDate), i * installmentInterval);
      newInstallments.push({
        installment_number: i + 1,
        due_date: format(dueDate, "yyyy-MM-dd"),
        amount: installmentAmount,
      });
    }

    setInstallments(newInstallments);
  };

  // Função para limpar parcelas da NF-e e gerar novas manualmente
  const handleClearNfeInstallments = () => {
    setInstallmentsFromNfe(false);
    generateInstallments();
  };

  const handleInstallmentAmountChange = (index: number, amount: number) => {
    const newInstallments = [...installments];
    newInstallments[index].amount = amount;
    setInstallments(newInstallments);
  };

  const handleInstallmentDateChange = (index: number, date: string) => {
    const newInstallments = [...installments];
    newInstallments[index].due_date = date;
    setInstallments(newInstallments);
  };

  const handleSave = async () => {
    if (!supplierId) {
      toast.error("Selecione um fornecedor");
      return;
    }

    if (!cfopGeral) {
      toast.error("Selecione o CFOP de entrada");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    // CRÍTICO: Validar divergência de fornecedor com NF-e
    if (order?.nfe_supplier_cnpj) {
      const selectedSupplier = activeFornecedores.find(f => f.id === supplierId);
      if (selectedSupplier?.cpf_cnpj) {
        const normalizedNfeCnpj = order.nfe_supplier_cnpj.replace(/[^\d]/g, '');
        const normalizedSupplierCnpj = selectedSupplier.cpf_cnpj.replace(/[^\d]/g, '');
        
        if (normalizedNfeCnpj !== normalizedSupplierCnpj) {
          toast.error("Fornecedor diferente da NF-e", {
            description: `O fornecedor selecionado não corresponde ao emitente da NF-e importada (${order.nfe_supplier_name || normalizedNfeCnpj}). Corrija antes de salvar.`,
            duration: 8000,
          });
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Verificar limites de valor
      const companyId = COMPANY_ID;
      const limitCheck = await checkOrderLimits(companyId, null, totalValue, purpose, order?.id);
      
      if (!limitCheck.allowed) {
        toast.error(limitCheck.message || "Valor do pedido excede os limites configurados");
        setSaving(false);
        return;
      }

      const data: PurchaseOrderInsert = {
        supplier_id: supplierId,
        purpose,
        observations: observations || undefined,
        freight_value: parseFloat(freightValue) || 0,
        has_external_freight: hasExternalFreight,
        status_id: statusId || undefined,
        chart_account_id: chartAccountId || undefined,
        cost_center_id: costCenterId || undefined,
        total_value: totalValue,
      };

      let orderId: string;

      if (order) {
        await updateOrder.mutateAsync({ id: order.id, data });
        orderId = order.id;
      } else {
        const result = await createOrder.mutateAsync(data);
        orderId = result.id;
      }

      // Save items
      if (order) {
        await deleteOrderItems.mutateAsync(orderId);
      }

      const itemsToCreate: PurchaseOrderItemInsert[] = items.map((item) => ({
        purchase_order_id: orderId,
        product_id: item.product_id || undefined,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_value: item.total_value,
        chart_account_id: item.chart_account_id || undefined,
        cost_center_id: item.cost_center_id || undefined,
      }));

      await createOrderItems.mutateAsync(itemsToCreate);

      await refetch();
      toast.success(order ? "Pedido atualizado com sucesso!" : "Pedido criado com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar pedido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Actions - Mobile optimized */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {order?.requires_reapproval && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium line-clamp-2">Requer reaprovação: {order.reapproval_reason}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} size="sm" className="flex-1 sm:flex-none">
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1 sm:flex-none">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* AI Audit Panel */}
      <PurchaseOrderAIAudit
        supplierId={supplierId}
        items={items}
        totalValue={totalValue}
        purpose={purpose}
        freightValue={parseFloat(freightValue) || 0}
        isEditing={!!order}
        nfeSupplierCnpj={order?.nfe_supplier_cnpj}
        nfeSupplierName={order?.nfe_supplier_name}
        supplierCnpj={activeFornecedores.find(f => f.id === supplierId)?.cpf_cnpj}
      />

      {/* Tabs - Mobile optimized with horizontal scroll */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-5 md:w-full">
            <TabsTrigger value="dados" className="flex-shrink-0 gap-1.5 px-3">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Dados Gerais</span>
              <span className="sm:hidden">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="itens" className="flex-shrink-0 gap-1.5 px-3">
              <Package className="h-4 w-4" />
              <span>Itens</span>
              {items.length > 0 && <span className="text-xs">({items.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-shrink-0 gap-1.5 px-3">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financeiro</span>
              <span className="sm:hidden">Fin.</span>
            </TabsTrigger>
            <TabsTrigger value="nfe" className="flex-shrink-0 gap-1.5 px-3">
              <FileUp className="h-4 w-4" />
              <span>NF-e</span>
            </TabsTrigger>
            <TabsTrigger value="cte" className="flex-shrink-0 gap-1.5 px-3">
              <Truck className="h-4 w-4" />
              <span>CT-e</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dados Gerais */}
        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Validação: tem NF-e vinculada? Bloquear troca de fornecedor */}
              {order?.nfe_key && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-sm">
                    Este pedido possui NF-e vinculada. O fornecedor não pode ser alterado.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={supplierId} 
                      onValueChange={(newSupplierId) => {
                        // Bloquear alteração se tem NF-e vinculada
                        if (order?.nfe_key && order?.supplier_id && newSupplierId !== order.supplier_id) {
                          toast.error("Não é possível alterar o fornecedor", {
                            description: "Este pedido possui uma NF-e vinculada. O fornecedor deve corresponder ao emitente da nota fiscal."
                          });
                          return;
                        }
                        setSupplierId(newSupplierId);
                      }}
                      disabled={!!order?.nfe_key}
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
                              setShowCadastroFornecedor(true);
                            }}
                            disabled={!!order?.nfe_key}
                          >
                            <Plus className="h-4 w-4" />
                            Cadastrar novo fornecedor
                          </Button>
                        </div>
                        {activeFornecedores.map((fornecedor) => (
                          <SelectItem key={fornecedor.id} value={fornecedor.id}>
                            {fornecedor.razao_social || fornecedor.nome_fantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusId} onValueChange={setStatusId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.color || "#6b7280" }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Finalidade *</Label>
                  <Select value={purpose} onValueChange={(v) => setPurpose(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estoque">Estoque</SelectItem>
                      <SelectItem value="ordem_de_servico">Ordem de Serviço</SelectItem>
                      <SelectItem value="despesa_operacional">Despesa Operacional</SelectItem>
                      <SelectItem value="garantia">Garantia</SelectItem>
                    </SelectContent>
                  </Select>
                  {purpose === "garantia" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Garantia: não gera financeiro nem frete
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    CFOP de Entrada *
                    <span className="text-xs text-muted-foreground">(Código Fiscal de Operações - SEFAZ)</span>
                  </Label>
                  <CFOPSelect 
                    value={cfopGeral} 
                    onValueChange={setCfopGeral}
                    supplierState={supplierState}
                    companyState={companyState}
                    purpose={purpose}
                    productDescription={items.length > 0 ? items.map(i => i.description).join(", ") : undefined}
                    nfeCfopSaida={order?.nfe_cfop_saida || undefined}
                    nfeNaturezaOperacao={order?.nfe_natureza_operacao || undefined}
                  />
                </div>
              </div>

              {/* Ocultar frete se finalidade for garantia */}
              {purpose !== "garantia" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frete Informado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={freightValue}
                      onChange={(e) => setFreightValue(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Frete Externo (CT-e)?</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Switch
                        checked={hasExternalFreight}
                        onCheckedChange={setHasExternalFreight}
                      />
                      <span className="text-sm text-muted-foreground">
                        {hasExternalFreight ? "Sim" : "Não"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plano de Contas</Label>
                  <Select value={chartAccountId} onValueChange={setChartAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {chartOfAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Centro de Custo</Label>
                  <Select value={costCenterId} onValueChange={setCostCenterId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.code} - {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-8 text-sm">
                    <span>Itens:</span>
                    <span className="font-medium">{formatCurrency(totalItems)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8 text-sm">
                    <span>Frete:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(freightValue) || 0)}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between gap-8">
                    <span className="font-medium">Total:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Itens */}
        <TabsContent value="itens">
          {loadingItems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PurchaseOrderItems 
              items={items} 
              onItemsChange={setItems} 
              purpose={purpose} 
            />
          )}
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Aviso se for garantia */}
              {purpose === "garantia" && (
                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-medium">Pedido de Garantia</p>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Pedidos com finalidade "Garantia" não geram contas a pagar. Não há configuração financeira para este tipo de pedido.
                  </p>
                </div>
              )}

              {purpose !== "garantia" && (
                <>
              {/* Aviso de parcelas da NF-e */}
              {installmentsFromNfe && (
                <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Parcelas importadas da NF-e
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearNfeInstallments}
                    >
                      Gerar novas parcelas
                    </Button>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    As parcelas foram importadas conforme os dados da Nota Fiscal. Você pode editá-las ou gerar novas.
                  </p>
                </div>
              )}

              {/* Configuração das parcelas - ocultar se veio da NF-e */}
              {!installmentsFromNfe && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Número de Parcelas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Primeiro Vencimento</Label>
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Intervalo (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={installmentInterval}
                    onChange={(e) => setInstallmentInterval(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
              )}

              {/* Valor total */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total do Pedido</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
              </div>

              {/* Tabela de parcelas */}
              {installments.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Parcela</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installments.map((inst, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {inst.installment_number}/{installmentsCount}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={inst.due_date}
                              onChange={(e) => handleInstallmentDateChange(index, e.target.value)}
                              className="w-[160px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={inst.amount === 0 ? '' : inst.amount.toString()}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*[.,]?\d*$/.test(val)) {
                                  handleInstallmentAmountChange(index, val === '' ? 0 : parseFloat(val.replace(',', '.')) || 0);
                                }
                              }}
                              className="w-[150px]"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Info */}
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Importante:</strong> As parcelas serão criadas como <strong>previsão</strong> ao salvar o pedido. 
                  Quando o status do pedido mudar para um que gere financeiro, as previsões se tornarão contas a pagar efetivas.
                </p>
              </div>
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NF-e */}
        <TabsContent value="nfe">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Importar XML NF-e</CardTitle>
            </CardHeader>
            <CardContent>
              {order?.nfe_imported_at ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>NF-e importada em {new Date(order.nfe_imported_at).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Número</Label>
                      <p className="font-medium">{order.nfe_number || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Série</Label>
                      <p className="font-medium">{order.nfe_series || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Data</Label>
                      <p className="font-medium">
                        {order.nfe_date ? new Date(order.nfe_date).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Chave</Label>
                      <p className="font-mono text-xs break-all">{order.nfe_key || "-"}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <XMLUploadButton
                      type="nfe"
                      orderId={order.id}
                      onSuccess={() => {
                        refetch();
                        loadExistingItems();
                      }}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Reimporte para atualizar os dados da NF-e
                    </p>
                  </div>
                </div>
              ) : order ? (
                <div className="text-center py-8 space-y-4">
                  <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">Nenhuma NF-e importada</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Importe o XML da NF-e para vincular ao pedido
                    </p>
                  </div>
                  <XMLUploadButton
                    type="nfe"
                    orderId={order.id}
                    onSuccess={() => {
                      refetch();
                      loadExistingItems();
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Salve o pedido primeiro</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    É necessário salvar o pedido antes de importar o XML
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CT-e */}
        <TabsContent value="cte">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Importar XML CT-e (Frete)</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasExternalFreight ? (
                <div className="text-center py-8">
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Frete externo não informado</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Marque "Frete Externo (CT-e)" nos dados gerais para habilitar
                  </p>
                </div>
              ) : order?.cte_imported_at ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>CT-e importado em {new Date(order.cte_imported_at).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Número</Label>
                      <p className="font-medium">{order.cte_number || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Data</Label>
                      <p className="font-medium">
                        {order.cte_date ? new Date(order.cte_date).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Valor Frete</Label>
                      <p className="font-medium">{formatCurrency(order.cte_freight_value || 0)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Chave</Label>
                      <p className="font-mono text-xs break-all">{order.cte_key || "-"}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <XMLUploadButton
                      type="cte"
                      orderId={order.id}
                      onSuccess={() => {
                        refetch();
                      }}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Reimporte para atualizar os dados do CT-e
                    </p>
                  </div>
                </div>
              ) : order ? (
                <div className="text-center py-8 space-y-4">
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">Nenhum CT-e importado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Importe o XML do CT-e para vincular ao pedido
                    </p>
                  </div>
                  <XMLUploadButton
                    type="cte"
                    orderId={order.id}
                    onSuccess={() => {
                      refetch();
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Salve o pedido primeiro</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    É necessário salvar o pedido antes de importar o XML
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Cadastro de Fornecedor */}
      <CadastrarPessoaDialog
        open={showCadastroFornecedor}
        onOpenChange={setShowCadastroFornecedor}
        tipo="fornecedor"
        onSuccess={(pessoaId) => {
          refetchPessoas();
          setSupplierId(pessoaId);
        }}
      />
    </div>
  );
}
