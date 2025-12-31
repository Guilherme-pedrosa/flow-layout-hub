import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, Upload, Trash2, FileText, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

interface PayableAttachmentsProps {
  payableId: string | null;
  onAttachmentsChange?: (count: number) => void;
}

export function PayableAttachments({ payableId, onAttachmentsChange }: PayableAttachmentsProps) {
  const { currentCompany } = useCompany();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (payableId) {
      fetchAttachments();
    } else {
      setAttachments([]);
    }
  }, [payableId]);

  const fetchAttachments = async () => {
    if (!payableId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payable_attachments")
        .select("*")
        .eq("payable_id", payableId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
      onAttachmentsChange?.(data?.length || 0);
    } catch (error) {
      console.error("Erro ao carregar anexos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!payableId || !currentCompany?.id) {
      toast.error("Salve o registro antes de adicionar anexos");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload para storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentCompany.id}/${payableId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("financial-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Salvar referência no banco
      const { error: dbError } = await supabase
        .from("payable_attachments")
        .insert({
          payable_id: payableId,
          company_id: currentCompany.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success("Arquivo anexado com sucesso");
      fetchAttachments();
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      // Limpar input
      event.target.value = "";
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from("financial-attachments")
        .download(attachment.file_path);

      if (error) throw error;

      // Criar link de download
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      // Deletar do storage
      await supabase.storage
        .from("financial-attachments")
        .remove([attachment.file_path]);

      // Deletar do banco
      const { error } = await supabase
        .from("payable_attachments")
        .delete()
        .eq("id", attachment.id);

      if (error) throw error;

      toast.success("Anexo removido");
      fetchAttachments();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao remover anexo");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!payableId) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          Anexos
        </Label>
        <p className="text-xs text-muted-foreground">
          Salve o registro para poder adicionar anexos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos ({attachments.length})
        </Label>
        <div className="relative">
          <Input
            type="file"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button variant="outline" size="sm" disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Adicionar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Nenhum anexo adicionado.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{att.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(att.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(att)}
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(att)}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
