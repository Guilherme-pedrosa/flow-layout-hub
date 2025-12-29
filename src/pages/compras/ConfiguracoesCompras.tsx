import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GripVertical, Package, CircleDollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseOrderStatuses, PurchaseOrderStatus, StockBehavior, FinancialBehavior } from "@/hooks/usePurchaseOrderStatuses";

const STOCK_BEHAVIOR_OPTIONS = [
  { value: 'none', label: 'Nenhum', description: 'Não afeta o estoque' },
  { value: 'entry', label: 'Entrada efetiva', description: 'Movimenta o estoque imediatamente' },
  { value: 'forecast', label: 'Previsão', description: 'Registra previsão de entrada' },
];

const FINANCIAL_BEHAVIOR_OPTIONS = [
  { value: 'none', label: 'Nenhum', description: 'Não afeta o financeiro' },
  { value: 'payable', label: 'Conta a pagar', description: 'Gera título de contas a pagar' },
  { value: 'forecast', label: 'Previsão', description: 'Registra previsão de pagamento' },
];

const COLOR_OPTIONS = [
  { value: '#6b7280', label: 'Cinza' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#eab308', label: 'Amarelo' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#06b6d4', label: 'Ciano' },
];

interface StatusFormData {
  name: string;
  color: string;
  stock_behavior: StockBehavior;
  financial_behavior: FinancialBehavior;
  is_default: boolean;
  is_active: boolean;
}

const initialFormData: StatusFormData = {
  name: '',
  color: '#6b7280',
  stock_behavior: 'none',
  financial_behavior: 'none',
  is_default: false,
  is_active: true,
};

export default function ConfiguracoesCompras() {
  const { statuses, isLoading, createStatus, updateStatus, deleteStatus } = usePurchaseOrderStatuses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<PurchaseOrderStatus | null>(null);
  const [statusToDelete, setStatusToDelete] = useState<PurchaseOrderStatus | null>(null);
  const [formData, setFormData] = useState<StatusFormData>(initialFormData);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Buscar company_id
    const fetchCompanyId = async () => {
      const { data } = await supabase.from("companies").select("id").limit(1);
      if (data?.[0]) {
        setCompanyId(data[0].id);
      }
    };
    fetchCompanyId();
  }, []);

  const handleOpenCreate = () => {
    setEditingStatus(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (status: PurchaseOrderStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color,
      stock_behavior: status.stock_behavior,
      financial_behavior: status.financial_behavior,
      is_default: status.is_default,
      is_active: status.is_active,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (status: PurchaseOrderStatus) => {
    setStatusToDelete(status);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (!companyId) return;

    if (editingStatus) {
      await updateStatus.mutateAsync({
        id: editingStatus.id,
        data: formData,
      });
    } else {
      await createStatus.mutateAsync({
        ...formData,
        company_id: companyId,
        display_order: statuses.length,
      });
    }

    setDialogOpen(false);
    setEditingStatus(null);
    setFormData(initialFormData);
  };

  const handleDelete = async () => {
    if (!statusToDelete) return;
    await deleteStatus.mutateAsync(statusToDelete.id);
    setDeleteDialogOpen(false);
    setStatusToDelete(null);
  };

  const getStockBehaviorBadge = (behavior: StockBehavior) => {
    const option = STOCK_BEHAVIOR_OPTIONS.find(o => o.value === behavior);
    if (behavior === 'none') return null;
    return (
      <Badge variant="outline" className="gap-1">
        <Package className="h-3 w-3" />
        {option?.label}
      </Badge>
    );
  };

  const getFinancialBehaviorBadge = (behavior: FinancialBehavior) => {
    const option = FINANCIAL_BEHAVIOR_OPTIONS.find(o => o.value === behavior);
    if (behavior === 'none') return null;
    return (
      <Badge variant="outline" className="gap-1">
        <CircleDollarSign className="h-3 w-3" />
        {option?.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações de Compras"
        description="Gerencie os status de pedidos de compra e suas regras de movimentação"
        breadcrumbs={[{ label: "Compras" }, { label: "Configurações" }]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status de Pedidos de Compra</CardTitle>
              <CardDescription>
                Configure os status disponíveis e defina o comportamento para estoque e financeiro
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum status cadastrado.</p>
              <p className="text-sm mt-1">Crie status para gerenciar os pedidos de compra.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Financeiro</TableHead>
                  <TableHead className="text-center">Padrão</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="font-medium">{status.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStockBehaviorBadge(status.stock_behavior) || (
                        <span className="text-muted-foreground text-sm">Nenhum</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getFinancialBehaviorBadge(status.financial_behavior) || (
                        <span className="text-muted-foreground text-sm">Nenhum</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {status.is_default && (
                        <Badge variant="secondary">Padrão</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status.is_active ? "default" : "secondary"}>
                        {status.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(status)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? "Editar Status" : "Novo Status"}
            </DialogTitle>
            <DialogDescription>
              Configure o nome e comportamento do status para estoque e financeiro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Status</Label>
                <Input
                  placeholder="Ex: Em Trânsito"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: formData.color }}
                        />
                        {COLOR_OPTIONS.find(c => c.value === formData.color)?.label}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Comportamento do Estoque
              </Label>
              <Select
                value={formData.stock_behavior}
                onValueChange={(value) => setFormData({ ...formData, stock_behavior: value as StockBehavior })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_BEHAVIOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4" />
                Comportamento do Financeiro
              </Label>
              <Select
                value={formData.financial_behavior}
                onValueChange={(value) => setFormData({ ...formData, financial_behavior: value as FinancialBehavior })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_BEHAVIOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label>Status padrão para novos pedidos</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingStatus ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o status "{statusToDelete?.name}"?
              <br />
              <span className="text-destructive">
                Pedidos de compra com este status ficarão sem status definido.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
