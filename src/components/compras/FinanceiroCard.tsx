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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CreditCard, Calendar } from "lucide-react";
import { Parcela } from "./types";
import { formatCurrency } from "@/lib/formatters";
import { useChartOfAccounts, useCostCenters, ChartOfAccount, CostCenter } from "@/hooks/useFinanceiro";
import { useEffect } from "react";

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

  // Filtrar apenas contas de despesa para notas de compra
  const contasDespesa = accounts.filter(acc => acc.type === 'despesa' && acc.is_active);
  const centrosAtivos = costCenters.filter(cc => cc.is_active);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Label>Plano de Contas</Label>
            <Select 
              value={planoContasId} 
              onValueChange={onPlanoContasChange}
              disabled={loadingAccounts}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingAccounts ? "Carregando..." : "Selecione..."} />
              </SelectTrigger>
              <SelectContent>
                {contasDespesa.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.code} - {conta.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Centro de Custo</Label>
            <Select 
              value={centroCustoId} 
              onValueChange={onCentroCustoChange}
              disabled={loadingCostCenters}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCostCenters ? "Carregando..." : "Selecione..."} />
              </SelectTrigger>
              <SelectContent>
                {centrosAtivos.map((centro) => (
                  <SelectItem key={centro.id} value={centro.id}>
                    {centro.code} - {centro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelas.map((parcela, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{parcela.numero || index + 1}</TableCell>
                    <TableCell>{formatDate(parcela.dataVencimento)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(parcela.valor)}</TableCell>
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
