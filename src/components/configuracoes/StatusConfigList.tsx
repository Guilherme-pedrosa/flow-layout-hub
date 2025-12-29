import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from "lucide-react";
import { StatusConfigForm, StatusFormData } from "./StatusConfigForm";

interface StatusItem {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  stock_behavior: string;
  financial_behavior: string;
  checkout_behavior: string;
  display_order: number;
}

interface StatusConfigListProps {
  title: string;
  description: string;
  statuses: StatusItem[];
  isLoading: boolean;
  companyId: string;
  onCreateStatus: (data: StatusFormData & { company_id: string }) => void;
  onUpdateStatus: (id: string, data: Partial<StatusFormData>) => void;
  onDeleteStatus: (id: string) => void;
}

const STOCK_LABELS: Record<string, string> = {
  'none': 'Não',
  'reserve': 'Sim',
};

const FINANCIAL_LABELS: Record<string, string> = {
  'none': 'Nenhum',
  'forecast': 'Previsão',
  'effective': 'Efetivo',
};

const CHECKOUT_LABELS: Record<string, string> = {
  'none': 'Não',
  'required': 'Sim',
};

export function StatusConfigList({
  title,
  description,
  statuses,
  isLoading,
  companyId,
  onCreateStatus,
  onUpdateStatus,
  onDeleteStatus,
}: StatusConfigListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSave = (data: StatusFormData) => {
    if (editingStatus) {
      onUpdateStatus(editingStatus.id, data);
    } else {
      onCreateStatus({ ...data, company_id: companyId });
    }
    setEditingStatus(null);
  };

  const handleEdit = (status: StatusItem) => {
    setEditingStatus(status);
    setShowForm(true);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      onDeleteStatus(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={() => { setEditingStatus(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Status
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum status cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checkout</TableHead>
                  <TableHead>Reserva Estoque</TableHead>
                  <TableHead>Financeiro</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-8"></TableHead>
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
                        <Badge 
                          style={{ backgroundColor: status.color }}
                          className="text-white"
                        >
                          {status.name}
                        </Badge>
                        {status.is_default && (
                          <Badge variant="outline" className="text-xs">
                            Padrão
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {CHECKOUT_LABELS[status.checkout_behavior] || status.checkout_behavior}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {STOCK_LABELS[status.stock_behavior] || status.stock_behavior}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {FINANCIAL_LABELS[status.financial_behavior] || status.financial_behavior}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.is_active ? "default" : "secondary"}>
                        {status.is_active ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(status)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(status.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StatusConfigForm
        open={showForm}
        onOpenChange={setShowForm}
        initialData={editingStatus ? {
          ...editingStatus,
          stock_behavior: editingStatus.stock_behavior as any,
          financial_behavior: editingStatus.financial_behavior as any,
          checkout_behavior: editingStatus.checkout_behavior as any,
        } : undefined}
        onSave={handleSave}
        title="Status"
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este status? Esta ação não pode ser desfeita.
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
    </>
  );
}
