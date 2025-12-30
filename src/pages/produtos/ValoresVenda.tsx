import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Star, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface PriceTable {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  company_id: string;
  created_at: string;
}

export default function ValoresVenda() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<PriceTable | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    is_default: false,
  });

  // Buscar tabelas de preço
  const { data: priceTables = [], isLoading } = useQuery({
    queryKey: ['price-tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_tables')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as PriceTable[];
    }
  });

  // Criar/Atualizar tabela
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      // Se marcando como default, desmarcar outras
      if (data.is_default) {
        await supabase
          .from('price_tables')
          .update({ is_default: false })
          .neq('id', data.id || '');
      }

      if (data.id) {
        const { error } = await supabase
          .from('price_tables')
          .update({
            name: data.name,
            description: data.description || null,
            is_active: data.is_active,
            is_default: data.is_default,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        // Buscar company_id
        const { data: credentials } = await supabase
          .from('inter_credentials')
          .select('company_id')
          .limit(1)
          .single();
        
        const companyId = credentials?.company_id || crypto.randomUUID();

        const { error } = await supabase
          .from('price_tables')
          .insert({
            name: data.name,
            description: data.description || null,
            is_active: data.is_active,
            is_default: data.is_default,
            company_id: companyId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-tables'] });
      toast.success(editingTable ? 'Tabela atualizada!' : 'Tabela criada!');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error saving price table:', error);
      toast.error('Erro ao salvar tabela');
    }
  });

  // Excluir tabela
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_tables')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-tables'] });
      toast.success('Tabela excluída!');
    },
    onError: (error) => {
      console.error('Error deleting price table:', error);
      toast.error('Erro ao excluir tabela');
    }
  });

  const handleOpenNew = () => {
    setEditingTable(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
      is_default: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (table: PriceTable) => {
    setEditingTable(table);
    setFormData({
      name: table.name,
      description: table.description || '',
      is_active: table.is_active,
      is_default: table.is_default,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTable(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
      is_default: false,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingTable?.id,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tabela de preços?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Valores de Venda"
        description="Gerencie tabelas de preço para diferentes canais de venda"
        breadcrumbs={[
          { label: "Produtos" },
          { label: "Valores de Venda" },
        ]}
      />

      {/* Cards informativos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{priceTables.length}</p>
                <p className="text-sm text-muted-foreground">Tabelas de Preço</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <Star className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {priceTables.filter(t => t.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {priceTables.find(t => t.is_default)?.name || 'Nenhuma'}
                </p>
                <p className="text-sm text-muted-foreground">Tabela Padrão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex justify-end">
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tabela de Preço
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : priceTables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma tabela de preço cadastrada
                </TableCell>
              </TableRow>
            ) : (
              priceTables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {table.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={table.is_active ? 'default' : 'secondary'}>
                      {table.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {table.is_default && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Star className="h-3 w-3 mr-1" />
                        Padrão
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(table)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(table.id)}
                      >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? 'Editar Tabela de Preço' : 'Nova Tabela de Preço'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Varejo, Atacado, E-commerce..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional da tabela de preços"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_default">Tabela Padrão</Label>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
