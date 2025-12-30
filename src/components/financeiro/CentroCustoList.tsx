import { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCostCenters, CostCenter } from '@/hooks/useFinanceiro';
import { AIBanner, AIInsight, DeleteConfirmDialog } from '@/components/shared';

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
  const { costCenters, loading, fetchCostCenters, createCostCenter, updateCostCenter, deleteCostCenter } = useCostCenters();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState<CostCenterFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<CostCenter | null>(null);
  const [deleteError, setDeleteError] = useState<string>();

  const aiInsights = useMemo((): AIInsight[] => {
    if (costCenters.length === 0 && !loading) {
      return [{
        id: 'no-centers',
        message: 'Centros de Custo permitem ratear despesas entre áreas da empresa. Configure para ter relatórios mais detalhados.',
        type: 'info',
        action: { label: 'Criar primeiro', onClick: () => handleOpenDialog() },
      }];
    }
    return [];
  }, [costCenters, loading]);

  useEffect(() => { fetchCostCenters(); }, [fetchCostCenters]);

  const handleOpenDialog = (center?: CostCenter) => {
    if (center) {
      setEditingCenter(center);
      setFormData({ code: center.code, name: center.name, is_active: center.is_active });
    } else {
      setEditingCenter(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const { data: companies } = await (await import('@/integrations/supabase/client')).supabase.from('companies').select('id').limit(1);
      const companyId = companies?.[0]?.id;
      if (!companyId) return;
      if (editingCenter) {
        const success = await updateCostCenter(editingCenter.id, formData);
        if (success) { setDialogOpen(false); fetchCostCenters(); }
      } else {
        const result = await createCostCenter({ ...formData, company_id: companyId });
        if (result) { setDialogOpen(false); fetchCostCenters(); }
      }
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteConfirm = async (): Promise<boolean> => {
    if (!centerToDelete) return false;
    const result = await deleteCostCenter(centerToDelete.id);
    if (!result.success) { setDeleteError(result.error); return false; }
    fetchCostCenters();
    return true;
  };

  const filteredCenters = costCenters.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <AIBanner insights={aiInsights} context="Centros de Custo" />
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => handleOpenDialog()}><Plus className="h-4 w-4 mr-2" />Novo Centro de Custo</Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filteredCenters.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{search ? 'Nenhum encontrado' : 'Nenhum cadastrado'}</TableCell></TableRow>
            ) : (
              filteredCenters.map(center => (
                <TableRow key={center.id} className="group">
                  <TableCell className="font-mono">{center.code}</TableCell>
                  <TableCell>{center.name}</TableCell>
                  <TableCell><Badge variant={center.is_active ? 'default' : 'secondary'}>{center.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(center)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setCenterToDelete(center); setDeleteError(undefined); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCenter ? 'Editar' : 'Novo'} Centro de Custo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Código *</Label><Input value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="CC001" /></div>
            <div><Label>Descrição *</Label><Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Nome" /></div>
            <div className="flex items-center gap-2"><Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))} /><Label>Ativo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}>{isSubmitting ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Excluir Centro de Custo" description="Esta ação não pode ser desfeita." itemName={centerToDelete ? `${centerToDelete.code} - ${centerToDelete.name}` : undefined} onConfirm={handleDeleteConfirm} errorMessage={deleteError} />
    </div>
  );
}
