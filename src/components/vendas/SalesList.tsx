import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit, Trash2, MoreVertical, DollarSign, FileText, Printer, Link, Share2, Package, CircleDollarSign, CheckCircle } from "lucide-react";
import { useSales, useSaleStatuses, Sale } from "@/hooks/useSales";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import { formatCurrency } from "@/lib/formatters";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { toast } from "sonner";

interface SalesListProps {
  onEdit: (sale: Sale) => void;
  onView: (sale: Sale) => void;
}

export function SalesList({ onEdit, onView }: SalesListProps) {
  const { sales, isLoading, updateSale, deleteSale, refetch } = useSales();
  const { statuses, getActiveStatuses } = useSaleStatuses();
  const { printDocument, printSummary, isGenerating } = useDocumentPdf();
  const [search, setSearch] = useState("");

  const activeStatuses = getActiveStatuses();

  const filteredSales = sales.filter(s => 
    s.client?.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
    s.client?.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
    s.sale_number?.toString().includes(search)
  );

  const handleCopyLink = (sale: Sale) => {
    const url = `${window.location.origin}/orcamento/${sale.tracking_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handlePrintComplete = async (sale: Sale) => {
    await printDocument(sale.id, "sale");
  };

  const handlePrintSummary = async (sale: Sale) => {
    await printSummary(sale.id, "sale");
  };

  const handleChangeStatus = async (saleId: string, newStatusId: string) => {
    const newStatus = statuses.find(s => s.id === newStatusId);
    if (!newStatus) return;

    try {
      await updateSale.mutateAsync({ id: saleId, sale: { status_id: newStatusId } });
      refetch();
      toast.success(`Status alterado para "${newStatus.name}"`);
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const getStatusBadge = (sale: Sale) => {
    if (sale.status) {
      return <Badge style={{ backgroundColor: sale.status.color, color: '#fff' }}>{sale.status.name}</Badge>;
    }
    return <Badge variant="secondary">Sem status</Badge>;
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar vendas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[120px]">Data</TableHead>
              <TableHead className="w-[180px]">Situação</TableHead>
              <TableHead className="w-[120px] text-right">Valor</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
            ) : (
              filteredSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.sale_number}</TableCell>
                  <TableCell>
                    <div>{sale.client?.razao_social || '-'}</div>
                    {sale.client?.nome_fantasia && <div className="text-sm text-muted-foreground">({sale.client.nome_fantasia})</div>}
                  </TableCell>
                  <TableCell>{new Date(sale.sale_date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Select value={sale.status_id || ""} onValueChange={(value) => handleChangeStatus(sale.id, value)}>
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue>{getStatusBadge(sale)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {activeStatuses.map(status => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                              <span>{status.name}</span>
                              {status.stock_behavior !== 'none' && <Package className="h-3 w-3 text-muted-foreground" />}
                              {status.financial_behavior !== 'none' && <CircleDollarSign className="h-3 w-3 text-muted-foreground" />}
                              {status.checkout_behavior === 'required' && <CheckCircle className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(sale.total_value)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView(sale)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(sale)}><Edit className="h-4 w-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyLink(sale)}><Link className="h-4 w-4 mr-2" />Link de cobrança</DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Printer className="h-4 w-4 mr-2" />Imprimir PDF</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handlePrintComplete(sale)} disabled={isGenerating}><FileText className="h-4 w-4 mr-2" />Completo</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintSummary(sale)} disabled={isGenerating}><FileText className="h-4 w-4 mr-2" />Resumido</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><FileText className="h-4 w-4 mr-2" />Emitir</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem>NF-e (Produtos)</DropdownMenuItem>
                              <DropdownMenuItem>NFS-e (Serviços)</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem><Share2 className="h-4 w-4 mr-2" />Compartilhar</DropdownMenuItem>
                          <DropdownMenuItem><DollarSign className="h-4 w-4 mr-2" />Ver no financeiro</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteSale.mutate(sale.id)}><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
