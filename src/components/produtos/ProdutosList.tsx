import { useState } from "react";
import { useProducts, ProductInsert } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Power, Upload } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { ProductForm, ProductFormData } from "./ProductForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSortableData } from "@/hooks/useSortableData";
import { SortableTableHeader } from "@/components/shared";
import { ImportProductsCIGAMModal } from "./ImportProductsCIGAMModal";
import { useQueryClient } from "@tanstack/react-query";

export function ProdutosList() {
  const queryClient = useQueryClient();
  const { products, isLoading, createProduct, updateProduct, toggleProductStatus } = useProducts();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = products.filter(
    (p) =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  const { items: sortedProducts, requestSort, sortConfig } = useSortableData(
    filteredProducts,
    "description"
  );

  const handleOpenNew = () => {
    setEditingProductId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (productId: string) => {
    setEditingProductId(productId);
    setDialogOpen(true);
  };

  const getEditingProduct = () => {
    if (!editingProductId) return undefined;
    const product = products.find(p => p.id === editingProductId);
    if (!product) return undefined;
    
    return {
      id: product.id, // Incluir o ID para auditoria
      code: product.code,
      description: product.description,
      barcode: product.barcode || '',
      product_group: product.product_group || '',
      controls_stock: product.controls_stock ?? true,
      has_invoice: product.has_invoice ?? true,
      has_variations: product.has_variations ?? false,
      has_composition: product.has_composition ?? false,
      unit: product.unit || 'UN',
      unit_conversions: (product.unit_conversions as any[]) || [],
      supplier_code: '',
      weight: product.weight || 0,
      width: product.width || 0,
      height: product.height || 0,
      length: product.length || 0,
      description_long: product.description_long || '',
      is_active: product.is_active,
      is_sold_separately: product.is_sold_separately ?? true,
      is_pdv_available: product.is_pdv_available ?? true,
      extra_fields: (product.extra_fields as any[]) || [],
      purchase_price: product.purchase_price || 0,
      accessory_expenses: product.accessory_expenses || 0,
      other_expenses: product.other_expenses || 0,
      final_cost: product.final_cost || 0,
      min_stock: product.min_stock || 0,
      max_stock: product.max_stock || 0,
      quantity: product.quantity || 0,
      ncm: product.ncm || '',
      ncm_validated: product.ncm_validated ?? false,
      ncm_description: product.ncm_description || '',
      cest: product.cest || '',
      origin: product.origin || '0',
      net_weight: product.net_weight || 0,
      gross_weight: product.gross_weight || 0,
      fci_number: product.fci_number || '',
      specific_product: product.specific_product || '',
      benefit_code: product.benefit_code || '',
      icms_rate: 0,
      images: [],
      suppliers: [],
    };
  };

  const handleSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    
    try {
      const productData: ProductInsert = {
        code: data.code,
        description: data.description,
        barcode: data.barcode || null,
        product_group: data.product_group || null,
        controls_stock: data.controls_stock,
        has_invoice: data.has_invoice,
        has_variations: data.has_variations,
        has_composition: data.has_composition,
        unit: data.unit,
        unit_conversions: data.unit_conversions as any,
        weight: data.weight,
        width: data.width,
        height: data.height,
        length: data.length,
        description_long: data.description_long || null,
        is_active: data.is_active,
        is_sold_separately: data.is_sold_separately,
        is_pdv_available: data.is_pdv_available,
        extra_fields: data.extra_fields as any,
        purchase_price: data.purchase_price,
        accessory_expenses: data.accessory_expenses,
        other_expenses: data.other_expenses,
        final_cost: data.final_cost,
        min_stock: data.min_stock,
        max_stock: data.max_stock,
        quantity: data.quantity,
        ncm: data.ncm || null,
        ncm_validated: data.ncm_validated,
        ncm_description: data.ncm_description || null,
        cest: data.cest || null,
        origin: data.origin,
        net_weight: data.net_weight,
        gross_weight: data.gross_weight,
        fci_number: data.fci_number || null,
        specific_product: data.specific_product || null,
        benefit_code: data.benefit_code || null,
      };

      if (editingProductId) {
        await updateProduct.mutateAsync({ id: editingProductId, ...productData });
      } else {
        const result = await createProduct.mutateAsync(productData);
        
        // Salvar imagens se houver
        if (data.images.length > 0 && result?.id) {
          for (const img of data.images) {
            if (img.file) {
              const fileName = `${result.id}/${Date.now()}-${img.file.name}`;
              const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, img.file);
              
              if (!uploadError) {
                const { data: publicUrl } = supabase.storage
                  .from('product-images')
                  .getPublicUrl(fileName);
                
                await supabase.from('product_images').insert({
                  product_id: result.id,
                  url: publicUrl.publicUrl,
                  is_main: img.is_main,
                  display_order: img.display_order,
                });
              }
            }
          }
        }
        
        // Salvar fornecedores se houver
        if (data.suppliers.length > 0 && result?.id) {
          for (const supplier of data.suppliers) {
            await supabase.from('product_suppliers').insert({
              product_id: result.id,
              supplier_name: supplier.supplier_name,
              supplier_cnpj: supplier.supplier_cnpj || null,
              supplier_code: supplier.supplier_code || null,
            });
          }
        }
      }

      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: boolean) => {
    await toggleProductStatus.mutateAsync({ 
      id: productId, 
      is_active: !currentStatus 
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CIGAM
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                label="Código"
                sortKey="code"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Descrição"
                sortKey="description"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="NCM"
                sortKey="ncm"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Unidade"
                sortKey="unit"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Custo Final"
                sortKey="final_cost"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
                className="text-right"
              />
              <SortableTableHeader
                label="Estoque"
                sortKey="quantity"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
                className="text-right"
              />
              <SortableTableHeader
                label="Status"
                sortKey="is_active"
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={requestSort}
              />
              <SortableTableHeader
                label="Ações"
                sortKey=""
                currentSortKey={sortConfig.key}
                sortDirection={sortConfig.direction}
                onSort={() => {}}
                className="w-[100px]"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono">{product.code}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>{product.ncm || "-"}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.final_cost || product.purchase_price || 0)}
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
                        onClick={() => handleOpenEdit(product.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(product.id, product.is_active)}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductId ? "Editar Produto" : "Adicionar Produto"}
            </DialogTitle>
          </DialogHeader>

          <ProductForm
            initialData={getEditingProduct()}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Importação CIGAM */}
      <ImportProductsCIGAMModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }}
      />
    </div>
  );
}
