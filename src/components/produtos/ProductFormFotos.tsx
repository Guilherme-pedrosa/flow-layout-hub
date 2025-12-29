import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductImage {
  id?: string;
  url: string;
  is_main: boolean;
  display_order: number;
  file?: File;
}

interface ProductFormFotosProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  productId?: string;
}

export function ProductFormFotos({ images, onChange, productId }: ProductFormFotosProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    addImages(files);
  }, [images]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  };

  const addImages = (files: File[]) => {
    const newImages: ProductImage[] = files.map((file, index) => ({
      url: URL.createObjectURL(file),
      is_main: images.length === 0 && index === 0,
      display_order: images.length + index,
      file,
    }));

    onChange([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    // Se removeu a imagem principal, define a primeira como principal
    if (images[index].is_main && updated.length > 0) {
      updated[0].is_main = true;
    }
    onChange(updated);
  };

  const setMainImage = (index: number) => {
    const updated = images.map((img, i) => ({
      ...img,
      is_main: i === index,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Área de upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-lg font-medium">
            Solte o arquivo aqui para fazer upload...
          </div>
          <div className="text-sm text-muted-foreground">ou</div>
          <label>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button type="button" variant="secondary" className="cursor-pointer" asChild>
              <span>
                <ImageIcon className="h-4 w-4 mr-2" />
                Selecionar imagens
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Preview das imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={index} className={`relative group overflow-hidden ${image.is_main ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-0">
                <img
                  src={image.url}
                  alt={`Produto ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setMainImage(index)}
                    disabled={image.is_main}
                  >
                    {image.is_main ? 'Principal' : 'Definir principal'}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {image.is_main && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Principal
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Nenhuma imagem adicionada ainda
        </div>
      )}
    </div>
  );
}
