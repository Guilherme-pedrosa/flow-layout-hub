import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Receipt, FileText, CheckCircle } from "lucide-react";
import { DDABoletosList, ExtratoList, LancamentosPayablesList, ReconciliationReview } from "@/components/financeiro";
import { supabase } from "@/integrations/supabase/client";

export default function ContasPagar() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Buscar company_id das credenciais Inter
    const fetchCompanyId = async () => {
      const { data } = await supabase
        .from("inter_credentials")
        .select("company_id")
        .eq("is_active", true)
        .limit(1)
        .single();
      
      if (data?.company_id) {
        setCompanyId(data.company_id);
      }
    };
    fetchCompanyId();
  }, []);

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
          <TabsTrigger value="conciliacao" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Conciliação
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

        <TabsContent value="conciliacao">
          {companyId ? (
            <ReconciliationReview companyId={companyId} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Configure as credenciais do Banco Inter para usar a conciliação automática.
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
    </div>
  );
}
