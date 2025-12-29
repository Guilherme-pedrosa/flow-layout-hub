import { useState } from "react";
import { useProducts, Product, ProductInsert } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Power } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ProductFormData {
  code: string;
  description: string;
  ncm: string;
  unit: string;
  purchase_price: string;
  sale_price: string;
  min_stock: string;
}

const initialFormData: ProductFormData = {
  code: "",
  description: "",
  ncm: "",
  unit: "UN",
  purchase_price: "0",
  sale_price: "0",
  min_stock: "0",
};

export function ProdutosList() {
  const { products, isLoading, createProduct, updateProduct, toggleProductStatus } = useProducts();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  const filteredProducts = products.filter(
    (p) =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      description: product.description,
      ncm: product.ncm || "",
      unit: product.unit || "UN",
      purchase_price: String(product.purchase_price || 0),
      sale_price: String(product.sale_price || 0),
      min_stock: String(product.min_stock || 0),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData: ProductInsert = {
      code: formData.code,
      description: formData.description,
      ncm: formData.ncm || null,
      unit: formData.unit,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      sale_price: parseFloat(formData.sale_price) || 0,
      min_stock: parseFloat(formData.min_stock) || 0,
      quantity: editingProduct?.quantity ?? 0,
      is_active: true,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
    }

    setDialogOpen(false);
  };

  const handleToggleStatus = async (product: Product) => {
    await toggleProductStatus.mutateAsync({ 
      id: product.id, 
      is_active: !product.is_active 
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Preço Compra</TableHead>
              <TableHead className="text-right">Preço Venda</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono">{product.code}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>{product.ncm || "-"}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.purchase_price || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.sale_price || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        (product.quantity ?? 0) <= (product.min_stock ?? 0)
                          ? "text-destructive font-medium"
                          : ""
                      }
                    >
                      {product.quantity ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(product)}
                      >
                        <Power
                          className={`h-4 w-4 ${
                            product.is_active ? "text-destructive" : "text-green-500"
                          }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do produto
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ncm">NCM</Label>
                <Input
                  id="ncm"
                  value={formData.ncm}
                  onChange={(e) =>
                    setFormData({ ...formData, ncm: e.target.value })
                  }
                  placeholder="0000.00.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Preço Compra</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) =>
                    setFormData({ ...formData, purchase_price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço Venda</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) =>
                    setFormData({ ...formData, sale_price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Estoque Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) =>
                    setFormData({ ...formData, min_stock: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {editingProduct ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
