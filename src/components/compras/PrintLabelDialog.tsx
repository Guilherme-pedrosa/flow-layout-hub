import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X } from "lucide-react";
import JsBarcode from "jsbarcode";

interface LabelItem {
  id: string;
  code: string;
  description: string;
  barcode?: string;
  quantity: number;
}

interface PrintLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LabelItem[];
  nfNumber: string;
  nfSeries: string;
  supplierAddress?: string;
}

export function PrintLabelDialog({
  open,
  onOpenChange,
  items,
  nfNumber,
  nfSeries,
  supplierAddress,
}: PrintLabelDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Record<string, { selected: boolean; quantity: number }>>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Initialize selection with all items selected and their original quantities
      const initial: Record<string, { selected: boolean; quantity: number }> = {};
      items.forEach(item => {
        initial[item.id] = { selected: true, quantity: item.quantity };
      });
      setSelectedItems(initial);
    }
  }, [open, items]);

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected
      }
    }));
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.max(1, quantity)
      }
    }));
  };

  const handlePrint = () => {
    const selectedLabels = items.filter(item => selectedItems[item.id]?.selected);
    if (selectedLabels.length === 0) return;

    // Generate labels HTML
    const labelsHtml = selectedLabels.flatMap(item => {
      const qty = selectedItems[item.id]?.quantity || 1;
      return Array(qty).fill(null).map((_, index) => generateLabelHtml(item, index));
    }).join("");

    // Create print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas - NF ${nfSeries}/${nfNumber}</title>
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
          .info-value {
            text-align: right;
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
          // Generate barcodes after DOM is loaded
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

  const generateLabelHtml = (item: LabelItem, index: number) => {
    // Use barcode if available, otherwise use code
    const barcodeValue = item.barcode || item.code;
    
    return `
      <div class="label">
        <div class="product-name">${escapeHtml(item.description)}</div>
        <div class="info-row">
          <div>
            <span class="info-label">Referência</span><br/>
            <span class="info-value">${escapeHtml(item.code)}</span>
          </div>
          <div>
            <span class="info-label">Série/NF</span><br/>
            <span class="info-value">${escapeHtml(nfSeries)} / ${escapeHtml(nfNumber)}</span>
          </div>
        </div>
        <div class="warehouse">
          <span class="warehouse-label">Armazém</span><br/>
          ${escapeHtml(supplierAddress || "Local padrão")}
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

  const totalLabels = items.reduce((sum, item) => {
    const sel = selectedItems[item.id];
    return sum + (sel?.selected ? sel.quantity : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Etiquetas
          </DialogTitle>
          <DialogDescription>
            Selecione os itens e quantidade de etiquetas a imprimir (50x30mm - Pimaco)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {items.map(item => {
              const selection = selectedItems[item.id];
              return (
                <div 
                  key={item.id} 
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={selection?.selected || false}
                    onCheckedChange={() => handleToggleItem(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <Label 
                      htmlFor={`item-${item.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {item.code} - {item.description}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {item.barcode ? `EAN: ${item.barcode}` : `Código: ${item.code}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Qtd:</Label>
                    <Input
                      type="number"
                      min={1}
                      value={selection?.quantity || 1}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center"
                      disabled={!selection?.selected}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{totalLabels}</span> etiqueta(s)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handlePrint} disabled={totalLabels === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
