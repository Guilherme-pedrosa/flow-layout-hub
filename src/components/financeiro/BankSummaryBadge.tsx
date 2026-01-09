/**
 * Badge que mostra o resumo do extrato bancário carregado
 * Permite o usuário bater o olho e ver que a IA está usando o extrato real
 */
import { useState, useEffect } from "react";
import { Database, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface BankTxSummary {
  tx_count: number;
  total_in: number;
  total_out: number;
  net: number;
  first_date: string | null;
  last_date: string | null;
}

interface BankSummaryBadgeProps {
  className?: string;
  onRefresh?: () => void;
}

export function BankSummaryBadge({ className, onRefresh }: BankSummaryBadgeProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [summaryHoje, setSummaryHoje] = useState<BankTxSummary | null>(null);
  const [summary7d, setSummary7d] = useState<BankTxSummary | null>(null);
  const [summaryMes, setSummaryMes] = useState<BankTxSummary | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [latestBankDate, setLatestBankDate] = useState<string | null>(null);

  const formatBRL = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "R$ 0,00";
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const loadSummaries = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      // CRÍTICO: Primeiro buscar último dia com dados
      const { data: latestTx } = await supabase
        .from('bank_transactions')
        .select('transaction_date')
        .eq('company_id', currentCompany.id)
        .order('transaction_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const latestDate = latestTx?.transaction_date || null;
      setLatestBankDate(latestDate);
      
      if (!latestDate) {
        // Sem dados bancários
        setSummaryHoje(null);
        setSummary7d(null);
        setSummaryMes(null);
        setLoading(false);
        return;
      }
      
      // Calcular períodos baseados no último dia com dados (não hoje)
      const baseDate = new Date(latestDate + 'T12:00:00');
      const sevenDaysAgo = new Date(baseDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const firstDayOfMonth = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-01`;

      // Buscar resumos em paralelo
      const [hojeResult, semanaResult, mesResult, connectionsResult] = await Promise.all([
        supabase.rpc('get_bank_tx_summary', {
          p_company_id: currentCompany.id,
          p_date_from: latestDate,
          p_date_to: latestDate
        }),
        supabase.rpc('get_bank_tx_summary', {
          p_company_id: currentCompany.id,
          p_date_from: sevenDaysAgo.toISOString().split('T')[0],
          p_date_to: latestDate
        }),
        supabase.rpc('get_bank_tx_summary', {
          p_company_id: currentCompany.id,
          p_date_from: firstDayOfMonth,
          p_date_to: latestDate
        }),
        supabase
          .from("bank_connections")
          .select("last_sync_at")
          .eq("company_id", currentCompany.id)
          .order("last_sync_at", { ascending: false })
          .limit(1)
      ]);

      if (hojeResult.data) {
        const data = Array.isArray(hojeResult.data) ? hojeResult.data[0] : hojeResult.data;
        setSummaryHoje(data);
      }
      
      if (semanaResult.data) {
        const data = Array.isArray(semanaResult.data) ? semanaResult.data[0] : semanaResult.data;
        setSummary7d(data);
      }
      
      if (mesResult.data) {
        const data = Array.isArray(mesResult.data) ? mesResult.data[0] : mesResult.data;
        setSummaryMes(data);
      }

      if (connectionsResult.data?.[0]?.last_sync_at) {
        setLastSync(connectionsResult.data[0].last_sync_at);
      }
    } catch (error) {
      console.error('[BankSummaryBadge] Error loading summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, [currentCompany?.id]);

  const handleRefresh = () => {
    loadSummaries();
    onRefresh?.();
  };

  const hasBankData = latestBankDate !== null;
  
  const formatLatestDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nenhum';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  return (
    <TooltipProvider>
      <div className={cn("rounded-lg border bg-card p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Extrato Sincronizado</span>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>

        {/* CRÍTICO: Mostrar último dia com dados */}
        <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1.5 rounded mb-2">
          📅 Último dia com dados: {formatLatestDate(latestBankDate)}
        </div>

        {!hasBankData ? (
          <div className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1.5 rounded">
            ⚠️ Sem transações sincronizadas
          </div>
        ) : (
          <div className="space-y-2">
            {/* Legenda */}
            <div className="text-[10px] text-muted-foreground italic mb-1">
              Saldo líquido = Entradas − Saídas (passe o mouse para ver detalhes)
            </div>

            {/* Último dia com dados (não "Hoje") */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Dia base:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{summaryHoje?.tx_count || 0} tx</span>
                    {(summaryHoje?.net || 0) >= 0 ? (
                      <span className="text-green-600 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {formatBRL(summaryHoje?.net)}
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <TrendingDown className="h-3 w-3" />
                        {formatBRL(summaryHoje?.net)}
                      </span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <p className="text-green-600">↑ Entradas: {formatBRL(summaryHoje?.total_in)}</p>
                <p className="text-red-600">↓ Saídas: {formatBRL(summaryHoje?.total_out)}</p>
                <p className="border-t mt-1 pt-1 font-medium">= Líquido: {formatBRL(summaryHoje?.net)}</p>
              </TooltipContent>
            </Tooltip>

            {/* 7 dias */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">7 dias:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{summary7d?.tx_count || 0} tx</span>
                    {(summary7d?.net || 0) >= 0 ? (
                      <span className="text-green-600 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {formatBRL(summary7d?.net)}
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <TrendingDown className="h-3 w-3" />
                        {formatBRL(summary7d?.net)}
                      </span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <p className="text-green-600">↑ Entradas: {formatBRL(summary7d?.total_in)}</p>
                <p className="text-red-600">↓ Saídas: {formatBRL(summary7d?.total_out)}</p>
                <p className="border-t mt-1 pt-1 font-medium">= Líquido: {formatBRL(summary7d?.net)}</p>
              </TooltipContent>
            </Tooltip>

            {/* Mês */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Mês:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{summaryMes?.tx_count || 0} tx</span>
                    {(summaryMes?.net || 0) >= 0 ? (
                      <span className="text-green-600 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {formatBRL(summaryMes?.net)}
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <TrendingDown className="h-3 w-3" />
                        {formatBRL(summaryMes?.net)}
                      </span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                <p className="text-green-600">↑ Entradas: {formatBRL(summaryMes?.total_in)}</p>
                <p className="text-red-600">↓ Saídas: {formatBRL(summaryMes?.total_out)}</p>
                <p className="border-t mt-1 pt-1 font-medium">= Líquido: {formatBRL(summaryMes?.net)}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {lastSync && (
          <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Sync: {new Date(lastSync).toLocaleString('pt-BR')}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
