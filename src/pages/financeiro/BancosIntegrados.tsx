/**
 * Dashboard de Integração Bancária - WAI ERP
 */
import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, Plus, Wallet, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BancosIntegrados() {
  const { currentCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [accountsCount, setAccountsCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const companyId = currentCompany?.id;

  useEffect(() => {
    if (companyId) loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data: accounts } = await supabase
        .from("bank_accounts_synced")
        .select("current_balance")
        .eq("company_id", companyId);
      
      setTotalBalance(accounts?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0);
      setAccountsCount(accounts?.length || 0);

      const { data: logs } = await supabase
        .from("bank_sync_logs")
        .select("started_at")
        .eq("company_id", companyId)
        .order("started_at", { ascending: false })
        .limit(1);
      
      setLastSync(logs?.[0]?.started_at || null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!companyId) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bank-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ company_id: companyId, triggered_by: "manual" }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Sincronizado: ${result.accounts_synced} contas`);
        await loadData();
      } else {
        toast.error(result.error || "Erro");
      }
    } catch (e) {
      toast.error("Erro ao sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <PageHeader title="Integrações Bancárias" description="Conexões via API" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>}
            <p className="text-xs text-muted-foreground">{accountsCount} conta(s)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Último Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-32" /> : lastSync ? (
              <p className="text-sm">{format(new Date(lastSync), "dd/MM HH:mm", { locale: ptBR })}</p>
            ) : <p className="text-sm text-muted-foreground">Nunca</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>
    </div>
  );
}
