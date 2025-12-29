import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Search, Building2 } from "lucide-react";
import { Supplier } from "@/hooks/useSuppliers";

interface SuppliersListProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export function SuppliersList({ suppliers, isLoading, onEdit, onToggleStatus }: SuppliersListProps) {
  const [search, setSearch] = useState("");

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = search.toLowerCase();
    return (
      supplier.razao_social.toLowerCase().includes(searchLower) ||
      supplier.nome_fantasia?.toLowerCase().includes(searchLower) ||
      supplier.cpf_cnpj?.includes(search) ||
      supplier.cidade?.toLowerCase().includes(searchLower)
    );
  });

  const formatCnpj = (value: string | null) => {
    if (!value) return "-";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhum fornecedor encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search ? "Tente ajustar sua busca" : "Cadastre o primeiro fornecedor"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNPJ/CPF</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono text-sm">
                    {formatCnpj(supplier.cpf_cnpj)}
                  </TableCell>
                  <TableCell className="font-medium">{supplier.razao_social}</TableCell>
                  <TableCell>{supplier.nome_fantasia || "-"}</TableCell>
                  <TableCell>
                    {supplier.cidade && supplier.estado
                      ? `${supplier.cidade}/${supplier.estado}`
                      : "-"}
                  </TableCell>
                  <TableCell>{supplier.telefone || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={supplier.is_active}
                      onCheckedChange={(checked) => onToggleStatus(supplier.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
