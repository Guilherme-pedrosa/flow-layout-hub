import { useState, useMemo, useRef } from "react";
import { useProducts } from "@/hooks/useProducts";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Search, Printer, Tag, Plus, Minus, X } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import JsBarcode from "jsbarcode";

interface SelectedProduct {
  id: string;
  code: string;
  description: string;
  barcode: string | null;
  sale_price: number;
  quantity: number;
}

type LabelSize = 'small' | 'medium' | 'large';

interface LabelConfig {
  showName: boolean;
  showCode: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  size: LabelSize;
}

export default function Etiquetas() {
  const { products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [config, setConfig] = useState<LabelConfig>({
    showName: true,
    showCode: true,
    showPrice: true,
    showBarcode: true,
    size: 'medium',
  });
  const printRef = useRef<HTMLDivElement>(null);

  // Filtrar produtos para seleção
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.is_active)
      .filter(p =>
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search))
      );
  }, [products, search]);

  // Adicionar produto à seleção
  const handleAddProduct = (product: typeof products[0]) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      setSelectedProducts(prev =>
        prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
      );
    } else {
      setSelectedProducts(prev => [...prev, {
        id: product.id,
        code: product.code,
        description: product.description,
        barcode: product.barcode,
        sale_price: product.sale_price || 0,
        quantity: 1,
      }]);
    }
  };

  // Atualizar quantidade
  const handleUpdateQuantity = (id: string, delta: number) => {
    setSelectedProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const newQty = Math.max(1, p.quantity + delta);
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  // Remover produto
  const handleRemoveProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  // Total de etiquetas
  const totalLabels = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  // Gerar código de barras SVG
  const generateBarcodeSVG = (code: string) => {
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, code, {
        format: "EAN13",
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 5,
      });
      return new XMLSerializer().serializeToString(svg);
    } catch {
      // Fallback para Code128 se não for EAN13 válido
      try {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        JsBarcode(svg, code, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 5,
        });
        return new XMLSerializer().serializeToString(svg);
      } catch {
        return null;
      }
    }
  };

  // Imprimir etiquetas
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sizeStyles = {
      small: { width: '35mm', height: '22mm', fontSize: '8px', pageWidth: '35mm', pageHeight: '22mm' },
      medium: { width: '50mm', height: '30mm', fontSize: '10px', pageWidth: '50mm', pageHeight: '30mm' },
      large: { width: '80mm', height: '40mm', fontSize: '12px', pageWidth: '80mm', pageHeight: '40mm' },
    };

    const style = sizeStyles[config.size];

    let labelsHtml = '';
    selectedProducts.forEach(product => {
      for (let i = 0; i < product.quantity; i++) {
        const barcodeValue = product.barcode || product.code;
        const barcodeHtml = config.showBarcode && barcodeValue
          ? generateBarcodeSVG(barcodeValue) || ''
          : '';

        labelsHtml += `
          <div class="label">
            ${config.showName ? `<div class="name">${product.description}</div>` : ''}
            ${config.showCode ? `<div class="code">Cód: ${product.code}</div>` : ''}
            ${config.showBarcode && barcodeHtml ? `<div class="barcode">${barcodeHtml}</div>` : ''}
            ${config.showPrice ? `<div class="price">R$ ${product.sale_price.toFixed(2)}</div>` : ''}
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas</title>
        <style>
          @page {
            size: ${style.pageWidth} ${style.pageHeight};
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
            width: ${style.width};
            height: ${style.height};
            padding: 1.5mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            font-size: ${style.fontSize};
            page-break-after: always;
            overflow: hidden;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .name {
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100%;
            line-height: 1.2;
          }
          .code {
            color: #666;
            font-size: 0.85em;
            line-height: 1.2;
          }
          .barcode {
            margin: 1mm 0;
          }
          .barcode svg {
            max-width: 100%;
            height: auto;
            max-height: 10mm;
          }
          .price {
            font-weight: bold;
            font-size: 1.3em;
            line-height: 1.2;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etiquetas"
        description="Geração e impressão de etiquetas de código de barras"
        breadcrumbs={[
          { label: "Produtos" },
          { label: "Etiquetas" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleção de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Selecionar Produtos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, nome ou código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.slice(0, 50).map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                        <TableCell className="truncate max-w-[150px]">{product.description}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddProduct(product)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Configuração e Preview */}
        <div className="space-y-4">
          {/* Configurações */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações da Etiqueta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tamanho da Etiqueta</Label>
                <Select
                  value={config.size}
                  onValueChange={(v) => setConfig({ ...config, size: v as LabelSize })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeno (35x22mm)</SelectItem>
                    <SelectItem value="medium">Médio (50x30mm)</SelectItem>
                    <SelectItem value="large">Grande (80x40mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Informações a Exibir</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showName"
                    checked={config.showName}
                    onCheckedChange={(c) => setConfig({ ...config, showName: !!c })}
                  />
                  <label htmlFor="showName" className="text-sm">Nome do Produto</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showCode"
                    checked={config.showCode}
                    onCheckedChange={(c) => setConfig({ ...config, showCode: !!c })}
                  />
                  <label htmlFor="showCode" className="text-sm">Código</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showPrice"
                    checked={config.showPrice}
                    onCheckedChange={(c) => setConfig({ ...config, showPrice: !!c })}
                  />
                  <label htmlFor="showPrice" className="text-sm">Preço de Venda</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showBarcode"
                    checked={config.showBarcode}
                    onCheckedChange={(c) => setConfig({ ...config, showBarcode: !!c })}
                  />
                  <label htmlFor="showBarcode" className="text-sm">Código de Barras</label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos Selecionados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Produtos Selecionados</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {totalLabels} etiqueta(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum produto selecionado
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedProducts.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.description}</p>
                        <p className="text-sm text-muted-foreground">{product.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{product.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdateQuantity(product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveProduct(product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full mt-4"
                disabled={selectedProducts.length === 0}
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Etiquetas ({totalLabels})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
