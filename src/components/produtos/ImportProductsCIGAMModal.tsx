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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2, Download, AlertTriangle, CheckCircle, PlusCircle, RefreshCw } from "lucide-react";
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

interface PreviewProduct extends ProductRow {
  action: 'create' | 'update';
  existingId?: string;
  existingDescription?: string;
}

type Step = 'upload' | 'preview' | 'importing';

export function ImportProductsCIGAMModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportProductsExcelModalProps) {
  const { currentCompany } = useCompany();
  const [file, setFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [step, setStep] = useState<Step>('upload');
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
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
      setPreviewProducts([]);
      setStep('upload');
    }
  };

  const downloadTemplate = () => {
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
    
    ws["!cols"] = [
      { wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 12 },
    ];

    XLSX.writeFile(wb, "modelo_importacao_produtos.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      const cleaned = value
        .replace(/R\$\s*/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
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
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];
          
          const products: ProductRow[] = [];
          
          for (const row of jsonData) {
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

  const analyzeProducts = async () => {
    if (!file || !currentCompany?.id) return;

    setIsAnalyzing(true);
    try {
      const products = await parseExcelFile(file);
      
      if (products.length === 0) {
        toast.error("Nenhum produto válido encontrado na planilha");
        return;
      }

      const codes = products.map(p => p.code);
      const { data: existingProducts, error } = await supabase
        .from('products')
        .select('id, code, description')
        .eq('company_id', currentCompany.id)
        .in('code', codes);

      if (error) throw error;

      const existingMap = new Map(existingProducts?.map(p => [p.code, p]) || []);

      const preview: PreviewProduct[] = products.map(product => {
        const existing = existingMap.get(product.code);
        return {
          ...product,
          action: existing ? 'update' : 'create',
          existingId: existing?.id,
          existingDescription: existing?.description,
        };
      });

      setPreviewProducts(preview);
      setStep('preview');
    } catch (error) {
      console.error("Erro ao analisar planilha:", error);
      toast.error("Erro ao analisar planilha");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!currentCompany?.id || previewProducts.length === 0) return;

    setIsImporting(true);
    setStep('importing');
    setProgress(10);
    setStatus("Enviando para o servidor...");

    try {
      const products = previewProducts.map(({ action, existingId, existingDescription, ...p }) => p);

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

      if (data.error_details && data.error_details.length > 0) {
        console.warn("Erros na importação:", data.error_details);
        toast.warning(`${stats.errors} produtos com erro. Verifique o console para detalhes.`);
      }

      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 1000);

    } catch (error) {
      console.error("Erro na importação:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao importar produtos");
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting && !isAnalyzing) {
      setFile(null);
      setClearExisting(false);
      setProgress(0);
      setStatus("");
      setStep('upload');
      setPreviewProducts([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    }
  };

  const toUpdateCount = previewProducts.filter(p => p.action === 'update').length;
  const toCreateCount = previewProducts.filter(p => p.action === 'create').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Produtos via Excel
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Planilha Modelo
            </Button>

            <div className="space-y-2">
              <Label htmlFor="file">Planilha (.xls ou .xlsx)</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileChange}
                  disabled={isAnalyzing}
                  className="flex-1"
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {file.name}
                </p>
              )}
            </div>

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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="clearExisting"
                checked={clearExisting}
                onCheckedChange={(checked) => setClearExisting(checked === true)}
                disabled={isAnalyzing}
              />
              <Label htmlFor="clearExisting" className="text-sm cursor-pointer">
                Zerar estoque dos produtos existentes antes de importar
              </Label>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{toCreateCount} novos</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">{toUpdateCount} a atualizar</span>
              </div>
            </div>

            {toUpdateCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {toUpdateCount} produto(s) serão atualizados
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    Produtos com mesmo código terão seus dados substituídos.
                  </p>
                </div>
              </div>
            )}

            <ScrollArea className="h-[300px] rounded-lg border">
              <div className="p-2 space-y-1">
                {previewProducts.map((product, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {product.code}
                        </code>
                        <span className="text-sm truncate">{product.description}</span>
                      </div>
                      {product.action === 'update' && product.existingDescription && 
                       product.existingDescription !== product.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Atual: {product.existingDescription}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={product.action === 'create' ? 'default' : 'secondary'}
                      className={product.action === 'create' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                      }
                    >
                      {product.action === 'create' ? (
                        <><PlusCircle className="h-3 w-3 mr-1" />Novo</>
                      ) : (
                        <><RefreshCw className="h-3 w-3 mr-1" />Atualizar</>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Progress value={progress} className="h-2 w-full" />
              <p className="text-sm text-muted-foreground text-center">{status}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isAnalyzing}>
                Cancelar
              </Button>
              <Button onClick={analyzeProducts} disabled={!file || isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Analisar Planilha
                  </>
                )}
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                Confirmar Importação
              </Button>
            </>
          )}
          
          {step === 'importing' && (
            <Button variant="outline" disabled>
              Importando...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
