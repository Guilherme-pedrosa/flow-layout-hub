import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts, ProductInsert } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Edit, 
  Power, 
  Package, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingDown,
  History,
  Upload
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { ProductForm, ProductFormData } from "@/components/produtos/ProductForm";
import { ImportProductsCIGAMModal } from "@/components/produtos/ImportProductsCIGAMModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";

type StatusFilter = 'all' | 'active' | 'inactive' | 'low_stock' | 'zero_stock' | 'negative_stock';

export default function GerenciarProdutos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, isLoading, createProduct, updateProduct, toggleProductStatus, refetch } = useProducts();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProductData, setEditingProductData] = useState<Partial<ProductFormData> | undefined>(undefined);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [counts, setCounts] = useState({ active: 0, inactive: 0, lowStock: 0, zeroStock: 0, negativeStock: 0 });
  
  // AI Insights - filtrar por categoria "stock" na tela de produtos
  const { insights, dismiss, markAsRead } = useAiInsights('stock');

  // Buscar contagens reais do banco (não limitado pela paginação)
  useEffect(() => {
    const fetchCounts = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;
      
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', session.session.user.id)
        .maybeSingle();
      
      if (!userCompany?.company_id) return;
      const companyId = userCompany.company_id;

      // Query all products for the company and count locally
      // Using count with filters
      const [activeRes, inactiveRes, lowStockRes, zeroStockRes, negativeStockRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('is_active', true),
        supabase.from('products').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('is_active', false),
        supabase.from('products').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('is_active', true).eq('controls_stock', true)
          .gt('quantity', 0).not('min_stock', 'is', null).lte('quantity', 0), // Will fix below
        supabase.from('products').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('is_active', true).eq('controls_stock', true).eq('quantity', 0),
        supabase.from('products').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId).eq('is_active', true).eq('controls_stock', true).lt('quantity', 0)
      ]);

      // For low stock, we need a different approach since we compare quantity to min_stock
      const { data: lowStockData } = await supabase
        .from('products')
        .select('id, quantity, min_stock')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('controls_stock', true)
        .gt('quantity', 0)
        .not('min_stock', 'is', null);
      
      const lowStockCount = lowStockData?.filter(p => (p.quantity ?? 0) <= (p.min_stock ?? 0)).length || 0;

      setCounts({
        active: activeRes.count || 0,
        inactive: inactiveRes.count || 0,
        lowStock: lowStockCount,
        zeroStock: zeroStockRes.count || 0,
        negativeStock: negativeStockRes.count || 0
      });
    };
    
    fetchCounts();
  }, [products]); // Refetch when products change

  // Abrir diretamente pelo query param (deep-link dos alertas)
  useEffect(() => {
    const editId = searchParams.get('edit');
    const tab = searchParams.get('tab');
    
    if (editId && products.length > 0) {
      const productExists = products.find(p => p.id === editId);
      if (productExists) {
        setInitialTab(tab || undefined);
        handleOpenEdit(editId);
        // Limpar params depois de abrir
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, products]);

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Filtro de busca
      const matchesSearch = 
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      // Filtro de status
      switch (statusFilter) {
        case 'active':
          return p.is_active;
        case 'inactive':
          return !p.is_active;
        case 'low_stock':
          return p.is_active && p.controls_stock && (p.quantity ?? 0) > 0 && p.min_stock && (p.quantity ?? 0) <= p.min_stock;
        case 'zero_stock':
          return p.is_active && p.controls_stock && (p.quantity ?? 0) === 0;
        case 'negative_stock':
          return p.is_active && p.controls_stock && (p.quantity ?? 0) < 0;
        default:
          return true;
      }
    });
  }, [products, search, statusFilter]);


  const handleOpenNew = () => {
    setEditingProductId(null);
    setEditingProductData(undefined);
    setInitialTab(undefined);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (productId: string) => {
    setEditingProductId(productId);
    const data = await loadProductData(productId);
    setEditingProductData(data);
    setDialogOpen(true);
  };

  const loadProductData = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return undefined;

    const { data: suppliersData } = await supabase
      .from('product_suppliers')
      .select('*')
      .eq('product_id', productId);

    const suppliers = (suppliersData || []).map(s => ({
      id: s.id,
      supplier_id: s.supplier_id,
      supplier_name: s.supplier_name,
      supplier_cnpj: s.supplier_cnpj || '',
      supplier_code: s.supplier_code || '',
      last_purchase_price: s.last_purchase_price || 0,
      last_purchase_date: s.last_purchase_date,
      is_preferred: s.is_preferred || false,
      lead_time_days: s.lead_time_days || 0,
      min_order_qty: s.min_order_qty || 1,
    }));
    
    return {
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
      suppliers,
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
        
        // Update - deletar fornecedores antigos e inserir novos
        await supabase.from('product_suppliers').delete().eq('product_id', editingProductId);
        
        if (data.suppliers.length > 0) {
          for (const supplier of data.suppliers) {
            await supabase.from('product_suppliers').insert({
              product_id: editingProductId,
              supplier_id: supplier.supplier_id || null,
              supplier_name: supplier.supplier_name,
              supplier_cnpj: supplier.supplier_cnpj || null,
              supplier_code: supplier.supplier_code || null,
              last_purchase_price: supplier.last_purchase_price || 0,
              is_preferred: supplier.is_preferred || false,
              lead_time_days: supplier.lead_time_days || 0,
              min_order_qty: supplier.min_order_qty || 1,
            });
          }
        }
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
              supplier_id: supplier.supplier_id || null,
              supplier_name: supplier.supplier_name,
              supplier_cnpj: supplier.supplier_cnpj || null,
              supplier_code: supplier.supplier_code || null,
              last_purchase_price: supplier.last_purchase_price || 0,
              is_preferred: supplier.is_preferred || false,
              lead_time_days: supplier.lead_time_days || 0,
              min_order_qty: supplier.min_order_qty || 1,
            });
          }
        }

        // Registrar custo inicial no histórico
        if (result?.id && data.final_cost > 0) {
          await supabase.from('product_cost_history').insert({
            product_id: result.id,
            tipo_movimentacao: 'Custo Inicial',
            custo_anterior: 0,
            custo_novo: data.final_cost,
            quantidade: data.quantity,
            estoque_anterior: 0,
            estoque_novo: data.quantity,
            observacoes: 'Cadastro inicial do produto'
          });
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

  const statusCards = [
    { 
      key: 'active' as StatusFilter, 
      label: 'Ativos', 
      count: counts.active, 
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
    },
    { 
      key: 'inactive' as StatusFilter, 
      label: 'Inativos', 
      count: counts.inactive, 
      icon: XCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50'
    },
    { 
      key: 'low_stock' as StatusFilter, 
      label: 'Estoque Baixo', 
      count: counts.lowStock, 
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30'
    },
    { 
      key: 'zero_stock' as StatusFilter, 
      label: 'Sem Estoque', 
      count: counts.zeroStock, 
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30'
    },
    { 
      key: 'negative_stock' as StatusFilter, 
      label: 'Estoque Negativo', 
      count: counts.negativeStock, 
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciar Produtos"
        description="Cadastro e gestão de produtos"
        breadcrumbs={[
          { label: "Produtos" },
          { label: "Gerenciar" },
        ]}
      />

      {/* AI Banner - foca em estoque */}
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando estoque, margens e giro de produtos"
        category="stock"
      />

      {/* Cards de Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusCards.map((card) => (
          <Card 
            key={card.key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              statusFilter === card.key ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === card.key ? 'all' : card.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.count}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="low_stock">Estoque Baixo</SelectItem>
              <SelectItem value="negative_stock">Estoque Negativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Custo Médio</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono">{product.code}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{product.description}</TableCell>
                  <TableCell>{product.ncm || "-"}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.final_cost || product.purchase_price || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        (product.quantity ?? 0) < 0
                          ? "text-destructive font-medium"
                          : (product.quantity ?? 0) <= (product.min_stock ?? 0)
                          ? "text-amber-600 font-medium"
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
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Histórico de Movimentação"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(product.id, product.is_active)}
                        title={product.is_active ? "Inativar" : "Ativar"}
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

      {/* Dialog do Formulário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductId ? "Editar Produto" : "Adicionar Produto"}
            </DialogTitle>
          </DialogHeader>

          <ProductForm
            initialData={editingProductData}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setInitialTab(undefined);
            }}
            isLoading={isSubmitting}
            initialTab={initialTab}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Importação CIGAM */}
      <ImportProductsCIGAMModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={() => refetch()}
      />
    </div>
  );
}
