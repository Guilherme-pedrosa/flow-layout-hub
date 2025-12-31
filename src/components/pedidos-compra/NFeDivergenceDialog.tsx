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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export interface NFeDivergence {
  id: string;
  type: "header" | "item" | "item_extra" | "item_missing";
  field: string;
  label: string;
  orderValue: string | number | null;
  nfeValue: string | number | null;
  difference?: number;
  itemIndex?: number;
  itemDescription?: string;
  xmlCode?: string;
}

export interface NFeComparisonResult {
  supplierMatch: boolean;
  orderSupplierCnpj: string;
  orderSupplierName: string;
  nfeSupplierCnpj: string;
  nfeSupplierName: string;
  divergences: NFeDivergence[];
  nfeData: any;
}

interface NFeDivergenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparison: NFeComparisonResult | null;
  onApplyChanges: (selectedDivergences: string[]) => void;
  onCancel: () => void;
  requiresReapproval: boolean;
  orderTotalAmount?: number; // Valor total do pedido para lógica de alçada
}

// Constante para alçada de aprovação
const APPROVAL_THRESHOLD = 5000; // R$ 5.000,00

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatValue = (value: string | number | null | undefined) => {
  if (value == null || value === "") return "N/A";
  if (typeof value === "number") {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }
  return value;
};

