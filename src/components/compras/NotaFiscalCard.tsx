import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { NFENota } from "./types";
import { formatCurrency } from "@/lib/formatters";

interface NotaFiscalCardProps {
  nota: NFENota;
}

export function NotaFiscalCard({ nota }: NotaFiscalCardProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Nota Fiscal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span><strong>Número:</strong> {nota.numero}</span>
          <Badge variant="secondary">Série {nota.serie}</Badge>
        </div>
        <p><strong>Data Emissão:</strong> {formatDate(nota.dataEmissao)}</p>
        {nota.chaveAcesso && (
          <p className="text-xs font-mono text-muted-foreground break-all">
            <strong>Chave:</strong> {nota.chaveAcesso}
          </p>
        )}
        <div className="border-t pt-2 mt-2 space-y-1">
          <p><strong>Valor Produtos:</strong> {formatCurrency(nota.valorProdutos)}</p>
          {nota.valorFrete > 0 && (
            <p><strong>Frete:</strong> {formatCurrency(nota.valorFrete)}</p>
          )}
          {nota.valorSeguro > 0 && (
            <p><strong>Seguro:</strong> {formatCurrency(nota.valorSeguro)}</p>
          )}
          {nota.valorDesconto > 0 && (
            <p><strong>Desconto:</strong> {formatCurrency(nota.valorDesconto)}</p>
          )}
          {nota.valorOutros > 0 && (
            <p><strong>Outros:</strong> {formatCurrency(nota.valorOutros)}</p>
          )}
          <p className="text-base font-bold pt-1">
            <strong>Total NF:</strong> {formatCurrency(nota.valorTotal)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
