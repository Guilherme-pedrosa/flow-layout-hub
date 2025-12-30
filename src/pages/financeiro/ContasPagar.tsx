import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, CheckCircle, Wallet } from "lucide-react";
import { DDABoletosList, ExtratoList, ReconciliationReview, PayablesPage } from "@/components/financeiro";
import { supabase } from "@/integrations/supabase/client";

export default function ContasPagar() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
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
          <PayablesPage key={refreshKey} onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="conciliacao">
          {companyId ? (
            <ReconciliationReview companyId={companyId} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
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