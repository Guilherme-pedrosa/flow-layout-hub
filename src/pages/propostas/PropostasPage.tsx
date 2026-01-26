import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Eye, Edit, Trash2, Copy, Send, FileText, MoreHorizontal } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { useProposals, Proposal } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/formatters";

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviada: "bg-blue-100 text-blue-800",
  aprovada: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",
  expirada: "bg-orange-100 text-orange-800",
  cancelada: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

export default function PropostasPage() {
  const navigate = useNavigate();
  const { proposals, isLoading, createProposal, deleteProposal } = useProposals();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredProposals = proposals?.filter((proposal) => {
    const matchesSearch =
      proposal.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    try {
      const proposal = await createProposal.mutateAsync({
        titulo: "Nova Proposta Comercial",
      });
      navigate(`/propostas/${proposal.id}`);
    } catch (error) {
      console.error("Erro ao criar proposta:", error);
    }
  };

  const handleDuplicate = async (proposal: Proposal) => {
    try {
      const newProposal = await createProposal.mutateAsync({
        titulo: `${proposal.titulo} (cópia)`,
        cliente_id: proposal.cliente_id,
        cliente_nome: proposal.cliente_nome,
        cliente_cnpj_cpf: proposal.cliente_cnpj_cpf,
        cliente_endereco: proposal.cliente_endereco,
        cliente_contato: proposal.cliente_contato,
        cliente_email: proposal.cliente_email,
        cliente_telefone: proposal.cliente_telefone,
        descricao_geral: proposal.descricao_geral,
        forma_pagamento: proposal.forma_pagamento,
        condicoes_pagamento: proposal.condicoes_pagamento,
        observacoes: proposal.observacoes,
      });
      navigate(`/propostas/${newProposal.id}`);
    } catch (error) {
      console.error("Erro ao duplicar proposta:", error);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      setIsDeleting(true);
      try {
        await deleteProposal.mutateAsync(deleteId);
        setDeleteId(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Propostas Comerciais"
          description="Gerador de propostas profissionais no padrão WeDo"
          actions={
            <Button onClick={handleCreate} disabled={createProposal.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Proposta
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Input
                placeholder="Buscar por número, título ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando propostas...
              </div>
            ) : filteredProposals?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma proposta encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie sua primeira proposta comercial
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Proposta
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProposals?.map((proposal) => (
                      <TableRow
                        key={proposal.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/propostas/${proposal.id}`)}
                      >
                        <TableCell className="font-medium">
                          {proposal.numero}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {proposal.titulo}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {proposal.cliente_nome || "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(proposal.data_emissao), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(proposal.data_validade), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(proposal.valor_final)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[proposal.status]}>
                            {statusLabels[proposal.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/propostas/${proposal.id}`);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/propostas/${proposal.id}/preview`);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(proposal);
                              }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(proposal.id);
                                }}
                                className="text-destructive"
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
