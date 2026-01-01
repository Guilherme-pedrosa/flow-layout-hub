import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, CheckCircle, Wallet, X } from "lucide-react";
import { DDABoletosList, ExtratoList, PayablesPage, FinancialAIChat, ReconciliationPanel } from "@/components/financeiro";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ContasPagar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentCompany } = useCompany();
  const { insights, dismiss, markAsRead } = useAiInsights('financial');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const purchaseOrderId = searchParams.get("purchase_order_id");

  const handleRefresh = () => setRefreshKey((k) => k + 1);
  
  const clearPurchaseOrderFilter = () => {
    searchParams.delete("purchase_order_id");
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie lançamentos, conciliações e DDA"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Contas a Pagar" }]}
      />

      {purchaseOrderId && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Filtrando por pedido de compra:
          </span>
          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            Pedido vinculado
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearPurchaseOrderFilter}
            className="ml-auto text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar filtro
          </Button>
        </div>
      )}

      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando vencimentos e sugerindo priorizações de pagamento"
      />

      {/* Tabs */}
      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList className="bg-muted/30 p-1 rounded-lg">
          <TabsTrigger value="lancamentos" className="gap-2 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Wallet className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="gap-2 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <CheckCircle className="h-4 w-4" />
            Conciliação
          </TabsTrigger>
          <TabsTrigger value="extrato" className="gap-2 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            Extrato
          </TabsTrigger>
          <TabsTrigger value="dda" className="gap-2 rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Receipt className="h-4 w-4" />
            DDA (Boletos)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-0">
          <PayablesPage 
            key={`${refreshKey}-${currentCompany?.id}-${purchaseOrderId}`} 
            onRefresh={handleRefresh}
            purchaseOrderId={purchaseOrderId || undefined}
          />
        </TabsContent>

        <TabsContent value="conciliacao">
          {currentCompany?.id ? (
            <ReconciliationPanel transactionType="payables" />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Selecione uma empresa para usar a conciliação.
            </div>
          )}
        </TabsContent>

        <TabsContent value="extrato">
          <ExtratoList transactionTypeFilter="DEBIT" />
        </TabsContent>

        <TabsContent value="dda">
          <DDABoletosList />
        </TabsContent>
      </Tabs>

      {/* AI Chat */}
      <FinancialAIChat />
    </div>
  );
}