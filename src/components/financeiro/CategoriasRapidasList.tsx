import { useEffect, useState } from 'react';
import { Plus, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuickCategories, useChartOfAccounts, useCostCenters, QuickCategory } from '@/hooks/useFinanceiro';

interface CategoryFormData {
  name: string;
  chart_account_id: string | null;
  default_cost_center_id: string | null;
  is_active: boolean;
}

const initialFormData: CategoryFormData = {
  name: '',
  chart_account_id: null,
  default_cost_center_id: null,
  is_active: true,
};

export function CategoriasRapidasList() {
  const { categories, loading, fetchCategories, createCategory, updateCategory, toggleCategoryStatus } = useQuickCategories();
  const { accounts, fetchAccounts } = useChartOfAccounts();
  const { costCenters, fetchCostCenters } = useCostCenters();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuickCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
    fetchCostCenters();
  }, [fetchCategories, fetchAccounts, fetchCostCenters]);

  const handleOpenDialog = (category?: QuickCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        chart_account_id: category.chart_account_id,
        default_cost_center_id: category.default_cost_center_id,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    const { data: companies } = await (await import('@/integrations/supabase/client')).supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    const companyId = companies?.[0]?.id;
    if (!companyId) return;

    if (editingCategory) {
      const success = await updateCategory(editingCategory.id, formData);
      if (success) {
        setDialogOpen(false);
        fetchCategories();
      }
    } else {
      const result = await createCategory({ ...formData, company_id: companyId });
      if (result) {
        setDialogOpen(false);
        fetchCategories();
      }
    }
  };

  const handleToggleStatus = async (category: QuickCategory) => {
    const success = await toggleCategoryStatus(category.id, !category.is_active);
    if (success) {
      fetchCategories();
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Conta Contábil</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {search ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map(category => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    {category.chart_account ? (
                      <span className="text-sm">
                        {category.chart_account.code} - {category.chart_account.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {category.cost_center ? (
                      <span className="text-sm">
                        {category.cost_center.code} - {category.cost_center.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={category.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(category)}
                    >
                      {category.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da categoria"
              />
            </div>
            
            <div>
              <Label htmlFor="account">Conta Contábil</Label>
              <Select
                value={formData.chart_account_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  chart_account_id: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {accounts.filter(a => a.is_active).map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="costCenter">Centro de Custo Padrão</Label>
              <Select
                value={formData.default_cost_center_id || 'none'}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  default_cost_center_id: value === 'none' ? null : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {costCenters.filter(c => c.is_active).map(center => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.code} - {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Categoria ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingCategory ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
