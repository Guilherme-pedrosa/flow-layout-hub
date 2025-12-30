import { useNavigate } from "react-router-dom";
import { KpiCard, SalesChart, CashFlowChart, AiInsightCard, TasksList } from "@/components/dashboard";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useSalesChartData } from "@/hooks/useSalesChartData";
import { useCashFlowData } from "@/hooks/useCashFlowData";
import { useDashboardAiInsight } from "@/hooks/useDashboardAiInsight";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Task } from "@/components/dashboard/TasksList";

// Dados mockados de tarefas (conforme spec)
const mockTasks: Task[] = [
  { id: '1', description: 'Enviar orçamento para Cliente A', dueDate: new Date().toISOString(), priority: 'high' },
  { id: '2', description: 'Revisar pedido de compra #123', dueDate: new Date(Date.now() + 86400000).toISOString(), priority: 'medium' },
  { id: '3', description: 'Agendar reunião com fornecedor', dueDate: new Date(Date.now() + 172800000).toISOString(), priority: 'low' },
  { id: '4', description: 'Conferir estoque mínimo', dueDate: new Date(Date.now() - 86400000).toISOString(), priority: 'high' },
  { id: '5', description: 'Emitir NF-e pendentes', dueDate: new Date().toISOString(), priority: 'medium' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKpis } = useDashboardKpis();
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useSalesChartData(7);
  const { data: cashFlowData, isLoading: cashFlowLoading, refetch: refetchCashFlow } = useCashFlowData(6);
  const { insight, isLoading: insightLoading, refetch: refetchInsight } = useDashboardAiInsight();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchKpis(),
      refetchSales(),
      refetchCashFlow(),
      refetchInsight(),
    ]);
    setIsRefreshing(false);
  };

  const handleCompleteTask = (taskId: string) => {
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Tarefa concluída!');
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
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

      {/* Tasks List */}
      <TasksList 
        tasks={tasks} 
        isLoading={false} 
        onComplete={handleCompleteTask} 
      />
    </div>
  );
};

export default Dashboard;
