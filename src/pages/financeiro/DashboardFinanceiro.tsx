import { useNavigate } from "react-router-dom";
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  TrendingUp,
  Bot,
  ArrowRight,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  Landmark
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

// Mock data for charts
const cashFlowData = [
  { date: "05 Mai", value: 25000 },
  { date: "10 Mai", value: 32000 },
  { date: "15 Mai", value: 28000 },
  { date: "20 Mai", value: 35000 },
  { date: "25 Mai", value: 42000 },
  { date: "30 Mai", value: 45230 },
];

const categoriesData = [
  { name: "Fornecedores", value: 35, color: "hsl(217, 91%, 55%)" },
  { name: "Salários", value: 30, color: "hsl(160, 84%, 39%)" },
  { name: "Serviços", value: 20, color: "hsl(45, 93%, 47%)" },
  { name: "Impostos", value: 15, color: "hsl(271, 91%, 65%)" },
];

const monthlyEvolutionData = [
  { month: "Jan", receitas: 45000, despesas: 38000 },
  { month: "Fev", receitas: 52000, despesas: 41000 },
  { month: "Mar", receitas: 48000, despesas: 39000 },
  { month: "Abr", receitas: 58000, despesas: 45000 },
  { month: "Mai", receitas: 55000, despesas: 42000 },
  { month: "Jun", receitas: 62000, despesas: 48000 },
];

const bankAccounts = [
  { 
    name: "Banco do Brasil", 
    type: "Conta Corrente", 
    balance: 25000, 
    icon: "🏦",
    color: "bg-yellow-500/10 text-yellow-600"
  },
  { 
    name: "Itaú", 
    type: "Conta Investimento", 
    balance: 18200, 
    icon: "🏛️",
    color: "bg-orange-500/10 text-orange-600"
  },
  { 
    name: "Nubank", 
    type: "Conta Digital", 
    balance: 2030, 
    icon: "💳",
    color: "bg-purple-500/10 text-purple-600"
  },
];

const upcomingPayments = [
  { date: "05/06/2024", description: "Pagamento Fornecedor ABC Ltda.", value: 1500, status: "em_dia" },
  { date: "07/06/2024", description: "Serviços de TI - Cloud", value: 450, status: "a_vencer" },
  { date: "10/06/2024", description: "Aluguel do Escritório", value: 3200, status: "a_vencer" },
  { date: "12/06/2024", description: "Assinatura Software XYZ", value: 280, status: "a_vencer" },
  { date: "15/06/2024", description: "Taxas Bancárias", value: 120, status: "atrasado" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const DashboardFinanceiro = () => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "em_dia":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Em dia</Badge>;
      case "a_vencer":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">A vencer</Badge>;
      case "atrasado":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Atrasado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Visão geral financeira do seu negócio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/extrato-bancario")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Ver Extrato
          </Button>
          <Button variant="outline" onClick={() => navigate("/conciliacao")}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Conciliação
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => navigate("/bancos")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
                <p className="text-2xl font-bold tracking-tight">R$ 45.230,00</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +2.5%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => navigate("/contas-receber")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <ArrowDownToLine className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">A Receber</p>
                <p className="text-2xl font-bold tracking-tight">R$ 12.500,00</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +1.8%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={() => navigate("/contas-pagar")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <ArrowUpFromLine className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">A Pagar</p>
                <p className="text-2xl font-bold tracking-tight">R$ 8.750,00</p>
                <p className="text-xs text-destructive flex items-center gap-1">
                  ↓ -0.9%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold tracking-tight text-destructive">R$ 2.100,00</p>
                <p className="text-xs text-destructive font-medium">Urgente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Banner */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">IA prevê déficit de R$ 5.000 na próxima semana</p>
                <p className="text-sm opacity-80">Sugestão: Considere antecipar recebíveis</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              Ver análise completa
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>Fluxo de Caixa</span>
              <Badge variant="outline" className="font-normal">Últimos 30 dias</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Saldo"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>Contas Bancárias</span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/bancos")}>
                Ver todas
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bankAccounts.map((account, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate("/extrato-bancario")}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${account.color}`}>
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{account.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatCurrency(account.balance)}</p>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                    Ver Extrato
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Categories Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Contas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, "Percentual"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoriesData.map((category, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-xs text-muted-foreground">{category.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Evolution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value)]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Upcoming Payments */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <Clock className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium">3 contas vencendo hoje</p>
                <p className="text-xs text-muted-foreground">Total: R$ 2.450,00</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <Clock className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium">5 pagamentos agendados</p>
                <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle className="h-4 w-4 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium">8 recebimentos previstos</p>
                <p className="text-xs text-muted-foreground">Total: R$ 12.500,00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>Próximos Vencimentos</span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/contas-pagar")}>
                Ver todos
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground w-20">{payment.date}</div>
                    <div className="text-sm font-medium">{payment.description}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">{formatCurrency(payment.value)}</span>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/contas-pagar")}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-sm">Nova Conta a Pagar</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/contas-receber")}
            >
              <Plus className="h-5 w-5 text-success" />
              <span className="text-sm">Nova Conta a Receber</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/extrato-bancario")}
            >
              <FileSpreadsheet className="h-5 w-5 text-info" />
              <span className="text-sm">Ver Extrato</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate("/conciliacao")}
            >
              <RefreshCw className="h-5 w-5 text-warning" />
              <span className="text-sm">Conciliação</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardFinanceiro;
