import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText } from "lucide-react";
import { NFEImpostos } from "./types";
import { formatCurrency } from "@/lib/formatters";

interface ImpostosCardProps {
  impostos: NFEImpostos;
  observacoes: {
    fiscal: string;
    complementar: string;
  };
}

export function ImpostosCard({ impostos, observacoes }: ImpostosCardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Impostos Totais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Base ICMS</p>
              <p className="font-medium">{formatCurrency(impostos.baseCalculoIcms)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ICMS</p>
              <p className="font-medium">{formatCurrency(impostos.icms)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Base ICMS ST</p>
              <p className="font-medium">{formatCurrency(impostos.baseCalculoIcmsSt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ICMS ST</p>
              <p className="font-medium">{formatCurrency(impostos.valorIcmsSt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">IPI</p>
              <p className="font-medium">{formatCurrency(impostos.ipi)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PIS</p>
              <p className="font-medium">{formatCurrency(impostos.pis)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">COFINS</p>
              <p className="font-medium">{formatCurrency(impostos.cofins)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(observacoes.fiscal || observacoes.complementar) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {observacoes.fiscal && (
              <div>
                <p className="font-medium text-muted-foreground">Informações ao Fisco:</p>
                <p className="whitespace-pre-wrap">{observacoes.fiscal}</p>
              </div>
            )}
            {observacoes.complementar && (
              <div>
                <p className="font-medium text-muted-foreground">Informações Complementares:</p>
                <p className="whitespace-pre-wrap">{observacoes.complementar}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
