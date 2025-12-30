import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Bot, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Calendar,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Lightbulb
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { LocalItem } from "./PurchaseOrderItems";

// Create a simple client to avoid type instantiation issues
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const dbClient = createClient(supabaseUrl, supabaseKey);

interface PurchaseOrderAIAuditProps {
  supplierId: string;
  items: LocalItem[];
  totalValue: number;
  purpose: string;
  freightValue: number;
  isEditing: boolean;
}

interface AuditAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  category: string;
  title: string;
  message: string;
  suggestion?: string;
  data?: Record<string, unknown>;
}

interface SupplierHistory {
  total_orders: number;
  avg_order_value: number;
  last_order_date: string | null;
  total_spent: number;
  avg_delivery_time?: number;
}

interface PriceComparison {
  product_id: string;
  description: string;
  current_price: number;
  avg_historical_price: number;
  min_historical_price: number;
  max_historical_price: number;
  price_difference_percent: number;
}

interface CashFlowImpact {
  current_balance: number;
  after_order_balance: number;
  payables_next_30_days: number;
  receivables_next_30_days: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export function PurchaseOrderAIAudit({ 
  supplierId, 
  items, 
  totalValue, 
  purpose, 
  freightValue,
  isEditing 
}: PurchaseOrderAIAuditProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  const [supplierHistory, setSupplierHistory] = useState<SupplierHistory | null>(null);
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([]);
  const [cashFlowImpact, setCashFlowImpact] = useState<CashFlowImpact | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);

