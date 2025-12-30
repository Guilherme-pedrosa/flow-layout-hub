import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  User,
  XCircle,
} from "lucide-react";
import { Sale } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIBanner } from "@/components/shared";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface NFeValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  onConfirm: () => Promise<void>;
  isEmitting: boolean;
}

/**
 * Dialog de Validação de NF-e
 * Conforme WeDo ERP Spec - Prompt 2.1
 * 
 * Validação ANTES da emissão:
 * - Valida dados obrigatórios do cliente (CPF/CNPJ, endereço, IE)
 * - Valida produtos (NCM, CFOP, CST)
 * - Valida valores e impostos
 * - Exibe warnings e sugestões
 * - NUNCA emite automaticamente sem confirmação
 */
export function NFeValidationDialog({
  open,
  onOpenChange,
  sale,
  onConfirm,
  isEmitting,
}: NFeValidationDialogProps) {
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [productItems, setProductItems] = useState<any[]>([]);

  useEffect(() => {
    if (open && sale) {
      validateSale();
    }
  }, [open, sale]);

  const validateSale = async () => {
    if (!sale) return;

    setValidating(true);
    setValidation(null);

    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // 1. Buscar itens da venda
      const { data: items } = await supabase
        .from("sale_product_items")
        .select(`
          *,
          product:products(id, code, description, ncm, cest, origin)
        `)
        .eq("sale_id", sale.id);

      setProductItems(items || []);

      // 2. Validar cliente
      if (sale.client) {
        if (!sale.client.cpf_cnpj) {
          errors.push("Cliente sem CPF/CNPJ cadastrado");
        }
        
        // Buscar dados completos do cliente
        const { data: clientData } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", sale.client.id)
          .single();

        if (clientData) {
          if (!clientData.logradouro) {
            errors.push("Cliente sem endereço cadastrado");
          }
          if (!clientData.cidade || !clientData.estado) {
            errors.push("Cliente sem cidade/estado cadastrado");
          }
          if (!clientData.cep) {
            warnings.push("Cliente sem CEP cadastrado");
          }
          if (clientData.tipo_pessoa === 'PJ' && !clientData.inscricao_estadual) {
            warnings.push("Pessoa jurídica sem Inscrição Estadual");
          }
        }
      } else {
        // Consumidor final
        warnings.push("Venda sem cliente identificado - será emitida como Consumidor Final");
      }

      // 3. Validar produtos
      if (!items || items.length === 0) {
        errors.push("Venda sem produtos para emitir NF-e");
      } else {
        for (const item of items) {
          const product = item.product as { id: string; code: string; description: string; ncm: string | null; cest: string | null; origin: string | null } | null;
          if (!product) {
            errors.push(`Item sem produto vinculado`);
            continue;
          }

          if (!product.ncm || product.ncm.length < 8) {
            errors.push(`Produto "${product.description}" sem NCM válido`);
          }
          if (!product.origin && product.origin !== '0') {
            warnings.push(`Produto "${product.description}" sem origem definida`);
          }
        }
      }

      // 4. Validar valores
      if (sale.total_value <= 0) {
        errors.push("Valor total da venda deve ser maior que zero");
      }
      if (sale.products_total <= 0 && items && items.length > 0) {
        errors.push("Soma dos produtos não confere com total");
      }

      // 5. Sugestões
      if (errors.length === 0 && warnings.length === 0) {
        suggestions.push("Todos os dados estão corretos para emissão");
      }
      if (errors.length > 0) {
        suggestions.push("Corrija os erros antes de emitir a NF-e");
      }
      if (warnings.length > 0 && errors.length === 0) {
        suggestions.push("Verifique os avisos antes de continuar");
      }

      setValidation({
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      });
    } catch (error) {
      console.error("Erro na validação:", error);
      setValidation({
        isValid: false,
        errors: ["Erro ao validar dados da venda"],
        warnings: [],
        suggestions: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleConfirm = async () => {
    if (!validation?.isValid) {
      toast.error("Corrija os erros antes de emitir");
      return;
    }

    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Validação para Emissão de NF-e
          </DialogTitle>
          <DialogDescription>
            Venda #{sale.sale_number} - Verifique os dados antes de enviar para a SEFAZ
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* AI Banner */}
            <AIBanner
              insights={[{
                id: 'nfe-validation',
                message: 'A validação prévia evita rejeições na SEFAZ. Uma vez autorizada, a NF-e só pode ser cancelada em até 24 horas.',
                type: 'warning'
              }]}
            />

            {/* Resumo da Venda */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Resumo da Venda</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium">
                      {sale.client?.razao_social || sale.client?.nome_fantasia || 'Consumidor Final'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">CPF/CNPJ</p>
                  <p className="font-medium font-mono">
                    {sale.client?.cpf_cnpj || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total de Produtos</p>
                  <p className="font-medium">{formatCurrency(sale.products_total)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Total</p>
                  <p className="font-bold text-primary">{formatCurrency(sale.total_value)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Status da Validação */}
            {validating ? (
              <Card>
                <CardContent className="py-8 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="text-muted-foreground">Validando dados da venda...</p>
                </CardContent>
              </Card>
            ) : validation ? (
              <>
                {/* Erros */}
                {validation.errors.length > 0 && (
                  <Card className="border-red-500">
                    <CardHeader className="py-3 bg-red-50 dark:bg-red-950/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        Erros ({validation.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <ul className="space-y-2">
                        {validation.errors.map((error, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Avisos */}
                {validation.warnings.length > 0 && (
                  <Card className="border-amber-500">
                    <CardHeader className="py-3 bg-amber-50 dark:bg-amber-950/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        Avisos ({validation.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <ul className="space-y-2">
                        {validation.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Sucesso */}
                {validation.isValid && (
                  <Card className="border-green-500">
                    <CardHeader className="py-3 bg-green-50 dark:bg-green-950/30">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Validação Concluída
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-3">
                      <p className="text-sm text-muted-foreground">
                        {validation.warnings.length > 0
                          ? "A venda pode ser emitida, mas verifique os avisos acima."
                          : "Todos os dados estão corretos para emissão da NF-e."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Produtos */}
                {productItems.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Produtos ({productItems.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-2 text-xs">
                        {productItems.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 border-b last:border-0">
                            <div className="flex-1">
                              <span className="font-medium">{item.product?.description || 'Produto'}</span>
                              <div className="text-muted-foreground">
                                NCM: {item.product?.ncm || '–'} | CFOP: {item.product?.cfop || '–'}
                              </div>
                            </div>
                            <div className="text-right">
                              <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                              <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                            </div>
                          </div>
                        ))}
                        {productItems.length > 5 && (
                          <p className="text-muted-foreground text-center py-2">
                            + {productItems.length - 5} produtos
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={validating || isEmitting || !validation?.isValid}
            className="bg-green-600 hover:bg-green-700"
          >
            {isEmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Emitindo...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirmar e Emitir NF-e
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}