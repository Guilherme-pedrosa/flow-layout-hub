import { useNavigate } from "react-router-dom";
import { KpiCard, SalesChart, CashFlowChart, AiInsightCard } from "@/components/dashboard";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useSalesChartData } from "@/hooks/useSalesChartData";
import { useCashFlowData } from "@/hooks/useCashFlowData";
import { useDashboardAiInsight } from "@/hooks/useDashboardAiInsight";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis();
  const { data: salesData, isLoading: salesLoading } = useSalesChartData(7);
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlowData(6);
  const { insight, isLoading: insightLoading, refetch: refetchInsight } = useDashboardAiInsight();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {/* AI Insight Card */}
      <AiInsightCard 
        insight={insight} 
        isLoading={insightLoading} 
        onRefresh={refetchInsight} 
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpisLoading ? (
          <>
            <KpiCard isLoading />
            <KpiCard isLoading />
            <KpiCard isLoading />
            <KpiCard isLoading />
          </>
        ) : (
          kpis?.map((kpi) => <KpiCard key={kpi.id} data={kpi} />)
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart data={salesData} isLoading={salesLoading} title="Vendas dos Últimos 7 Dias" />
        <CashFlowChart data={cashFlowData} isLoading={cashFlowLoading} title="Fluxo de Caixa (6 meses)" />
      </div>
    </div>
  );
};

export default Dashboard;
