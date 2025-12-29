import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { NFEItem } from "./types";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

interface CadastrarProdutoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: NFEItem | null;
  onSuccess: (productId: string) => void;
}

export function CadastrarProdutoDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: CadastrarProdutoDialogProps) {
  const { createProduct } = useProducts();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    ncm: "",
    unit: "",
    purchase_price: 0,
    sale_price: 0,
  });

  // Atualizar form quando item mudar
  useState(() => {
    if (item) {
      setFormData({
        code: item.codigo,
        description: item.descricao,
        ncm: item.ncm,
        unit: item.unidade || "UN",
        purchase_price: item.valorUnitario,
        sale_price: item.valorUnitario * 1.3, // Sugestão de 30% de margem
      });
    }
  });

  if (!item) return null;

  const handleCadastrar = async () => {
    if (!formData.code || !formData.description) {
      toast.error("Preencha o código e descrição do produto");
      return;
    }

    setLoading(true);
    try {
      const result = await createProduct.mutateAsync({
        code: formData.code,
        description: formData.description,
        ncm: formData.ncm || null,
        unit: formData.unit || "UN",
        purchase_price: formData.purchase_price,
        sale_price: formData.sale_price,
        quantity: 0,
        min_stock: 0,
        is_active: true,
      });

      toast.success("Produto cadastrado com sucesso!");
      onSuccess(result.id);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro ao cadastrar produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Produto</DialogTitle>
          <DialogDescription>
            Cadastre este produto no sistema para vincular à nota fiscal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Código *</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="col-span-3"
              placeholder="Código do produto"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Descrição *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="col-span-3"
              placeholder="Descrição do produto"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">NCM</Label>
            <Input
              value={formData.ncm}
              onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
              className="col-span-3"
              placeholder="00000000"
              maxLength={8}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Unidade</Label>
            <Input
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="col-span-3"
              placeholder="UN, PC, KG, etc."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Preço Compra</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Preço Venda</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.sale_price}
              onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCadastrar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cadastrar Produto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
