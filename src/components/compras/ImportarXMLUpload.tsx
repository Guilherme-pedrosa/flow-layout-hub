import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";

interface ImportarXMLUploadProps {
  isProcessing: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportarXMLUpload({ isProcessing, onFileUpload }: ImportarXMLUploadProps) {
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
              {isProcessing ? "Processando..." : "Clique para selecionar um arquivo XML"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Apenas arquivos .xml de NF-e são aceitos
            </p>
          </div>
        </Label>
        <Input
          id="xml-upload"
          type="file"
          accept=".xml"
          className="hidden"
          onChange={onFileUpload}
          disabled={isProcessing}
        />
      </CardContent>
    </Card>
  );
}
