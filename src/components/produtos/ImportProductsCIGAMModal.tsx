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
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { useCompany } from "@/contexts/CompanyContext";

interface ImportProductsCIGAMModalProps {
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
}

export function ImportProductsCIGAMModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportProductsCIGAMModalProps) {
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

  const parseExcelFile = async (file: File): Promise<ProductRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Converter para JSON (começando da linha 1, assumindo que linha 0 pode ser cabeçalho)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          const products: ProductRow[] = [];
          
          // Pular a primeira linha se for cabeçalho (verificar se coluna A tem texto não numérico)
          const startRow = jsonData.length > 0 && isNaN(Number(jsonData[0][0])) ? 1 : 0;
          
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Ignorar linhas vazias
            if (!row || !row[0]) continue;
            
            const code = String(row[0] || "").trim();
            const description = String(row[1] || "").trim();
            const purchasePrice = parseFloat(String(row[2] || "0").replace(",", ".")) || 0;
            const salePrice = parseFloat(String(row[3] || "0").replace(",", ".")) || 0;
            const quantity = parseFloat(String(row[4] || "0").replace(",", ".")) || 0;
            
            if (code && description) {
              products.push({
                code,
                description,
                purchase_price: purchasePrice,
                sale_price: salePrice,
                quantity,
              });
            }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Produtos CIGAM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
            <p className="font-medium mb-1">Formato esperado da planilha:</p>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              <li>Coluna A: Código do produto</li>
              <li>Coluna B: Nome/Descrição</li>
              <li>Coluna C: Preço de Compra</li>
              <li>Coluna D: Preço de Venda</li>
              <li>Coluna E: Quantidade em Estoque</li>
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
