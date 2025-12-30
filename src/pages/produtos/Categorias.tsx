import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Edit, Trash2, FolderTree, Tag } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  parent_id: string | null;
}

interface Brand {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function Categorias() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('categories');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'category' | 'brand'>('category');
  const [editingItem, setEditingItem] = useState<Category | Brand | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  // Buscar categorias
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    }
  });

  // Buscar marcas
  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ['product-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_brands')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Brand[];
    }
  });

  // Salvar categoria
  const saveCategoryMutation = useMutation({
    mutationFn: async (data: { id?: string; name: string; description: string; is_active: boolean }) => {
      if (data.id) {
        const { error } = await supabase
          .from('product_categories')
          .update({ name: data.name, description: data.description || null, is_active: data.is_active })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert({ name: data.name, description: data.description || null, is_active: data.is_active });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success(editingItem ? 'Categoria atualizada!' : 'Categoria criada!');
      handleCloseDialog();
    },
    onError: () => toast.error('Erro ao salvar categoria')
  });

  // Salvar marca
  const saveBrandMutation = useMutation({
    mutationFn: async (data: { id?: string; name: string; description: string; is_active: boolean }) => {
      if (data.id) {
        const { error } = await supabase
          .from('product_brands')
          .update({ name: data.name, description: data.description || null, is_active: data.is_active })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_brands')
          .insert({ name: data.name, description: data.description || null, is_active: data.is_active });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] });
      toast.success(editingItem ? 'Marca atualizada!' : 'Marca criada!');
      handleCloseDialog();
    },
    onError: () => toast.error('Erro ao salvar marca')
  });

  // Excluir
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Categoria excluída!');
    },
    onError: () => toast.error('Erro ao excluir categoria')
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_brands').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-brands'] });
      toast.success('Marca excluída!');
    },
    onError: () => toast.error('Erro ao excluir marca')
  });

  const handleOpenNew = (type: 'category' | 'brand') => {
    setDialogType(type);
    setEditingItem(null);
    setFormData({ name: '', description: '', is_active: true });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: Category | Brand, type: 'category' | 'brand') => {
    setDialogType(type);
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: '', description: '', is_active: true });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const data = { ...formData, id: editingItem?.id };
    if (dialogType === 'category') {
      saveCategoryMutation.mutate(data);
    } else {
      saveBrandMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, type: 'category' | 'brand') => {
    if (confirm(`Tem certeza que deseja excluir esta ${type === 'category' ? 'categoria' : 'marca'}?`)) {
      if (type === 'category') {
        deleteCategoryMutation.mutate(id);
      } else {
        deleteBrandMutation.mutate(id);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opções Auxiliares"
        description="Gerencie categorias, marcas e unidades de medida"
        breadcrumbs={[
          { label: "Produtos" },
          { label: "Opções Auxiliares" },
        ]}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Tag className="h-4 w-4" />
            Marcas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenNew('category')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCategories ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                          {cat.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(cat, 'category')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id, 'category')}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="brands" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenNew('brand')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Marca
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingBrands ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                  </TableRow>
                ) : brands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhuma marca cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  brands.map(brand => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell className="text-muted-foreground">{brand.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={brand.is_active ? 'default' : 'secondary'}>
                          {brand.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(brand, 'brand')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id, 'brand')}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar' : 'Nova'} {dialogType === 'category' ? 'Categoria' : 'Marca'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saveCategoryMutation.isPending || saveBrandMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
