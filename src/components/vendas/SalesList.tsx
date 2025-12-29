import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit, Trash2, MoreVertical, DollarSign, FileText, Printer, Link, Share2, Package, CircleDollarSign, CheckCircle, Download } from "lucide-react";
import { useSales, useSaleStatuses, Sale } from "@/hooks/useSales";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

interface SalesListProps {
  onEdit: (sale: Sale) => void;
  onView: (sale: Sale) => void;
}

export function SalesList({ onEdit, onView }: SalesListProps) {
  const { sales, isLoading, updateSale, deleteSale, refetch } = useSales();
  const { statuses, getActiveStatuses } = useSaleStatuses();
  const { printDocument, printSummary, isGenerating } = useDocumentPdf();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredSales.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleDownloadBatch = async (pdfType: 'complete' | 'summary') => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos uma venda");
      return;
    }

    setIsDownloadingBatch(true);
    const zip = new JSZip();
    const errors: string[] = [];

    try {
      for (const saleId of selectedIds) {
        const sale = sales.find(s => s.id === saleId);
        if (!sale) continue;

        try {
          const { data, error } = await supabase.functions.invoke("generate-document-pdf", {
            body: {
              documentId: saleId,
              documentType: "sale",
              pdfType,
            },
          });

          if (error || !data?.html) {
            errors.push(`Venda #${sale.sale_number}`);
            continue;
          }

          // Converter HTML para blob
          const htmlBlob = new Blob([data.html], { type: 'text/html' });
          zip.file(`venda_${sale.sale_number}_${pdfType}.html`, htmlBlob);
        } catch (err) {
          errors.push(`Venda #${sale.sale_number}`);
        }
      }

      // Gerar e baixar ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendas_${pdfType}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (errors.length > 0) {
        toast.warning(`ZIP gerado com ${selectedIds.size - errors.length} arquivos. Erros: ${errors.join(', ')}`);
      } else {
        toast.success(`ZIP gerado com ${selectedIds.size} arquivos!`);
      }

      setSelectedIds(new Set());
    } catch (error) {
      console.error("Erro ao gerar ZIP:", error);
      toast.error("Erro ao gerar ZIP");
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const getStatusBadge = (sale: Sale) => {
    if (sale.status) {
      return <Badge style={{ backgroundColor: sale.status.color, color: '#fff' }}>{sale.status.name}</Badge>;
    }
    return <Badge variant="secondary">Sem status</Badge>;
  };

  const allSelected = filteredSales.length > 0 && filteredSales.every(s => selectedIds.has(s.id));
  const someSelected = selectedIds.size > 0;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar vendas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        
        {someSelected && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isDownloadingBatch}>
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloadingBatch ? "Gerando..." : "Baixar ZIP"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDownloadBatch('complete')}>
                  <FileText className="h-4 w-4 mr-2" />PDF Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadBatch('summary')}>
                  <FileText className="h-4 w-4 mr-2" />PDF Resumido
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={allSelected} 
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
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
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
            ) : (
              filteredSales.map(sale => (
                <TableRow key={sale.id} className={selectedIds.has(sale.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(sale.id)}
                      onCheckedChange={(checked) => handleSelectOne(sale.id, !!checked)}
                      aria-label={`Selecionar venda ${sale.sale_number}`}
                    />
                  </TableCell>
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