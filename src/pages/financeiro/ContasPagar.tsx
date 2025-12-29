import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ShieldCheck, History, Clock } from "lucide-react";
import { ScheduledPaymentsList, PaymentApprovalList, PixPaymentsList } from "@/components/financeiro";

export default function ContasPagar() {
  const [approvalCount, setApprovalCount] = useState(0);

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
      
      <Tabs defaultValue="programados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programados" className="gap-2">
            <Calendar className="h-4 w-4" />
            Pagamentos Programados
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

        <TabsContent value="programados">
          <ScheduledPaymentsList />
        </TabsContent>

        <TabsContent value="aprovacoes">
          <PaymentApprovalList />
        </TabsContent>

        <TabsContent value="historico">
          <PixPaymentsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