export function NFeDivergenceDialog({
  open,
  onOpenChange,
  comparison,
  onApplyChanges,
  onCancel,
  requiresReapproval,
  orderTotalAmount = 0,
}: NFeDivergenceDialogProps) {
  const [selectedDivergences, setSelectedDivergences] = useState<Set<string>>(new Set());

  if (!comparison) return null;

  const { supplierMatch, divergences, orderSupplierName, nfeSupplierName } = comparison;

  const headerDivergences = divergences.filter((d) => d.type === "header");
  const itemDivergences = divergences.filter((d) => d.type === "item");
  const extraItems = divergences.filter((d) => d.type === "item_extra");
  const missingItems = divergences.filter((d) => d.type === "item_missing");

  const hasDivergences = divergences.length > 0;
  
  // Lógica de alçada: só exige reaprovação se há divergências E valor > R$ 5.000,00
  const effectiveRequiresReapproval = requiresReapproval && hasDivergences && orderTotalAmount > APPROVAL_THRESHOLD;
  
  // Para pedidos <= R$ 5.000,00 com divergências, permite correção sem reaprovação
  const allowsCorrectionWithoutReapproval = hasDivergences && orderTotalAmount <= APPROVAL_THRESHOLD;

  const toggleDivergence = (id: string) => {
    const newSet = new Set(selectedDivergences);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDivergences(newSet);
  };

  const toggleAll = (ids: string[]) => {
    const allSelected = ids.every((id) => selectedDivergences.has(id));
    const newSet = new Set(selectedDivergences);
    if (allSelected) {
      ids.forEach((id) => newSet.delete(id));
    } else {
      ids.forEach((id) => newSet.add(id));
    }
    setSelectedDivergences(newSet);
  };

  const handleApply = () => {
    onApplyChanges(Array.from(selectedDivergences));
  };

  // If supplier doesn't match, show blocking error
  if (!supplierMatch) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Fornecedor Incompatível
            </DialogTitle>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro: Esta NF-e não pertence a este pedido</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                O fornecedor da NF-e (<strong>{nfeSupplierName}</strong>) é diferente do
                fornecedor do pedido (<strong>{orderSupplierName}</strong>).
              </p>
              <p className="text-sm">
                Esta nota fiscal não pode ser importada para este pedido de compra.
              </p>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasDivergences ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Relatório de Divergências
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                NF-e Compatível
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasDivergences
              ? "Foram encontradas divergências entre o pedido e a NF-e. Selecione quais alterações deseja aplicar ao pedido."
              : "Não foram encontradas divergências entre o pedido e a NF-e."}
          </DialogDescription>
        </DialogHeader>

        {effectiveRequiresReapproval && (
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção: Pedido já aprovado (acima de R$ 5.000)</AlertTitle>
            <AlertDescription>
              Qualquer alteração aplicada ao pedido irá marcá-lo para <strong>reaprovação</strong>.
              Recebimento, estoque e financeiro ficarão bloqueados até a aprovação.
            </AlertDescription>
          </Alert>
        )}
        
        {allowsCorrectionWithoutReapproval && requiresReapproval && (
          <Alert className="border-green-500 bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Correção permitida sem reaprovação</AlertTitle>
            <AlertDescription>
              Como o pedido é de até R$ 5.000,00, você pode corrigir os dados para corresponder ao XML 
              sem necessidade de reaprovação. Selecione as divergências que deseja aplicar.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Header Divergences */}
            {headerDivergences.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Divergências do Cabeçalho</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAll(headerDivergences.map((d) => d.id))}
                  >
                    {headerDivergences.every((d) => selectedDivergences.has(d.id))
                      ? "Desmarcar Todos"
                      : "Marcar Todos"}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Aplicar</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Valor no Pedido</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Valor na NF-e</TableHead>
                      <TableHead>Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {headerDivergences.map((div) => (
                      <TableRow key={div.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDivergences.has(div.id)}
                            onCheckedChange={() => toggleDivergence(div.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{div.label}</TableCell>
                        <TableCell>
                          {div.field.includes("valor") || div.field.includes("total")
                            ? formatCurrency(div.orderValue as number)
                            : formatValue(div.orderValue)}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {div.field.includes("valor") || div.field.includes("total")
                            ? formatCurrency(div.nfeValue as number)
                            : formatValue(div.nfeValue)}
                        </TableCell>
                        <TableCell>
                          {div.difference != null && (
                            <Badge variant={div.difference > 0 ? "default" : "destructive"}>
                              {div.difference > 0 ? "+" : ""}
                              {formatCurrency(div.difference)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Item Divergences */}
            {itemDivergences.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Divergências nos Itens</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAll(itemDivergences.map((d) => d.id))}
                  >
                    {itemDivergences.every((d) => selectedDivergences.has(d.id))
                      ? "Desmarcar Todos"
                      : "Marcar Todos"}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Aplicar</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead>Valor no Pedido</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Valor na NF-e</TableHead>
                      <TableHead>Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemDivergences.map((div) => (
                      <TableRow key={div.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDivergences.has(div.id)}
                            onCheckedChange={() => toggleDivergence(div.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{div.xmlCode}</span>
                            <p className="text-muted-foreground text-xs truncate max-w-[200px]">
                              {div.itemDescription}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{div.label}</TableCell>
                        <TableCell>
                          {div.field.includes("valor") || div.field.includes("preco")
                            ? formatCurrency(div.orderValue as number)
                            : formatValue(div.orderValue)}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {div.field.includes("valor") || div.field.includes("preco")
                            ? formatCurrency(div.nfeValue as number)
                            : formatValue(div.nfeValue)}
                        </TableCell>
                        <TableCell>
                          {div.difference != null && (
                            <Badge variant={div.difference > 0 ? "default" : "destructive"}>
                              {div.difference > 0 ? "+" : ""}
                              {div.field.includes("valor") || div.field.includes("preco")
                                ? formatCurrency(div.difference)
                                : div.difference.toLocaleString("pt-BR")}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Extra Items (in NF-e but not in order) */}
            {extraItems.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Itens na NF-e ausentes no Pedido</h4>
                  <Badge variant="outline">{extraItems.length}</Badge>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Estes itens estão na NF-e mas não foram encontrados no pedido original.
                    Selecione para adicioná-los ao pedido.
                  </AlertDescription>
                </Alert>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Adicionar</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extraItems.map((div) => (
                      <TableRow key={div.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDivergences.has(div.id)}
                            onCheckedChange={() => toggleDivergence(div.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{div.xmlCode}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {div.itemDescription}
                        </TableCell>
                        <TableCell>{formatValue(div.orderValue)}</TableCell>
                        <TableCell>{formatCurrency(div.nfeValue as number)}</TableCell>
                        <TableCell>{formatCurrency(div.difference)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Missing Items (in order but not in NF-e) */}
            {missingItems.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-destructive">Itens do Pedido ausentes na NF-e</h4>
                  <Badge variant="destructive">{missingItems.length}</Badge>
                </div>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Estes itens estão no pedido mas não foram encontrados na NF-e.
                    Verifique se a nota está correta.
                  </AlertDescription>
                </Alert>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Qtd Pedido</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingItems.map((div) => (
                      <TableRow key={div.id} className="bg-destructive/5">
                        <TableCell className="font-medium">{div.xmlCode || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {div.itemDescription}
                        </TableCell>
                        <TableCell>{formatValue(div.orderValue)}</TableCell>
                        <TableCell>{formatCurrency(div.nfeValue as number)}</TableCell>
                        <TableCell>{formatCurrency(div.difference)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!hasDivergences && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">Tudo certo!</p>
                <p className="text-muted-foreground">
                  Os dados do pedido correspondem aos dados da NF-e.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar Importação
          </Button>
          <Button onClick={handleApply} disabled={!hasDivergences && false}>
            {hasDivergences ? (
              <>
                {selectedDivergences.size > 0
                  ? `Aplicar ${selectedDivergences.size} Alteração(ões)`
                  : "Manter Valores do Pedido"}
              </>
            ) : (
              "Confirmar Importação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
