import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialSummaryProps {
  balance: number;
  income: number;
  expenses: number;
}

export function FinancialSummary({ balance, income, expenses }: FinancialSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Resumo Financeiro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Saldo Atual */}
        <div className="flex items-center gap-4 rounded-lg bg-primary/10 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Saldo Atual</p>
            <p className={cn("text-2xl font-bold", balance >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Entradas e Saídas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <ArrowDownLeft className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entradas (mês)</p>
              <p className="text-lg font-semibold text-success">{formatCurrency(income)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <ArrowUpRight className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas (mês)</p>
              <p className="text-lg font-semibold text-destructive">{formatCurrency(expenses)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
