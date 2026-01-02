import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
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
import { Plus, Search, MoreHorizontal, Edit, Eye, Building2, User, Truck, Briefcase } from "lucide-react";
import { usePessoas } from "@/hooks/usePessoas";
import { formatCpfCnpj, formatTelefone } from "@/lib/formatters";
import { useSortableData } from "@/hooks/useSortableData";
import { SortableTableHeader } from "@/components/shared";

export function ClientesList() {
  const navigate = useNavigate();
  const { clientes, isLoadingClientes } = usePessoas();
  const [search, setSearch] = useState("");

  const filteredClientes = clientes.filter((cliente) => {
    const searchLower = search.toLowerCase();
    return (
      cliente.razao_social?.toLowerCase().includes(searchLower) ||
      cliente.nome_fantasia?.toLowerCase().includes(searchLower) ||
      cliente.cpf_cnpj?.includes(search) ||
      cliente.email?.toLowerCase().includes(searchLower)
    );
  });

  // Preparar dados com campo para ordenação de localização
  const clientesWithSortKey = filteredClientes.map((c) => ({
    ...c,
    _location: c.cidade && c.estado ? `${c.cidade}/${c.estado}` : "",
  }));

  const { items: sortedClientes, requestSort, sortConfig } = useSortableData(
    clientesWithSortKey,
    "razao_social"
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-success/20 text-success border-success/30">Ativo</Badge>;
      case 'inativo':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'bloqueado':
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTipoPessoaIcon = (tipo: string) => {
    if (tipo === 'PJ') {
      return <Building2 className="h-4 w-4 text-muted-foreground" />;
    }
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const getRoleBadges = (pessoa: typeof clientes[0]) => {
    const badges = [];
    if (pessoa.is_fornecedor) badges.push(<Badge key="forn" variant="outline" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />Fornecedor</Badge>);
    if (pessoa.is_transportadora) badges.push(<Badge key="transp" variant="outline" className="text-xs"><Truck className="h-3 w-3 mr-1" />Transportadora</Badge>);
    return badges;
  };

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ/CPF ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => navigate('/clientes/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHeader
                  label=""
                  sortKey="tipo_pessoa"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                  className="w-12"
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
                  label="CPF/CNPJ"
                  sortKey="cpf_cnpj"
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
                  label="Cidade/UF"
                  sortKey="_location"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Status"
                  sortKey="status"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label="Outros Papéis"
                  sortKey="is_fornecedor"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                />
                <SortableTableHeader
                  label=""
                  sortKey=""
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={() => {}}
                  className="w-12"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingClientes ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : sortedClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedClientes.map((cliente) => (
                  <TableRow key={cliente.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      {getTipoPessoaIcon(cliente.tipo_pessoa)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{cliente.razao_social || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{cliente.nome_fantasia || '-'}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {cliente.cpf_cnpj ? formatCpfCnpj(cliente.cpf_cnpj) : '-'}
                    </TableCell>
                    <TableCell>
                      {cliente.telefone ? formatTelefone(cliente.telefone) : '-'}
                    </TableCell>
                    <TableCell>
                      {cliente.cidade && cliente.estado
                        ? `${cliente.cidade}/${cliente.estado}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cliente.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoleBadges(cliente)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}/editar`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
