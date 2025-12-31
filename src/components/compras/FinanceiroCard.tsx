import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Calendar, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { Parcela } from "./types";
import { formatCurrency } from "@/lib/formatters";
import { useChartOfAccounts, useCostCenters } from "@/hooks/useFinanceiro";
import { useEffect, useMemo } from "react";

const FORMAS_PAGAMENTO = [
  { value: "boleto", label: "Boleto Bancário" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cheque", label: "Cheque" },
  { value: "deposito", label: "Depósito" },
  { value: "outros", label: "Outros" },
];

// Helper para calcular status de vencimento
function getDueDateStatus(dateStr: string): { status: 'overdue' | 'warning' | 'ok'; message: string; daysUntil: number } {
  if (!dateStr) return { status: 'ok', message: '', daysUntil: 999 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dateStr);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) {
    return { 
      status: 'overdue', 
      message: `⚠️ VENCIDO há ${Math.abs(daysUntil)} dia(s)! Renegocie com o fornecedor.`, 
      daysUntil 
    };
  } else if (daysUntil <= 30) {
    return { 
      status: 'warning', 
      message: `⚡ Vence em ${daysUntil} dia(s). Considere melhorar as condições comerciais.`, 
      daysUntil 
    };
  } else {
    return { 
      status: 'ok', 
      message: `✓ Vencimento em ${daysUntil} dias - prazo adequado.`, 
      daysUntil 
    };
  }
}

interface FinanceiroCardProps {
  formaPagamento: string;
  parcelas: Parcela[];
  valorTotal: number;
  observacao?: string;
  planoContasId?: string;
  centroCustoId?: string;
  formaPagamentoSelecionada?: string;
  onObservacaoChange?: (value: string) => void;
  onPlanoContasChange?: (value: string) => void;
  onCentroCustoChange?: (value: string) => void;
  onFormaPagamentoChange?: (value: string) => void;
}

export function FinanceiroCard({ 
  formaPagamento, 
  parcelas, 
  valorTotal,
  observacao = "",
  planoContasId = "",
  centroCustoId = "",
  formaPagamentoSelecionada = "",
  onObservacaoChange,
  onPlanoContasChange,
  onCentroCustoChange,
  onFormaPagamentoChange,
}: FinanceiroCardProps) {
  const { accounts, fetchAccounts, loading: loadingAccounts } = useChartOfAccounts();
  const { costCenters, fetchCostCenters, loading: loadingCostCenters } = useCostCenters();

  useEffect(() => {
    fetchAccounts();
    fetchCostCenters();
  }, [fetchAccounts, fetchCostCenters]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // Verificar se há parcelas vencidas ou próximas do vencimento
  const parcelasStatus = useMemo(() => {
    return parcelas.map(p => ({
      ...p,
      dueDateStatus: getDueDateStatus(p.dataVencimento)
    }));
  }, [parcelas]);

  const hasOverdue = parcelasStatus.some(p => p.dueDateStatus.status === 'overdue');
  const hasWarning = parcelasStatus.some(p => p.dueDateStatus.status === 'warning');

  // Filtrar apenas contas de despesa analíticas para notas de compra
  const contasDespesa = accounts.filter(acc => 
    acc.type === 'despesa' && 
    acc.is_active && 
    acc.account_nature === 'analitica'
  );
  const centrosAtivos = costCenters.filter(cc => cc.is_active);

  const getRowClassName = (status: 'overdue' | 'warning' | 'ok') => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 border-l-4 border-l-amber-500';
      case 'ok':
        return 'bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-500';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: 'overdue' | 'warning' | 'ok') => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Financeiro
          {hasOverdue && (
            <Badge variant="destructive" className="ml-2">
              <AlertCircle className="h-3 w-3 mr-1" />
              Parcelas Vencidas
            </Badge>
          )}
          {!hasOverdue && hasWarning && (
            <Badge variant="outline" className="ml-2 border-amber-500 text-amber-600 bg-amber-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Prazo Curto
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasOverdue && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção!</strong> Uma ou mais parcelas já estão vencidas. Renegocie as condições com o fornecedor antes de prosseguir.
            </AlertDescription>
          </Alert>
        )}

        {!hasOverdue && hasWarning && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              <strong>Condições comerciais ruins!</strong> Parcelas com vencimento em menos de 30 dias. Considere negociar prazos melhores.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Forma de Pagamento (NF):</span>
          <Badge variant="secondary">{formaPagamento || "Não informado"}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select 
              value={formaPagamentoSelecionada} 
              onValueChange={onFormaPagamentoChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <SelectItem key={forma.value} value={forma.value}>
                    {forma.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Plano de Contas <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={planoContasId} 
              onValueChange={onPlanoContasChange}
              disabled={loadingAccounts}
            >
              <SelectTrigger className={!planoContasId ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingAccounts ? "Carregando..." : "Selecione..."} />
              </SelectTrigger>
              <SelectContent>
                {contasDespesa.length === 0 && !loadingAccounts && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhuma conta de despesa cadastrada
                  </div>
                )}
                {contasDespesa.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.code} - {conta.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!planoContasId && !loadingAccounts && (
              <p className="text-xs text-destructive">Obrigatório para categorização</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Centro de Custo <span className="text-destructive">*</span>
            </Label>
            <Select 
              value={centroCustoId} 
              onValueChange={onCentroCustoChange}
              disabled={loadingCostCenters}
            >
              <SelectTrigger className={!centroCustoId ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingCostCenters ? "Carregando..." : "Selecione..."} />
              </SelectTrigger>
              <SelectContent>
                {centrosAtivos.length === 0 && !loadingCostCenters && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum centro de custo cadastrado
                  </div>
                )}
                {centrosAtivos.map((centro) => (
                  <SelectItem key={centro.id} value={centro.id}>
                    {centro.code} - {centro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!centroCustoId && !loadingCostCenters && (
              <p className="text-xs text-destructive">Obrigatório para controle financeiro</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observações Financeiras</Label>
          <Textarea
            placeholder="Adicione observações sobre o pagamento..."
            value={observacao}
            onChange={(e) => onObservacaoChange?.(e.target.value)}
            rows={2}
          />
        </div>

        {parcelas.length > 0 ? (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Parcelas ({parcelas.length})
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Nº</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-12">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasStatus.map((parcela, index) => (
                  <TableRow key={index} className={getRowClassName(parcela.dueDateStatus.status)}>
                    <TableCell className="font-medium">{parcela.numero || index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatDate(parcela.dataVencimento)}
                        {parcela.dueDateStatus.status === 'overdue' && (
                          <Badge variant="destructive" className="text-[10px] px-1">
                            Vencido
                          </Badge>
                        )}
                        {parcela.dueDateStatus.status === 'warning' && (
                          <Badge variant="outline" className="text-[10px] px-1 border-amber-500 text-amber-600">
                            {parcela.dueDateStatus.daysUntil}d
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(parcela.valor)}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            {getStatusIcon(parcela.dueDateStatus.status)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p>{parcela.dueDateStatus.message}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>Pagamento à vista ou parcelas não informadas na nota.</p>
            <p className="mt-1 font-medium">Valor Total: {formatCurrency(valorTotal)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}