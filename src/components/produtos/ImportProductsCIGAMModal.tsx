import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { useCompany } from "@/contexts/CompanyContext";

interface ImportProductsExcelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ProductRow {
  code: string;
  description: string;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  barcode?: string;
  unit?: string;
  ncm?: string;
  cest?: string;
  product_group?: string;
  gross_weight?: number;
  net_weight?: number;
  commission_percent?: number;
}

export function ImportProductsCIGAMModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportProductsExcelModalProps) {
  const { currentCompany } = useCompany();
  const [file, setFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validExtensions = [".xls", ".xlsx"];
      const fileExtension = selectedFile.name.substring(
        selectedFile.name.lastIndexOf(".")
      ).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        toast.error("Formato inválido. Selecione um arquivo .xls ou .xlsx");
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        "Código": "PROD001",
        "Qtd. Estoque": 10,
        "Nome do produto *": "Produto Exemplo",
        "Preço de compra": 100.00,
        "Preço de venda": 150.00,
        "Código de barras (GTIN/EAN)": "7891234567890",
        "Unidade": "UN",
        "NCM": "84198190",
        "CEST": "",
        "Grupo do produto": "Geral",
        "Peso Bruto (quilos)": 1.5,
        "Peso Líquido (quilos)": 1.2,
        "Comissão (%)": 5,
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    
    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Código
      { wch: 12 }, // Qtd
      { wch: 40 }, // Nome
      { wch: 15 }, // Preço compra
      { wch: 15 }, // Preço venda
      { wch: 20 }, // Código barras
      { wch: 10 }, // Unidade
      { wch: 12 }, // NCM
      { wch: 10 }, // CEST
      { wch: 20 }, // Grupo
      { wch: 15 }, // Peso bruto
      { wch: 15 }, // Peso líquido
      { wch: 12 }, // Comissão
    ];

    XLSX.writeFile(wb, "modelo_importacao_produtos.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    // Handle string values with R$ prefix and comma decimal separator
    if (typeof value === 'string') {
      const cleaned = value
        .replace(/R\$\s*/g, '')
        .replace(/\./g, '') // Remove thousands separator
        .replace(',', '.') // Convert decimal separator
        .trim();
      return parseFloat(cleaned) || 0;
    }
    return parseFloat(String(value)) || 0;
  };

  const parseExcelFile = async (file: File): Promise<ProductRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
          
          const products: ProductRow[] = [];
          
          for (const row of jsonData) {
            // Map columns based on header names (Portuguese)
            const code = String(row["Código"] || row["codigo"] || row["CODIGO"] || "").trim();
            const description = String(row["Nome do produto *"] || row["Nome do produto"] || row["nome"] || row["NOME"] || row["Descrição"] || row["descricao"] || "").trim();
            const quantity = parseNumber(row["Qtd. Estoque"] || row["Qtd"] || row["quantidade"] || row["QUANTIDADE"] || 0);
            const purchasePrice = parseNumber(row["Preço de compra"] || row["preco_compra"] || row["PRECO_COMPRA"] || 0);
            const salePrice = parseNumber(row["Preço de venda"] || row["preco_venda"] || row["PRECO_VENDA"] || 0);
            const barcode = String(row["Código de barras (GTIN/EAN)"] || row["codigo_barras"] || row["GTIN"] || row["EAN"] || "").trim();
            const unit = String(row["Unidade"] || row["unidade"] || row["UN"] || "UN").trim().toUpperCase() || "UN";
            const ncm = String(row["NCM"] || row["ncm"] || "").trim();
            const cest = String(row["CEST"] || row["cest"] || "").trim();
            const productGroup = String(row["Grupo do produto"] || row["grupo"] || row["GRUPO"] || "").trim();
            const grossWeight = parseNumber(row["Peso Bruto (quilos)"] || row["peso_bruto"] || 0);
            const netWeight = parseNumber(row["Peso Líquido (quilos)"] || row["peso_liquido"] || 0);
            const commissionPercent = parseNumber(row["Comissão (%)"] || row["comissao"] || 0);
            
            // Skip rows without code or description
            if (!code || !description) continue;
            
            products.push({
              code,
              description,
              purchase_price: purchasePrice,
              sale_price: salePrice,
              quantity,
              barcode: barcode || undefined,
              unit: unit || "UN",
              ncm: ncm || undefined,
              cest: cest || undefined,
              product_group: productGroup || undefined,
              gross_weight: grossWeight || undefined,
              net_weight: netWeight || undefined,
              commission_percent: commissionPercent || undefined,
            });
          }
          
          resolve(products);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    if (!currentCompany?.id) {
      toast.error("Nenhuma empresa selecionada");
      return;
    }

    setIsImporting(true);
    setProgress(10);
    setStatus("Lendo planilha...");

    try {
      // Parse Excel file
      const products = await parseExcelFile(file);
      
      if (products.length === 0) {
        toast.error("Nenhum produto válido encontrado na planilha");
        setIsImporting(false);
        setProgress(0);
        setStatus("");
        return;
      }

      setProgress(30);
      setStatus(`${products.length} produtos encontrados. Enviando para o servidor...`);

      // Call edge function
      const { data, error } = await supabase.functions.invoke("import-products", {
        body: {
          products,
          company_id: currentCompany.id,
          clear_existing: clearExisting,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao importar produtos");
      }

      setProgress(100);
      setStatus("Importação concluída!");

      const stats = data.stats;
      toast.success(
        `Importação concluída: ${stats.created} criados, ${stats.updated} atualizados, ${stats.errors} erros`,
        { duration: 5000 }
      );

      // Log errors if any
      if (data.error_details && data.error_details.length > 0) {
        console.warn("Erros na importação:", data.error_details);
        toast.warning(`${stats.errors} produtos com erro. Verifique o console para detalhes.`);
      }

      // Reset and close
      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 1000);

    } catch (error) {
      console.error("Erro na importação:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao importar produtos");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setFile(null);
      setClearExisting(false);
      setProgress(0);
      setStatus("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Produtos via Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template Button */}
          <Button 
            variant="outline" 
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar Planilha Modelo
          </Button>

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">Planilha (.xls ou .xlsx)</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                disabled={isImporting}
                className="flex-1"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          {/* Format Help */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Colunas esperadas:</p>
            <ul className="text-muted-foreground space-y-0.5 text-xs grid grid-cols-2 gap-x-2">
              <li>• Código</li>
              <li>• Qtd. Estoque</li>
              <li>• Nome do produto *</li>
              <li>• Preço de compra</li>
              <li>• Preço de venda</li>
              <li>• Código de barras</li>
              <li>• Unidade</li>
              <li>• NCM</li>
              <li>• CEST</li>
              <li>• Grupo do produto</li>
              <li>• Peso Bruto</li>
              <li>• Peso Líquido</li>
            </ul>
          </div>

          {/* Clear Existing Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="clearExisting"
              checked={clearExisting}
              onCheckedChange={(checked) => setClearExisting(checked === true)}
              disabled={isImporting}
            />
            <Label htmlFor="clearExisting" className="text-sm cursor-pointer">
              Zerar estoque dos produtos existentes antes de importar
            </Label>
          </div>

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{status}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}