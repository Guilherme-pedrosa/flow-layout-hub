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
import { CreditCard, Calendar } from "lucide-react";
import { Parcela } from "./types";
import { formatCurrency } from "@/lib/formatters";

interface FinanceiroCardProps {
  formaPagamento: string;
  parcelas: Parcela[];
  valorTotal: number;
}

export function FinanceiroCard({ formaPagamento, parcelas, valorTotal }: FinanceiroCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

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
          <span className="text-sm font-medium">Forma de Pagamento:</span>
          <Badge variant="secondary">{formaPagamento || "Não informado"}</Badge>
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
