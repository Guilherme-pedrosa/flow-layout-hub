import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Loader2,
  Star,
  Lock,
  Bot,
  Pencil,
  GripVertical
} from "lucide-react";
import { useFinancialSituations, FinancialSituation, FinancialSituationInput } from "@/hooks/useFinancialSituations";

const DEFAULT_COLORS = [
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
  "#10B981", // Green
  "#22C55E", // Bright Green
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#6B7280", // Gray
  "#14B8A6", // Teal
  "#8B5CF6", // Violet
];

export default function SituacoesFinanceiras() {
  const { 
    situations, 
    loading, 
    createSituation, 
    updateSituation, 
    deleteSituation,
    toggleActive 
  } = useFinancialSituations();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinancialSituation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState<FinancialSituation | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FinancialSituationInput>({
    name: "",
    color: DEFAULT_COLORS[0],
    is_default: false,
    confirms_payment: false,
    allows_editing: true,
    allows_manual_change: true,
    is_active: true,
  });

  const handleNew = () => {
    setEditing(null);
    setFormData({
      name: "",
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      is_default: false,
      confirms_payment: false,
      allows_editing: true,
      allows_manual_change: true,
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEdit = (situation: FinancialSituation) => {
    setEditing(situation);
    setFormData({
      name: situation.name,
      color: situation.color,
      is_default: situation.is_default,
      confirms_payment: situation.confirms_payment,
      allows_editing: situation.allows_editing,
      allows_manual_change: situation.allows_manual_change,
      is_active: situation.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = (situation: FinancialSituation) => {
    setDeleting(situation);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    await deleteSituation(deleting.id);
    setSaving(false);
    setShowDeleteDialog(false);
    setDeleting(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    if (editing) {
      await updateSituation(editing.id, formData);
    } else {
      await createSituation(formData);
    }
    setSaving(false);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Situações Financeiras"
        description="Configure os status personalizados para contas a pagar e receber"
        breadcrumbs={[
          { label: "Configurações", href: "/empresa" },
          { label: "Situações Financeiras" },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Situações</CardTitle>
            <CardDescription>
              Defina os estados possíveis para suas contas financeiras
            </CardDescription>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Situação
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : situations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma situação cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Padrão</TableHead>
                  <TableHead className="text-center">Confirma Pagto</TableHead>
                  <TableHead className="text-center">Permite Edição</TableHead>
                  <TableHead className="text-center">Alteração Manual</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {situations.map((situation) => (
                  <TableRow key={situation.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          style={{ backgroundColor: situation.color }}
                          className="text-white text-xs"
                        >
                          {situation.name}
                        </Badge>
                        {!situation.allows_manual_change && (
                          <span title="Só IA pode atribuir">
                            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {situation.is_default ? (
                        <Star className="h-4 w-4 text-amber-500 mx-auto" fill="currentColor" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {situation.confirms_payment ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {situation.allows_editing ? (
                        <Pencil className="h-4 w-4 text-muted-foreground mx-auto" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {situation.allows_manual_change ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <span title="Apenas automático">
                          <Bot className="h-4 w-4 text-blue-500 mx-auto" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={situation.is_active}
                        onCheckedChange={(checked) => toggleActive(situation.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(situation)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(situation)}
                          className="text-destructive hover:text-destructive"
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

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Legenda</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" fill="currentColor" />
            <span><strong>Padrão:</strong> Situação inicial atribuída a novas contas</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span><strong>Confirma Pagamento:</strong> Contas nesta situação são consideradas pagas</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span><strong>Não Permite Edição:</strong> Bloqueia alterações na conta quando nesta situação</span>
          </div>
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-500" />
            <span><strong>Só Automático:</strong> Apenas o sistema (IA de Conciliação) pode atribuir esta situação</span>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Situação" : "Nova Situação"}
            </DialogTitle>
            <DialogDescription>
              Configure os atributos da situação financeira
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Em análise, Aprovado, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      formData.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-8 w-8 p-0 border-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Situação Padrão</Label>
                  <p className="text-xs text-muted-foreground">Atribuída automaticamente a novas contas</p>
                </div>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Confirma Pagamento</Label>
                  <p className="text-xs text-muted-foreground">Conta é considerada paga nesta situação</p>
                </div>
                <Switch
                  checked={formData.confirms_payment}
                  onCheckedChange={(checked) => setFormData({ ...formData, confirms_payment: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permite Edição</Label>
                  <p className="text-xs text-muted-foreground">Permite alterar dados da conta</p>
                </div>
                <Switch
                  checked={formData.allows_editing}
                  onCheckedChange={(checked) => setFormData({ ...formData, allows_editing: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Alteração Manual</Label>
                  <p className="text-xs text-muted-foreground">Se desativado, só IA pode atribuir esta situação</p>
                </div>
                <Switch
                  checked={formData.allows_manual_change}
                  onCheckedChange={(checked) => setFormData({ ...formData, allows_manual_change: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Situação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a situação{" "}
              <strong>{deleting?.name}</strong>?
              <br /><br />
              Esta ação só é permitida se não houver contas usando esta situação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
