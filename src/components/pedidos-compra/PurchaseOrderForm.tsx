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
import { Loader2, Save, X, FileUp, AlertTriangle, Package, FileText, Truck, DollarSign } from "lucide-react";
import { usePurchaseOrders, PurchaseOrder, PurchaseOrderInsert } from "@/hooks/usePurchaseOrders";
import { usePurchaseOrderStatuses } from "@/hooks/usePurchaseOrderStatuses";
import { usePessoas } from "@/hooks/usePessoas";
import { useChartOfAccounts, useCostCenters } from "@/hooks/useFinanceiro";
import { toast } from "sonner";
import { PurchaseOrderItems } from "./PurchaseOrderItems";
import { useEffect as useEffectReact } from "react";

interface PurchaseOrderFormProps {
  order: PurchaseOrder | null;
  onClose: () => void;
}

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export function PurchaseOrderForm({ order, onClose }: PurchaseOrderFormProps) {
  const [activeTab, setActiveTab] = useState("dados");
  const [saving, setSaving] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState(order?.supplier_id || "");
  const [purpose, setPurpose] = useState<"estoque" | "ordem_de_servico" | "despesa_operacional">(
    order?.purpose || "estoque"
  );
  const [observations, setObservations] = useState(order?.observations || "");
  const [freightValue, setFreightValue] = useState(order?.freight_value?.toString() || "0");
  const [hasExternalFreight, setHasExternalFreight] = useState(order?.has_external_freight || false);
  const [statusId, setStatusId] = useState(order?.status_id || "");
  const [chartAccountId, setChartAccountId] = useState(order?.chart_account_id || "");
  const [costCenterId, setCostCenterId] = useState(order?.cost_center_id || "");

  const { createOrder, updateOrder, refetch } = usePurchaseOrders();
  const { statuses } = usePurchaseOrderStatuses();
  const { activeFornecedores } = usePessoas();
  const { accounts: chartOfAccounts, fetchAccounts } = useChartOfAccounts();
  const { costCenters, fetchCostCenters } = useCostCenters();

  // Load financial data
  useEffectReact(() => {
    fetchAccounts();
    fetchCostCenters();
  }, []);

  // Set default status
  useEffect(() => {
    if (!statusId && statuses.length > 0) {
      const defaultStatus = statuses.find((s) => s.is_default) || statuses[0];
      setStatusId(defaultStatus.id);
    }
  }, [statuses, statusId]);

  const handleSave = async () => {
    if (!supplierId) {
      toast.error("Selecione um fornecedor");
      return;
    }

    setSaving(true);
    try {
      const data: PurchaseOrderInsert = {
        supplier_id: supplierId,
        purpose,
        observations: observations || undefined,
        freight_value: parseFloat(freightValue) || 0,
        has_external_freight: hasExternalFreight,
        status_id: statusId || undefined,
        chart_account_id: chartAccountId || undefined,
        cost_center_id: costCenterId || undefined,
      };

      if (order) {
        await updateOrder.mutateAsync({ id: order.id, data });
      } else {
        await createOrder.mutateAsync(data);
      }

      await refetch();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {order?.requires_reapproval && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Requer reaprovação: {order.reapproval_reason}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dados" className="gap-2">
            <FileText className="h-4 w-4" />
            Dados Gerais
          </TabsTrigger>
          <TabsTrigger value="itens" className="gap-2">
            <Package className="h-4 w-4" />
            Itens
          </TabsTrigger>
          <TabsTrigger value="nfe" className="gap-2">
            <FileUp className="h-4 w-4" />
            NF-e
          </TabsTrigger>
          <TabsTrigger value="cte" className="gap-2">
            <Truck className="h-4 w-4" />
            CT-e
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
        </TabsList>

        {/* Dados Gerais */}
        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFornecedores.map((fornecedor) => (
                        <SelectItem key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.razao_social || fornecedor.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Finalidade</Label>
                  <Select value={purpose} onValueChange={(v) => setPurpose(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estoque">Estoque</SelectItem>
                      <SelectItem value="ordem_de_servico">Ordem de Serviço</SelectItem>
                      <SelectItem value="despesa_operacional">Despesa Operacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Itens */}
        <TabsContent value="itens">
          <PurchaseOrderItems orderId={order?.id} purpose={purpose} />
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
                    <FileUp className="h-5 w-5" />
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
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Nenhuma NF-e importada</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Salve o pedido primeiro para importar o XML da NF-e
                  </p>
                  {order && (
                    <Button className="mt-4" variant="outline">
                      <FileUp className="mr-2 h-4 w-4" />
                      Importar XML NF-e
                    </Button>
                  )}
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
                    <Truck className="h-5 w-5" />
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
                      <p className="font-medium">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          order.cte_freight_value || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Chave</Label>
                      <p className="font-mono text-xs break-all">{order.cte_key || "-"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">Nenhum CT-e importado</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Salve o pedido primeiro para importar o XML do CT-e
                  </p>
                  {order && (
                    <Button className="mt-4" variant="outline">
                      <FileUp className="mr-2 h-4 w-4" />
                      Importar XML CT-e
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contas a Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {order ? "Financeiro gerado automaticamente" : "Financeiro será gerado ao salvar"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order 
                        ? "O financeiro é criado como previsão ao emitir o pedido. Quando o status mudar para um que tenha comportamento financeiro 'Gerar', a previsão se torna efetiva."
                        : "Preencha os dados e salve o pedido para gerar a previsão financeira."}
                    </p>
                  </div>
                </div>
                {order && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <Label className="text-muted-foreground">Status Financeiro</Label>
                      <p className="font-medium mt-1">
                        {order.financial_generated ? "Efetivo" : "Previsão"}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <Label className="text-muted-foreground">Valor Total</Label>
                      <p className="font-medium mt-1">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total_value || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
