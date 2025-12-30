import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit, MoreVertical, DollarSign, FileText, Printer, Link, Share2, Package, CircleDollarSign, CheckCircle, Download, Trash2, Loader2 } from "lucide-react";
import { useSales, useSaleStatuses, Sale } from "@/hooks/useSales";
import { useDocumentPdf } from "@/hooks/useDocumentPdf";
import { useNFe } from "@/hooks/useNFe";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
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

interface SalesListProps {
  onEdit: (sale: Sale) => void;
  onView: (sale: Sale) => void;
}

export function SalesList({ onEdit, onView }: SalesListProps) {
  const { sales, isLoading, updateSale, deleteSale, refetch } = useSales();
  const { statuses, getActiveStatuses } = useSaleStatuses();
  const { printDocument, printSummary, isGenerating } = useDocumentPdf();
  const { emitirNFe, isEmitting, getNFeBySale, nfes } = useNFe();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [emitindoNFeId, setEmitindoNFeId] = useState<string | null>(null);
  const [showNFeDialog, setShowNFeDialog] = useState(false);
  const [selectedSaleForNFe, setSelectedSaleForNFe] = useState<Sale | null>(null);

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

  const handleEmitirNFe = async (sale: Sale) => {
    setSelectedSaleForNFe(sale);
    setShowNFeDialog(true);
  };

  const confirmEmitirNFe = async () => {
    if (!selectedSaleForNFe) return;
    
    setEmitindoNFeId(selectedSaleForNFe.id);
    setShowNFeDialog(false);
    
    try {
      await emitirNFe(selectedSaleForNFe.id);
      refetch();
    } catch (error) {
      // Error already handled in hook
    } finally {
      setEmitindoNFeId(null);
      setSelectedSaleForNFe(null);
    }
  };

  const getSaleNFeStatus = (saleId: string) => {
    const nfe = nfes.find(n => n.sale_id === saleId);
    return nfe?.status;
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

          const htmlBlob = new Blob([data.html], { type: 'text/html' });
          zip.file(`venda_${sale.sale_number}_${pdfType}.html`, htmlBlob);
        } catch (err) {
          errors.push(`Venda #${sale.sale_number}`);
        }
      }

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
      return (
        <span 
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${sale.status.color}15`, color: sale.status.color }}
        >
          {sale.status.name}
        </span>
      );
    }
    return <Badge variant="secondary">Sem status</Badge>;
  };

  const allSelected = filteredSales.length > 0 && filteredSales.every(s => selectedIds.has(s.id));
  const someSelected = selectedIds.size > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar vendas..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
        
        {someSelected && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selecionado(s)</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isDownloadingBatch}>
                  <Download className="h-4 w-4" />
                  {isDownloadingBatch ? "Gerando..." : "Baixar"}
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

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected} 
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-20">Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-28">Data</TableHead>
              <TableHead className="w-40">Situação</TableHead>
              <TableHead className="w-28 text-right">Valor</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map(sale => (
                <TableRow key={sale.id} className={selectedIds.has(sale.id) ? "bg-muted/30" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(sale.id)}
                      onCheckedChange={(checked) => handleSelectOne(sale.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{sale.sale_number}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{sale.client?.razao_social || '-'}</div>
                    {sale.client?.nome_fantasia && (
                      <div className="text-xs text-muted-foreground">{sale.client.nome_fantasia}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Select value={sale.status_id || ""} onValueChange={(value) => handleChangeStatus(sale.id, value)}>
                      <SelectTrigger className="w-36 h-8 border-0 bg-transparent hover:bg-muted/50 p-0">
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
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(sale.total_value)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView(sale)} className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(sale)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyLink(sale)}>
                            <Link className="h-4 w-4 mr-2" />Link de cobrança
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Printer className="h-4 w-4 mr-2" />Imprimir PDF
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handlePrintComplete(sale)} disabled={isGenerating}>
                                <FileText className="h-4 w-4 mr-2" />Completo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrintSummary(sale)} disabled={isGenerating}>
                                <FileText className="h-4 w-4 mr-2" />Resumido
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={emitindoNFeId === sale.id || getSaleNFeStatus(sale.id) === 'autorizado'}>
                              <FileText className="h-4 w-4 mr-2" />
                              {emitindoNFeId === sale.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Emitindo...
                                </>
                              ) : getSaleNFeStatus(sale.id) === 'autorizado' ? (
                                'NFe Emitida'
                              ) : (
                                'Emitir NF'
                              )}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem 
                                onClick={() => handleEmitirNFe(sale)}
                                disabled={emitindoNFeId === sale.id || getSaleNFeStatus(sale.id) === 'autorizado'}
                              >
                                {emitindoNFeId === sale.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 mr-2" />
                                )}
                                NF-e (Produtos)
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                <FileText className="h-4 w-4 mr-2" />NFS-e (Serviços)
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />Compartilhar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <DollarSign className="h-4 w-4 mr-2" />Ver no financeiro
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive" 
                            onClick={() => deleteSale.mutate(sale.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Excluir
                          </DropdownMenuItem>
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

      {/* Dialog de confirmação para emissão de NFe */}
      <AlertDialog open={showNFeDialog} onOpenChange={setShowNFeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emitir NF-e</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja emitir a Nota Fiscal Eletrônica para a venda #{selectedSaleForNFe?.sale_number}?
              <br /><br />
              <strong>Valor total:</strong> {selectedSaleForNFe ? formatCurrency(selectedSaleForNFe.total_value) : '-'}
              <br />
              <strong>Cliente:</strong> {selectedSaleForNFe?.client?.razao_social || selectedSaleForNFe?.client?.nome_fantasia || 'Consumidor Final'}
              <br /><br />
              <span className="text-amber-600 text-sm">
                Atenção: Esta ação enviará a nota fiscal para a SEFAZ e não poderá ser desfeita facilmente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmitirNFe}>
              Emitir NF-e
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}