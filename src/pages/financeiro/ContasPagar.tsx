import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, CheckCircle, Wallet } from "lucide-react";
import { DDABoletosList, ExtratoList, ReconciliationReview, PayablesPage, FinancialAIChat } from "@/components/financeiro";
import { useCompany } from "@/contexts/CompanyContext";

export default function ContasPagar() {
  const { currentCompany } = useCompany();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Início</span>
        <span>›</span>
        <span>Financeiro</span>
        <span>›</span>
        <span className="text-foreground">Contas a Pagar</span>
      </nav>

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
          <PayablesPage key={`${refreshKey}-${currentCompany?.id}`} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="conciliacao">
          {currentCompany?.id ? (
            <ReconciliationReview companyId={currentCompany.id} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Selecione uma empresa para usar a conciliação.
            </div>
          )}
        </TabsContent>

        <TabsContent value="extrato">
          <ExtratoList />
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