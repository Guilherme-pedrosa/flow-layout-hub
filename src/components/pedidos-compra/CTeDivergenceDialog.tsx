import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Truck, ArrowRight } from "lucide-react";

export interface CTeComparisonResult {
  orderFreightValue: number;
  cteFreightValue: number;
  difference: number;
  hasDivergence: boolean;
  cteData: {
    numero: string;
    chave: string;
    data: string;
    transportadora: string;
  };
}

interface CTeDivergenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparison: CTeComparisonResult | null;
  onApplyChange: (applyFreight: boolean) => void;
  onCancel: () => void;
  /** Indica se o pedido está no fluxo de aprovação (verificado pelos limites configurados) */
  isInApprovalFlow: boolean;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function CTeDivergenceDialog({
  open,
  onOpenChange,
  comparison,
  onApplyChange,
  onCancel,
  isInApprovalFlow,
}: CTeDivergenceDialogProps) {
  const [applyFreight, setApplyFreight] = useState(true);

  if (!comparison) return null;

  const { orderFreightValue, cteFreightValue, difference, hasDivergence, cteData } = comparison;

  const handleApply = () => {
    onApplyChange(applyFreight);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {hasDivergence ? "Divergência de Frete - CT-e" : "CT-e Importado"}
          </DialogTitle>
          <DialogDescription>
            CT-e {cteData.numero} - {cteData.transportadora}
          </DialogDescription>
        </DialogHeader>

        {isInApprovalFlow && hasDivergence && (
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: Pedido no fluxo de aprovação</AlertTitle>
            <AlertDescription>
              Alterar o frete irá marcar o pedido para <strong>reaprovação</strong>.
            </AlertDescription>
          </Alert>
        )}

        {hasDivergence ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                O valor do frete no CT-e é diferente do valor informado no pedido.
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 items-center text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Frete no Pedido</p>
                  <p className="text-lg font-semibold">{formatCurrency(orderFreightValue)}</p>
                </div>
                <ArrowRight className="h-6 w-6 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-sm text-muted-foreground">Frete no CT-e</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(cteFreightValue)}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <Badge variant={difference > 0 ? "default" : "destructive"} className="text-base">
                  Diferença: {difference > 0 ? "+" : ""}
                  {formatCurrency(difference)}
                </Badge>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="apply-freight"
                  checked={applyFreight}
                  onCheckedChange={(checked) => setApplyFreight(checked === true)}
                />
                <label htmlFor="apply-freight" className="text-sm cursor-pointer">
                  Aplicar valor do CT-e ({formatCurrency(cteFreightValue)}) ao pedido
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">Valor do Frete</p>
              <p className="text-2xl font-semibold text-green-600">
                {formatCurrency(cteFreightValue)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                O valor do frete corresponde ao informado no pedido.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            {hasDivergence
              ? applyFreight
                ? "Aplicar Alteração"
                : "Manter Valor do Pedido"
              : "Confirmar Importação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
