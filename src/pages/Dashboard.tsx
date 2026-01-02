import { useNavigate } from "react-router-dom";
import { KpiCard, SalesChart, CashFlowChart, AiInsightCard, TasksList } from "@/components/dashboard";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useSalesChartData } from "@/hooks/useSalesChartData";
import { useCashFlowData } from "@/hooks/useCashFlowData";
import { useWaiInsights } from "@/hooks/useWaiInsights";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
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
  const { currentCompany, companies } = useCompany();
  
  // "all" = aglutinado, ou o id específico da empresa
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("current");
  
  // Determina o companyId para as queries
  const getCompanyIdForQuery = () => {
    if (selectedCompanyFilter === "all") return null; // Aglutinado
    if (selectedCompanyFilter === "current") return currentCompany?.id || null;
    return selectedCompanyFilter; // ID específico
  };

  const companyIdForQuery = getCompanyIdForQuery();

  const { data: kpis, isLoading: kpisLoading, refetch: refetchKpis } = useDashboardKpis(companyIdForQuery);
  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useSalesChartData(7, companyIdForQuery);
  const { data: cashFlowData, isLoading: cashFlowLoading, refetch: refetchCashFlow } = useCashFlowData(6, companyIdForQuery);
  const { insight, isLoading: insightLoading, refetch: refetchInsight, dismiss: dismissInsight } = useWaiInsights();
  
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

  // Formata CNPJ para exibição
  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  // Label do filtro atual
  const getFilterLabel = () => {
    if (selectedCompanyFilter === "all") return "Todas as empresas";
    if (selectedCompanyFilter === "current") return currentCompany?.name || "Empresa atual";
    const company = companies.find(c => c.company_id === selectedCompanyFilter);
    return company?.company.name || "Empresa";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Company Filter */}
          <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
            <SelectTrigger className="w-[220px] bg-card">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-medium">Todas as empresas</span>
              </SelectItem>
              <SelectItem value="current">
                <span>Empresa atual ({currentCompany?.name || 'Nenhuma'})</span>
              </SelectItem>
              {companies.map((uc) => (
                <SelectItem key={uc.company_id} value={uc.company_id}>
                  <div className="flex flex-col">
                    <span>{uc.company.name}</span>
                    {uc.company.cnpj && (
                      <span className="text-xs text-muted-foreground">{formatCNPJ(uc.company.cnpj)}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="bg-card border-border"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filter indicator */}
      {selectedCompanyFilter !== "current" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
          <Building2 className="h-4 w-4 text-primary" />
          <span>
            Exibindo dados de: <strong>{getFilterLabel()}</strong>
          </span>
          {selectedCompanyFilter !== "all" && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedCompanyFilter("current")}
              className="ml-auto h-6 text-xs"
            >
              Voltar para empresa atual
            </Button>
          )}
        </div>
      )}

      {/* AI Insight Card */}
      <AiInsightCard 
        insight={insight} 
        isLoading={insightLoading} 
        onRefresh={refetchInsight}
        onDismiss={dismissInsight}
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
