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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, MapPin, Warehouse, Search } from "lucide-react";
import { toast } from "sonner";

interface StockLocation {
  id: string;
  code: string;
  name: string;
  description: string | null;
  zone: string | null;
  aisle: string | null;
  shelf: string | null;
  level: string | null;
  is_active: boolean;
}

export default function Localizacoes() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockLocation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    zone: '',
    aisle: '',
    shelf: '',
    level: '',
    is_active: true,
  });

  // Buscar localizações
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_locations')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as StockLocation[];
    }
  });

  // Salvar localização
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description || null,
        zone: data.zone || null,
        aisle: data.aisle || null,
        shelf: data.shelf || null,
        level: data.level || null,
        is_active: data.is_active,
      };
      
      if (data.id) {
        const { error } = await supabase
          .from('stock_locations')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stock_locations')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] });
      toast.success(editingItem ? 'Localização atualizada!' : 'Localização criada!');
      handleCloseDialog();
    },
    onError: () => toast.error('Erro ao salvar localização')
  });

  // Excluir
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stock_locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] });
      toast.success('Localização excluída!');
    },
    onError: () => toast.error('Erro ao excluir. Verifique se há produtos vinculados.')
  });

  const handleOpenNew = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      zone: '',
      aisle: '',
      shelf: '',
      level: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: StockLocation) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      zone: item.zone || '',
      aisle: item.aisle || '',
      shelf: item.shelf || '',
      level: item.level || '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Código e Nome são obrigatórios');
      return;
    }
    saveMutation.mutate({ ...formData, id: editingItem?.id });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta localização?')) {
      deleteMutation.mutate(id);
    }
  };

  // Filtrar localizações
  const filteredLocations = locations.filter(loc => 
    loc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (loc.zone && loc.zone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Estatísticas
  const totalLocations = locations.length;
  const activeLocations = locations.filter(l => l.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Localizações de Estoque"
        description="Gerencie os endereços físicos do armazém (WMS)"
        breadcrumbs={[
          { label: "Produtos" },
          { label: "Localizações" },
        ]}
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Endereços</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Endereços Ativos</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeLocations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{totalLocations - activeLocations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou zona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Localização
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead>Corredor</TableHead>
              <TableHead>Prateleira</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">Carregando...</TableCell>
              </TableRow>
            ) : filteredLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhuma localização cadastrada
                </TableCell>
              </TableRow>
            ) : (
              filteredLocations.map(loc => (
                <TableRow key={loc.id}>
                  <TableCell className="font-mono font-medium">{loc.code}</TableCell>
                  <TableCell>{loc.name}</TableCell>
                  <TableCell className="text-muted-foreground">{loc.zone || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{loc.aisle || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{loc.shelf || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{loc.level || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={loc.is_active ? 'default' : 'secondary'}>
                      {loc.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(loc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(loc.id)}>
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar' : 'Nova'} Localização
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  placeholder="Ex: A-01-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Prateleira Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone">Zona</Label>
                <Input
                  id="zone"
                  placeholder="Ex: Zona A"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aisle">Corredor</Label>
                <Input
                  id="aisle"
                  placeholder="Ex: 01"
                  value={formData.aisle}
                  onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shelf">Prateleira</Label>
                <Input
                  id="shelf"
                  placeholder="Ex: A"
                  value={formData.shelf}
                  onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Nível</Label>
                <Input
                  id="level"
                  placeholder="Ex: 1"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Observações sobre a localização..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
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
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
