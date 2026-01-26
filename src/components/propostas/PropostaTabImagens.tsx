import { useState } from "react";
import { Upload, Trash2, Image as ImageIcon, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProposalImage } from "@/hooks/useProposals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PropostaTabImagensProps {
  proposalId: string;
  images: ProposalImage[];
}

const paginaOptions = [
  { value: "capa", label: "Capa" },
  { value: "institucional", label: "Institucional" },
  { value: "parceiros", label: "Parceiros" },
  { value: "galeria", label: "Galeria" },
];

export function PropostaTabImagens({ proposalId, images }: PropostaTabImagensProps) {
  const [localImages, setLocalImages] = useState<ProposalImage[]>(images);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${proposalId}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from("proposals")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("proposals")
          .getPublicUrl(fileName);

        // Salvar no banco
        const { data: imageData, error: insertError } = await supabase
          .from("proposal_images")
          .insert({
            proposal_id: proposalId,
            url: urlData.publicUrl,
            legenda: file.name,
            pagina_destino: "galeria",
            ordem: localImages.length,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setLocalImages((prev) => [...prev, imageData as ProposalImage]);
      }

      toast.success("Imagens enviadas com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar imagens");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (image: ProposalImage) => {
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = image.url.split("/proposals/");
      if (urlParts.length > 1) {
        await supabase.storage.from("proposals").remove([urlParts[1]]);
      }

      await supabase.from("proposal_images").delete().eq("id", image.id);

      setLocalImages((prev) => prev.filter((i) => i.id !== image.id));
      toast.success("Imagem removida!");
    } catch (error) {
      console.error("Erro ao remover imagem:", error);
      toast.error("Erro ao remover imagem");
    }
  };

  const handleUpdateImage = async (id: string, field: string, value: string) => {
    try {
      await supabase
        .from("proposal_images")
        .update({ [field]: value })
        .eq("id", id);

      setLocalImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, [field]: value } : img))
      );
    } catch (error) {
      console.error("Erro ao atualizar imagem:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Imagens da Proposta</h3>
          <p className="text-sm text-muted-foreground">
            Adicione imagens para capa, institucional e galeria
          </p>
        </div>
        <div>
          <input
            type="file"
            id="image-upload"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("image-upload")?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Enviando..." : "Fazer Upload"}
          </Button>
        </div>
      </div>

      {localImages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma imagem</h3>
            <p className="text-muted-foreground mb-4">
              Adicione imagens para personalizar sua proposta
            </p>
            <Button
              variant="outline"
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Fazer Upload
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {localImages.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={image.url}
                  alt={image.legenda || "Imagem da proposta"}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleDelete(image)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label>Legenda</Label>
                  <Input
                    value={image.legenda || ""}
                    onChange={(e) => handleUpdateImage(image.id, "legenda", e.target.value)}
                    placeholder="Legenda da imagem"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Página de Destino</Label>
                  <Select
                    value={image.pagina_destino || "galeria"}
                    onValueChange={(v) => handleUpdateImage(image.id, "pagina_destino", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paginaOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
