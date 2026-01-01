import { useState } from "react";
import { useServices, Service } from "@/hooks/useServices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface ServicesListProps {
  onEdit: (service: Service) => void;
  onNew: () => void;
}

export function ServicesList({ onEdit, onNew }: ServicesListProps) {
  const { services, isLoading, deleteService } = useServices();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; service: Service | null }>({
    open: false,
    service: null,
  });

  const filteredServices = services.filter((service) => {
    const search = searchTerm.toLowerCase();
    return (
      service.code?.toLowerCase().includes(search) ||
      service.description?.toLowerCase().includes(search)
    );
  });

  const handleDelete = async (): Promise<boolean> => {
    if (deleteDialog.service) {
      await deleteService.mutateAsync(deleteDialog.service.id);
      setDeleteDialog({ open: false, service: null });
      return true;
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {filteredServices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">{service.code}</span>
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="font-medium">{service.description}</p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Unidade: {service.unit}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(service.sale_price)}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(service)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteDialog({ open: true, service })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[100px]">Unidade</TableHead>
              <TableHead className="w-[140px] text-right">Preço</TableHead>
              <TableHead className="w-[100px] text-center">Status</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono">{service.code}</TableCell>
                  <TableCell>{service.description}</TableCell>
                  <TableCell>{service.unit}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(service.sale_price)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(service)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteDialog({ open: true, service })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, service: null })}
        onConfirm={handleDelete}
        title="Excluir Serviço"
        description={`Tem certeza que deseja excluir o serviço "${deleteDialog.service?.description}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
