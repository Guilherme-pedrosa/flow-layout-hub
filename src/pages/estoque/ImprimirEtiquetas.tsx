import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Printer, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";

interface LabelItem {
  id: string;
  code: string;
  description: string;
  barcode?: string;
  quantity: number;
}

export default function ImprimirEtiquetas() {
  const { products, isLoading } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number }>>({});

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.filter(p => p.is_active);
    
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.is_active && (
        p.code.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
      )
    );
  }, [products, searchTerm]);

  const handleToggleItem = (productId: string) => {
    setSelectedItems(prev => {
      const current = prev[productId];
      if (current?.selected) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [productId]: { selected: true, quantity: 1 }
      };
    });
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: Math.max(1, quantity)
      }
    }));
  };

  const handleSelectAll = () => {
    const allSelected = filteredProducts.every(p => selectedItems[p.id]?.selected);
    if (allSelected) {
      setSelectedItems({});
    } else {
      const newSelection: Record<string, { selected: boolean; quantity: number }> = {};
      filteredProducts.forEach(p => {
        newSelection[p.id] = { selected: true, quantity: 1 };
      });
      setSelectedItems(newSelection);
    }
  };

  const handlePrint = () => {
    const selectedLabels = Object.entries(selectedItems)
      .filter(([_, sel]) => sel.selected)
      .map(([id, sel]) => {
        const product = products.find(p => p.id === id);
        if (!product) return null;
        return {
          id,
          code: product.code,
          description: product.description,
          barcode: product.barcode || undefined,
          quantity: sel.quantity,
        };
      })
      .filter(Boolean) as LabelItem[];

    if (selectedLabels.length === 0) return;

    const labelsHtml = selectedLabels.flatMap(item => {
      return Array(item.quantity).fill(null).map(() => generateLabelHtml(item));
    }).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas de Produtos</title>
        <style>
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .label {
            width: 50mm;
            height: 30mm;
            padding: 2mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
          }
          .label:last-child {
            page-break-after: avoid;
          }
          .product-name {
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 1mm;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 6pt;
            margin-bottom: 1mm;
          }
          .info-label {
            font-weight: bold;
          }
          .warehouse {
            font-size: 5pt;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 1mm;
          }
          .warehouse-label {
            font-weight: bold;
          }
          .barcode-container {
            text-align: center;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
          }
          .barcode-container svg {
            width: 100%;
            height: 10mm;
          }
          .code-text {
            font-size: 7pt;
            text-align: center;
            margin-top: 0.5mm;
          }
          @media print {
            .label {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          document.querySelectorAll('.barcode').forEach(el => {
            const code = el.getAttribute('data-code');
            if (code && window.JsBarcode) {
              JsBarcode(el, code, {
                format: "CODE128",
                width: 1.5,
                height: 30,
                displayValue: false,
                margin: 0
              });
            }
          });
          window.onload = function() { window.print(); }
        </script>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateLabelHtml = (item: LabelItem) => {
    const barcodeValue = item.barcode || item.code;
    
    return `
      <div class="label">
        <div class="product-name">${escapeHtml(item.description)}</div>
        <div class="info-row">
          <div>
            <span class="info-label">Código</span><br/>
            <span>${escapeHtml(item.code)}</span>
          </div>
          <div>
            <span class="info-label">EAN/Barcode</span><br/>
            <span>${escapeHtml(item.barcode || "-")}</span>
          </div>
        </div>
        <div class="warehouse">
          <span class="warehouse-label">Armazém</span><br/>
          Estoque Principal
        </div>
        <div class="barcode-container">
          <svg class="barcode" data-code="${escapeHtml(barcodeValue)}"></svg>
          <div class="code-text">${escapeHtml(barcodeValue)}</div>
        </div>
      </div>
    `;
  };

  const escapeHtml = (text: string) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  const totalLabels = Object.values(selectedItems)
    .filter(sel => sel.selected)
    .reduce((sum, sel) => sum + sel.quantity, 0);

  const selectedCount = Object.values(selectedItems).filter(sel => sel.selected).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imprimir Etiquetas"
        description="Selecione os produtos e imprima etiquetas no formato Pimaco 50x30mm"
        breadcrumbs={[{ label: "Estoque" }, { label: "Imprimir Etiquetas" }]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de produtos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <CardTitle className="text-lg">Produtos</CardTitle>
                <CardDescription>
                  Selecione os produtos para impressão de etiquetas
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando produtos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Nenhum produto encontrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tente ajustar o termo de busca.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                  <Checkbox
                    id="select-all"
                    checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedItems[p.id]?.selected)}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                    Selecionar todos ({filteredProducts.length} produtos)
                  </Label>
                </div>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {filteredProducts.map(product => {
                      const selection = selectedItems[product.id];
                      return (
                        <div 
                          key={product.id} 
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={`product-${product.id}`}
                            checked={selection?.selected || false}
                            onCheckedChange={() => handleToggleItem(product.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <Label 
                              htmlFor={`product-${product.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {product.code} - {product.description}
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                              {product.barcode && (
                                <Badge variant="outline" className="text-xs">
                                  EAN: {product.barcode}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Estoque: {product.quantity ?? 0} {product.unit}
                              </span>
                            </div>
                          </div>
                          {selection?.selected && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Qtd:</Label>
                              <Input
                                type="number"
                                min={1}
                                value={selection.quantity}
                                onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                                className="w-16 h-8 text-center"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        {/* Resumo da impressão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Resumo
            </CardTitle>
            <CardDescription>
              Revise a seleção antes de imprimir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Produtos selecionados:</span>
                <span className="font-medium">{selectedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total de etiquetas:</span>
                <span className="font-medium">{totalLabels}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tamanho:</span>
                <span className="font-medium">50 x 30 mm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Formato:</span>
                <span className="font-medium">Pimaco</span>
              </div>
            </div>

            {selectedCount > 0 && (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {Object.entries(selectedItems)
                    .filter(([_, sel]) => sel.selected)
                    .map(([id, sel]) => {
                      const product = products.find(p => p.id === id);
                      if (!product) return null;
                      return (
                        <div key={id} className="flex justify-between items-center text-sm p-2 bg-background rounded border">
                          <span className="truncate flex-1 mr-2">{product.code}</span>
                          <Badge variant="secondary">{sel.quantity}x</Badge>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            )}

            <Button 
              className="w-full" 
              size="lg"
              onClick={handlePrint} 
              disabled={totalLabels === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir {totalLabels} Etiqueta{totalLabels !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
