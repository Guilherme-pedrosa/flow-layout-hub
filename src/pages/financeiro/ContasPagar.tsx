import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Receipt, FileText } from "lucide-react";
import { DDABoletosList, ExtratoList, LancamentosPayablesList } from "@/components/financeiro";

export default function ContasPagar() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie pagamentos e execute via Banco Inter"
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
        </TabsList>

        <TabsContent value="lancamentos">
          <LancamentosPayablesList key={refreshKey} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="extrato">
          <ExtratoList />
        </TabsContent>

        <TabsContent value="dda">
          <DDABoletosList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
