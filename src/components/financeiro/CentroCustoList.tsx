import { useEffect, useState } from 'react';
import { Plus, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCostCenters, CostCenter } from '@/hooks/useFinanceiro';

interface CostCenterFormData {
  code: string;
  name: string;
  is_active: boolean;
}

const initialFormData: CostCenterFormData = {
  code: '',
  name: '',
  is_active: true,
};

export function CentroCustoList() {
  const { costCenters, loading, fetchCostCenters, createCostCenter, updateCostCenter, toggleCostCenterStatus } = useCostCenters();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState<CostCenterFormData>(initialFormData);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const handleOpenDialog = (center?: CostCenter) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        code: center.code,
        name: center.name,
        is_active: center.is_active,
      });
    } else {
      setEditingCenter(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) return;

    const { data: companies } = await (await import('@/integrations/supabase/client')).supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    const companyId = companies?.[0]?.id;
    if (!companyId) return;

    if (editingCenter) {
      const success = await updateCostCenter(editingCenter.id, formData);
      if (success) {
        setDialogOpen(false);
        fetchCostCenters();
      }
    } else {
      const result = await createCostCenter({ ...formData, company_id: companyId });
      if (result) {
        setDialogOpen(false);
        fetchCostCenters();
      }
    }
  };

  const handleToggleStatus = async (center: CostCenter) => {
    const success = await toggleCostCenterStatus(center.id, !center.is_active);
    if (success) {
      fetchCostCenters();
    }
  };

  const filteredCenters = costCenters.filter(center =>
    center.name.toLowerCase().includes(search.toLowerCase()) ||
    center.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar centro de custo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Centro de Custo
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredCenters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {search ? 'Nenhum centro de custo encontrado' : 'Nenhum centro de custo cadastrado'}
                </TableCell>
              </TableRow>
            ) : (
              filteredCenters.map(center => (
                <TableRow key={center.id}>
                  <TableCell className="font-mono">{center.code}</TableCell>
                  <TableCell>{center.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={center.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(center)}
                    >
                      {center.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(center)}
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
            <DialogTitle>{editingCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="CC001"
              />
            </div>
            
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do centro de custo"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Centro de custo ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingCenter ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
