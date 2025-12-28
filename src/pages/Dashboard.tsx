import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Receipt,
  CreditCard,
  ClipboardList,
} from "lucide-react";
import { StatCard, RecentActivities, FinancialSummary } from "@/components/dashboard";

// Mock data
const mockActivities = [
  {
    id: "1",
    type: "venda" as const,
    description: "Venda #1234 - Cliente ABC Ltda",
    value: 2450.0,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    user: "Admin",
  },
  {
    id: "2",
    type: "recebimento" as const,
    description: "Recebimento - Fatura #0089",
    value: 1200.0,
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    user: "Admin",
  },
  {
    id: "3",
    type: "pagamento" as const,
    description: "Pagamento - Fornecedor XYZ",
    value: 3500.0,
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    user: "Financeiro",
  },
  {
    id: "4",
    type: "os" as const,
    description: "OS #0456 - Manutenção preventiva",
    value: 850.0,
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    user: "Técnico",
  },
  {
    id: "5",
    type: "estoque" as const,
    description: "Entrada de estoque - 50 unidades",
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    user: "Operador",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral operacional do seu negócio
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Vendas Hoje"
          value="R$ 4.580,00"
          description="12 vendas realizadas"
          icon={ShoppingCart}
          trend={{ value: 12, positive: true }}
          variant="primary"
          onClick={() => navigate("/vendas")}
        />
        <StatCard
          title="Contas a Receber"
          value="R$ 15.240,00"
          description="8 títulos em aberto"
          icon={Receipt}
          trend={{ value: 5, positive: true }}
          variant="success"
          onClick={() => navigate("/recebimentos")}
        />
        <StatCard
          title="Contas a Pagar"
          value="R$ 8.920,00"
          description="5 títulos vencendo"
          icon={CreditCard}
          trend={{ value: 3, positive: false }}
          variant="warning"
          onClick={() => navigate("/pagamentos")}
        />
        <StatCard
          title="OS Abertas"
          value="7"
          description="2 em andamento"
          icon={ClipboardList}
          variant="info"
          onClick={() => navigate("/ordens-servico")}
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activities - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentActivities activities={mockActivities} />
        </div>

        {/* Financial Summary - Takes 1 column */}
        <div>
          <FinancialSummary
            balance={45280.5}
            income={28450.0}
            expenses={18320.0}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
