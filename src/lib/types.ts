// Representa um KPI individual
export interface KpiData {
  id: string;
  title: string;
  value: number;
  previousValue: number; // Para calcular a variação
  format: 'currency' | 'number' | 'percentage';
  icon: 'dollar' | 'cart' | 'alert' | 'box';
  trend: 'up' | 'down' | 'neutral';
  href?: string; // Link opcional para navegação ao clicar
}

// Dados para os gráficos de barras/linha
export interface ChartDataPoint {
  date: string; // Formato 'YYYY-MM-DD'
  label: string; // Formato legível 'DD/MM'
  value: number;
}

// Tarefa individual na lista de tarefas
export interface Task {
  id: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  createdAt: string;
}

// Insight gerado pela IA
export interface AiInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  confidence: number; // 0-100
  action: {
    label: string;
    href: string;
  };
  createdAt: string;
}

// Estado de loading/error para queries
export interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
