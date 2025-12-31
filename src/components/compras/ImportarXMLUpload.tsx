import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface XMLFileResult {
  fileName: string;
  type: "nfe" | "cte";
  content: string;
}

interface ImportarXMLUploadProps {
  isProcessing: boolean;
  onFilesUpload: (files: XMLFileResult[]) => void;
  processedFiles?: { fileName: string; type: "nfe" | "cte"; success: boolean }[];
}

export function ImportarXMLUpload({ isProcessing, onFilesUpload, processedFiles = [] }: ImportarXMLUploadProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const results: XMLFileResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = await file.text();
      
      // Identificar se é NF-e ou CT-e baseado no conteúdo
      const isNFe = content.includes('<nfeProc') || content.includes('<NFe');
      const isCTe = content.includes('<cteProc') || content.includes('<CTe');
      
      if (isNFe) {
        results.push({
          fileName: file.name,
          type: "nfe",
          content,
        });
      } else if (isCTe) {
        results.push({
          fileName: file.name,
          type: "cte",
          content,
        });
      } else {
        // Tentar determinar pelo nome do arquivo ou estrutura
        if (file.name.toLowerCase().includes('cte')) {
          results.push({
            fileName: file.name,
            type: "cte",
            content,
          });
        } else {
          // Default para NFe
          results.push({
            fileName: file.name,
            type: "nfe",
            content,
          });
        }
      }
    }

    if (results.length > 0) {
      onFilesUpload(results);
    }

    // Reset input para permitir selecionar os mesmos arquivos novamente
    e.target.value = '';
  };

  return (
    <Card>
      <CardContent className="p-8">
        <Label htmlFor="xml-upload" className="cursor-pointer">
          <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors">
            {isProcessing ? (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            )}
            <p className="mt-4 text-lg font-medium">
              {isProcessing ? "Processando..." : "Clique para selecionar arquivos XML"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Aceita múltiplos arquivos de NF-e e CT-e (.xml)
            </p>
          </div>
        </Label>
        <Input
          id="xml-upload"
          type="file"
          accept=".xml"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing}
        />

        {/* Lista de arquivos processados */}
        {processedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Arquivos processados:</p>
            {processedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <FileText className="h-4 w-4" />
                <span className="flex-1 text-sm truncate">{file.fileName}</span>
                <Badge variant={file.type === "nfe" ? "default" : "secondary"}>
                  {file.type.toUpperCase()}
                </Badge>
                {file.success && <CheckCircle className="h-4 w-4 text-green-500" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