  const runAudit = useCallback(async () => {
    if (!supplierId || items.length === 0) {
      setAlerts([]);
      return;
    }

    setLoading(true);
    const newAlerts: AuditAlert[] = [];

    try {
      // 1. Buscar histórico do fornecedor
      const supplierOrdersResult: any = await dbClient
        .from('purchase_orders')
        .select('id, total_value, created_at')
        .eq('company_id', COMPANY_ID)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      
      const supplierOrders = supplierOrdersResult.data as Array<{id: string, total_value: number | null, created_at: string}> | null;

      if (supplierOrders && supplierOrders.length > 0) {
        const totalSpent = supplierOrders.reduce((acc, o) => acc + (o.total_value || 0), 0);
        const avgValue = totalSpent / supplierOrders.length;
        
        setSupplierHistory({
          total_orders: supplierOrders.length,
          avg_order_value: avgValue,
          last_order_date: supplierOrders[0]?.created_at || null,
          total_spent: totalSpent,
        });

        // Alerta se pedido muito acima da média
        if (totalValue > avgValue * 2 && supplierOrders.length >= 3) {
          newAlerts.push({
            id: 'high_order_value',
            type: 'warning',
            category: 'Valor',
            title: 'Pedido acima da média',
            message: `Este pedido é ${((totalValue / avgValue - 1) * 100).toFixed(0)}% maior que a média histórica com este fornecedor.`,
            suggestion: 'Verifique se há necessidade de aprovação adicional.',
            data: { avgValue, totalValue }
          });
        }

        // Alerta se primeira compra com fornecedor
      } else {
        newAlerts.push({
          id: 'new_supplier',
          type: 'info',
          category: 'Fornecedor',
          title: 'Primeiro pedido com este fornecedor',
          message: 'Não há histórico de compras com este fornecedor.',
          suggestion: 'Considere verificar referências e condições de pagamento.',
        });
      }

      // 2. Buscar e comparar preços históricos dos itens
      const productIds = items.filter(i => i.product_id).map(i => i.product_id);
      if (productIds.length > 0) {
        const { data: historicalItems } = await dbClient
          .from('purchase_order_items')
          .select('product_id, unit_price')
          .in('product_id', productIds)
          .limit(100);

        if (historicalItems && historicalItems.length > 0) {
          const pricesByProduct: Record<string, number[]> = {};
          historicalItems.forEach(item => {
            if (item.product_id) {
              if (!pricesByProduct[item.product_id]) {
                pricesByProduct[item.product_id] = [];
              }
              pricesByProduct[item.product_id].push(item.unit_price);
            }
          });

          const comparisons: PriceComparison[] = [];
          items.forEach(item => {
            if (item.product_id && pricesByProduct[item.product_id]) {
              const prices = pricesByProduct[item.product_id];
              const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              const diffPercent = ((item.unit_price - avg) / avg) * 100;

              comparisons.push({
                product_id: item.product_id,
                description: item.description,
                current_price: item.unit_price,
                avg_historical_price: avg,
                min_historical_price: min,
                max_historical_price: max,
                price_difference_percent: diffPercent,
              });

              // Alerta se preço 20% acima da média
              if (diffPercent > 20) {
                newAlerts.push({
                  id: `price_high_${item.product_id}`,
                  type: 'warning',
                  category: 'Preço',
                  title: `Preço elevado: ${item.description.substring(0, 30)}...`,
                  message: `Preço ${diffPercent.toFixed(1)}% acima da média histórica.`,
                  suggestion: `Média: R$ ${avg.toFixed(2)} | Atual: R$ ${item.unit_price.toFixed(2)}`,
                  data: { product_id: item.product_id, avg, current: item.unit_price }
                });
              }

              // Alerta se preço muito abaixo (possível erro)
              if (diffPercent < -30) {
                newAlerts.push({
                  id: `price_low_${item.product_id}`,
                  type: 'info',
                  category: 'Preço',
                  title: `Preço muito baixo: ${item.description.substring(0, 30)}...`,
                  message: `Preço ${Math.abs(diffPercent).toFixed(1)}% abaixo da média. Verifique se está correto.`,
                  suggestion: `Média: R$ ${avg.toFixed(2)} | Atual: R$ ${item.unit_price.toFixed(2)}`,
                });
              }
            }
          });

          setPriceComparisons(comparisons);
        }
      }

      // 3. Análise de impacto no fluxo de caixa
      const { data: bankAccounts } = await dbClient
        .from('bank_accounts')
        .select('current_balance')
        .eq('company_id', COMPANY_ID)
        .eq('is_active', true);

      const currentBalance = bankAccounts?.reduce((acc, b) => acc + (b.current_balance || 0), 0) || 0;

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: payables } = await dbClient
        .from('payables')
        .select('amount')
        .eq('company_id', COMPANY_ID)
        .eq('is_paid', false)
        .gte('due_date', today)
        .lte('due_date', thirtyDaysLater);

      const { data: receivables } = await dbClient
        .from('accounts_receivable')
        .select('amount')
        .eq('company_id', COMPANY_ID)
        .eq('is_paid', false)
        .gte('due_date', today)
        .lte('due_date', thirtyDaysLater);

      const payablesTotal = payables?.reduce((acc, p) => acc + p.amount, 0) || 0;
      const receivablesTotal = receivables?.reduce((acc, r) => acc + r.amount, 0) || 0;
      const afterOrderBalance = currentBalance - totalValue;
      const projectedBalance = afterOrderBalance - payablesTotal + receivablesTotal;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (projectedBalance < 0) riskLevel = 'critical';
      else if (projectedBalance < totalValue * 0.5) riskLevel = 'high';
      else if (projectedBalance < totalValue) riskLevel = 'medium';

      setCashFlowImpact({
        current_balance: currentBalance,
        after_order_balance: afterOrderBalance,
        payables_next_30_days: payablesTotal,
        receivables_next_30_days: receivablesTotal,
        risk_level: riskLevel,
      });

      if (riskLevel === 'critical') {
        newAlerts.push({
          id: 'cash_critical',
          type: 'error',
          category: 'Caixa',
          title: 'Alerta crítico de caixa',
          message: 'Este pedido pode deixar o caixa negativo nos próximos 30 dias.',
          suggestion: 'Considere renegociar prazos de pagamento ou priorizar recebimentos.',
        });
      } else if (riskLevel === 'high') {
        newAlerts.push({
          id: 'cash_high',
          type: 'warning',
          category: 'Caixa',
          title: 'Atenção ao fluxo de caixa',
          message: 'Projeção de caixa apertada após este pedido.',
          suggestion: 'Monitore os recebimentos previstos para os próximos dias.',
        });
      }

      // 4. Verificar duplicidades
      if (items.length > 0) {
        const { data: recentOrders } = await dbClient
          .from('purchase_orders')
          .select(`
            id,
            created_at,
            total_value,
            supplier:pessoas(razao_social)
          `)
          .eq('company_id', COMPANY_ID)
          .eq('supplier_id', supplierId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentOrders && recentOrders.length > 0) {
          const similarOrder = recentOrders.find(o => 
            Math.abs((o.total_value || 0) - totalValue) < totalValue * 0.1
          );

          if (similarOrder && !isEditing) {
            newAlerts.push({
              id: 'possible_duplicate',
              type: 'warning',
              category: 'Duplicidade',
              title: 'Possível pedido duplicado',
              message: `Pedido similar (R$ ${(similarOrder.total_value || 0).toFixed(2)}) criado recentemente para este fornecedor.`,
              suggestion: 'Verifique se não é um pedido duplicado.',
              data: { orderId: similarOrder.id, orderDate: similarOrder.created_at }
            });
          }
        }
      }

      // 5. Verificar quantidade muito alta
      items.forEach(item => {
        if (item.quantity > 1000) {
          newAlerts.push({
            id: `high_qty_${item.product_id || item.description}`,
            type: 'info',
            category: 'Quantidade',
            title: 'Quantidade elevada',
            message: `${item.description.substring(0, 30)}... com ${item.quantity} unidades.`,
            suggestion: 'Verifique se a quantidade está correta.',
          });
        }
      });

      // 6. Verificar frete proporcional
      if (freightValue > 0 && totalValue > 0) {
        const freightPercent = (freightValue / totalValue) * 100;
        if (freightPercent > 15) {
          newAlerts.push({
            id: 'high_freight',
            type: 'warning',
            category: 'Frete',
            title: 'Frete proporcionalmente alto',
            message: `Frete representa ${freightPercent.toFixed(1)}% do valor total.`,
            suggestion: 'Considere negociar o frete ou consolidar pedidos.',
          });
        }
      }

      // 7. Gerar sugestão da IA se houver alertas críticos ou de warning
      const criticalAlerts = newAlerts.filter(a => a.type === 'error' || a.type === 'warning');
      if (criticalAlerts.length > 0) {
        try {
          const alertsSummary = criticalAlerts.map(a => `- ${a.title}: ${a.message}`).join('\n');
          const { data: aiData } = await dbClient.functions.invoke('financial-ai', {
            body: {
              type: 'purchase_audit',
              companyId: COMPANY_ID,
              messages: [{
                role: 'user',
                content: `Analise estes alertas de auditoria de um pedido de compra e dê uma recomendação objetiva em 2-3 frases:

Valor do pedido: R$ ${totalValue.toFixed(2)}
Finalidade: ${purpose}
Quantidade de itens: ${items.length}

Alertas detectados:
${alertsSummary}

Dê sua recomendação de forma direta e prática.`
              }]
            }
          });

          if (aiData) {
            // Parse streaming response
            const lines = aiData.split('\n');
            let suggestion = '';
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6));
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) suggestion += content;
                } catch {}
              }
            }
            if (suggestion) setAiSuggestion(suggestion.trim());
          }
        } catch (error) {
          console.error('Erro ao obter sugestão da IA:', error);
        }
      } else {
        setAiSuggestion(null);
      }

      setAlerts(newAlerts);
      setLastAnalyzedAt(new Date());
    } catch (error) {
      console.error('Erro na auditoria:', error);
    } finally {
      setLoading(false);
    }
  }, [supplierId, items, totalValue, purpose, freightValue, isEditing]);

  // Debounce para não rodar toda hora
  useEffect(() => {
    const timer = setTimeout(() => {
      if (supplierId && items.length > 0 && totalValue > 0) {
        runAudit();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [supplierId, items.length, totalValue]);

  const getAlertIcon = (type: AuditAlert['type']) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getAlertBadgeVariant = (type: AuditAlert['type']) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      case 'info': return 'secondary';
      case 'success': return 'default';
    }
  };

  const getRiskBadge = (risk: CashFlowImpact['risk_level']) => {
    const config = {
      low: { label: 'Baixo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      medium: { label: 'Médio', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      high: { label: 'Alto', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
      critical: { label: 'Crítico', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    };
    return config[risk];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (!supplierId || items.length === 0) {
    return null;
  }

  const errorCount = alerts.filter(a => a.type === 'error').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const infoCount = alerts.filter(a => a.type === 'info').length;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Auditora IA
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Análise em tempo real do pedido
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!loading && (
                  <div className="flex items-center gap-1.5">
                    {errorCount > 0 && (
                      <Badge variant="destructive" className="h-6">
                        {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge variant="outline" className="h-6 border-yellow-500 text-yellow-600">
                        {warningCount} {warningCount === 1 ? 'alerta' : 'alertas'}
                      </Badge>
                    )}
                    {errorCount === 0 && warningCount === 0 && (
                      <Badge variant="outline" className="h-6 border-green-500 text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        OK
                      </Badge>
                    )}
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Sugestão da IA */}
            {aiSuggestion && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Recomendação da IA</p>
                    <p className="text-sm text-foreground/90">{aiSuggestion}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Impacto no Caixa */}
            {cashFlowImpact && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Impacto no Caixa
                  </span>
                  <Badge className={getRiskBadge(cashFlowImpact.risk_level).className}>
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    Risco {getRiskBadge(cashFlowImpact.risk_level).label}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Saldo atual:</span>
                    <span className="font-medium">{formatCurrency(cashFlowImpact.current_balance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Após pedido:</span>
                    <span className={`font-medium ${cashFlowImpact.after_order_balance < 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(cashFlowImpact.after_order_balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-destructive" />
                      Saídas 30d:
                    </span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(cashFlowImpact.payables_next_30_days)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      Entradas 30d:
                    </span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(cashFlowImpact.receivables_next_30_days)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico do Fornecedor */}
            {supplierHistory && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Histórico do Fornecedor
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pedidos anteriores:</span>
                    <span className="font-medium">{supplierHistory.total_orders}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Média por pedido:</span>
                    <span className="font-medium">{formatCurrency(supplierHistory.avg_order_value)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total gasto:</span>
                    <span className="font-medium">{formatCurrency(supplierHistory.total_spent)}</span>
                  </div>
                  {supplierHistory.last_order_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Último pedido:</span>
                      <span className="font-medium">
                        {new Date(supplierHistory.last_order_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lista de Alertas */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Pontos de Atenção ({alerts.length})
                </span>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-2.5 rounded-lg border ${
                        alert.type === 'error' ? 'bg-destructive/10 border-destructive/30' :
                        alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                        alert.type === 'info' ? 'bg-blue-500/10 border-blue-500/30' :
                        'bg-green-500/10 border-green-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">{alert.title}</span>
                            <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                              {alert.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                          {alert.suggestion && (
                            <p className="text-xs text-primary mt-1 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              {alert.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparação de Preços */}
            {priceComparisons.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Análise de Preços
                </span>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {priceComparisons.map((comp) => (
                    <div key={comp.product_id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                      <span className="truncate max-w-[40%]" title={comp.description}>
                        {comp.description.substring(0, 25)}...
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          Média: {formatCurrency(comp.avg_historical_price)}
                        </span>
                        <span className={`font-medium ${
                          comp.price_difference_percent > 15 ? 'text-destructive' :
                          comp.price_difference_percent < -15 ? 'text-blue-500' :
                          'text-green-600'
                        }`}>
                          {comp.price_difference_percent > 0 ? '+' : ''}{comp.price_difference_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {lastAnalyzedAt ? `Analisado às ${lastAnalyzedAt.toLocaleTimeString('pt-BR')}` : 'Aguardando análise...'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={runAudit} 
                disabled={loading}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Reanalisar
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
