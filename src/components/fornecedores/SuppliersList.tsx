import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Edit, Search, Building2 } from "lucide-react";
import { Pessoa } from "@/hooks/usePessoas";
import { useSortableData } from "@/hooks/useSortableData";
import { SortableTableHeader } from "@/components/shared";

interface SuppliersListProps {
  suppliers: Pessoa[];
  isLoading: boolean;
  onEdit: (supplier: Pessoa) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export function SuppliersList({ suppliers, isLoading, onEdit, onToggleStatus }: SuppliersListProps) {
  const [search, setSearch] = useState("");

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = search.toLowerCase();
    return (
      supplier.razao_social?.toLowerCase().includes(searchLower) ||
      supplier.nome_fantasia?.toLowerCase().includes(searchLower) ||
      supplier.cpf_cnpj?.includes(search) ||
      supplier.cidade?.toLowerCase().includes(searchLower)
    );
  });

  // Preparar dados com campo para ordenação de localização
  const suppliersWithSortKey = filteredSuppliers.map((s) => ({
    ...s,
    _location: s.cidade && s.estado ? `${s.cidade}/${s.estado}` : "",
  }));

  const { items: sortedSuppliers, requestSort, sortConfig } = useSortableData(
    suppliersWithSortKey,
    "razao_social"
  );

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
                <SortableTableHeader
                  label="CNPJ/CPF"
                  sortKey="cpf_cnpj"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Razão Social"
                  sortKey="razao_social"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Nome Fantasia"
                  sortKey="nome_fantasia"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Cidade/UF"
                  sortKey="_location"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Telefone"
                  sortKey="telefone"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Status"
                  sortKey="is_active"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                  className="text-center"
                />
                <SortableTableHeader
                  label="Ações"
                  sortKey=""
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={() => {}}
                  className="w-[100px]"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono text-sm">
                    {formatCnpj(supplier.cpf_cnpj)}
                  </TableCell>
                  <TableCell className="font-medium">{supplier.razao_social || "-"}</TableCell>
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
