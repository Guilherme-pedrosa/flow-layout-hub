import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ShieldCheck, History, Receipt, FileText } from "lucide-react";
import { ScheduledPaymentsList, PaymentApprovalList, PixPaymentsList, DDABoletosList, ExtratoList } from "@/components/financeiro";

export default function ContasPagar() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie pagamentos, submeta para aprovação e execute via Banco Inter"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Contas a Pagar" },
        ]}
      />
      
      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lancamentos" className="gap-2">
            <Calendar className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="extrato" className="gap-2">
            <FileText className="h-4 w-4" />
            Extrato
          </TabsTrigger>
          <TabsTrigger value="dda" className="gap-2">
            <Receipt className="h-4 w-4" />
            DDA (Boletos)
          </TabsTrigger>
          <TabsTrigger value="aprovacoes" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Aprovações
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos">
          <ScheduledPaymentsList key={refreshKey} onSubmitted={handleRefresh} />
        </TabsContent>

        <TabsContent value="extrato">
          <ExtratoList />
        </TabsContent>

        <TabsContent value="dda">
          <DDABoletosList />
        </TabsContent>

        <TabsContent value="aprovacoes">
          <PaymentApprovalList key={refreshKey} onApproved={handleRefresh} />
        </TabsContent>

        <TabsContent value="historico">
          <PixPaymentsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
