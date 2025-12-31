import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCpfCnpj } from "@/lib/formatters";
import { Label } from "@/components/ui/label";
import {
  Search,
  RefreshCw,
  Download,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  FileUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { useCompany } from "@/contexts/CompanyContext";

interface DDABoleto {
  id: string;
  linha_digitavel: string;
  codigo_barras: string | null;
  valor: number;
  valor_final: number | null;
  data_vencimento: string;
  data_emissao: string | null;
  beneficiario_nome: string | null;
  beneficiario_documento: string | null;
  beneficiario_banco: string | null;
  status: string;
  imported_to_payable_id: string | null;
  synced_at: string | null;
}

interface Supplier {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
}

export function DDABoletosList() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  
  const [boletos, setBoletos] = useState<DDABoleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "imported">("pending");
  const [importing, setImporting] = useState(false);
  const [selectedBoleto, setSelectedBoleto] = useState<DDABoleto | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  useEffect(() => {
    if (companyId) {
      fetchBoletos();
      fetchSuppliers();
    }
  }, [companyId]);

  const fetchBoletos = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inter_dda_boletos")
        .select("*")
        .eq("company_id", companyId)
        .order("data_vencimento", { ascending: true });

      if (error) throw error;
      setBoletos(data || []);
    } catch (error) {
      console.error("Erro ao carregar boletos DDA:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Buscar TODAS as pessoas ativas (não filtrar por is_fornecedor)
      const { data, error } = await supabase
        .from("pessoas")
        .select("id, razao_social, nome_fantasia, cpf_cnpj")
        .eq("is_active", true)
        .order("razao_social");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Erro ao carregar pessoas:", error);
    }
  };

  const handleSync = async () => {
    if (!companyId) {
      toast.error("Empresa não configurada");
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("inter-dda-sync", {
        body: { company_id: companyId },
      });

      if (error) throw error;

      toast.success(data?.message || "Sincronização concluída");
      fetchBoletos();
    } catch (error) {
      console.error("Erro ao sincronizar DDA:", error);
      toast.error("Erro ao sincronizar DDA. Funcionalidade requer integração com provedor de DDA.");
    } finally {
      setSyncing(false);
    }
  };

  const handleImportToPayable = async () => {
    if (!selectedBoleto || !selectedSupplierId || !companyId) {
      toast.error("Selecione um fornecedor");
      return;
    }

    setImporting(true);
    try {
      // Criar registro no payables
      const { data: payable, error: insertError } = await supabase
        .from("payables")
        .insert({
          company_id: companyId,
          supplier_id: selectedSupplierId,
          amount: selectedBoleto.valor_final || selectedBoleto.valor,
          due_date: selectedBoleto.data_vencimento,
          description: `DDA - ${selectedBoleto.beneficiario_nome || "Boleto"}`,
          document_type: "boleto",
          payment_method_type: "boleto",
          boleto_barcode: selectedBoleto.linha_digitavel,
          payment_status: "ready_to_pay",
          source: "dda",
          recipient_name: selectedBoleto.beneficiario_nome,
          recipient_document: selectedBoleto.beneficiario_documento,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Atualizar boleto DDA como importado
      await supabase
        .from("inter_dda_boletos")
        .update({
          status: "imported",
          imported_to_payable_id: payable.id,
          imported_at: new Date().toISOString(),
        })
        .eq("id", selectedBoleto.id);

      toast.success("Boleto importado para Contas a Pagar");
      setSelectedBoleto(null);
      setSelectedSupplierId("");
      fetchBoletos();
    } catch (error) {
      console.error("Erro ao importar boleto:", error);
      toast.error("Erro ao importar boleto");
    } finally {
      setImporting(false);
    }
  };

  const filteredBoletos = boletos.filter((b) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      b.beneficiario_nome?.toLowerCase().includes(searchLower) ||
      b.beneficiario_documento?.includes(searchTerm) ||
      b.linha_digitavel.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && b.status === "pending") ||
      (statusFilter === "imported" && b.status === "imported");

    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    if (status === "imported") {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="mr-1 h-3 w-3" />
          Importado
        </Badge>
      );
    }
    if (status === "paid") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <CheckCircle className="mr-1 h-3 w-3" />
          Pago
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <Clock className="mr-1 h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  const maskBarcode = (barcode: string): string => {
    if (barcode.length <= 20) return barcode;
    return `${barcode.slice(0, 10)}...${barcode.slice(-10)}`;
  };
  
  // AI Insights
  const { insights, dismiss, markAsRead } = useAiInsights('financial');
  
  // Insights locais baseados nos boletos DDA
  const localInsights = useMemo(() => {
    const result: any[] = [];
    const today = new Date();
    
    // Boletos vencendo nos próximos 3 dias
    const urgentBoletos = boletos.filter(b => {
      if (b.status !== 'pending') return false;
      const dueDate = parseISO(b.data_vencimento);
      const daysUntilDue = differenceInDays(dueDate, today);
      return daysUntilDue >= 0 && daysUntilDue <= 3;
    });
    
    if (urgentBoletos.length > 0) {
      const totalUrgent = urgentBoletos.reduce((sum, b) => sum + b.valor, 0);
      result.push({
        id: 'urgent_dda',
        type: 'warning' as const,
        category: 'financial' as const,
        mode: 'executora' as const,
        title: 'Boletos Vencendo',
        message: `Você tem ${urgentBoletos.length} boleto(s) DDA vencendo nos próximos 3 dias, totalizando R$ ${totalUrgent.toFixed(2)}. Deseja agendar o pagamento?`,
        action_label: 'Agendar',
        action_url: '/contas-pagar',
        priority: 8,
        is_read: false,
        is_dismissed: false,
        created_at: new Date().toISOString(),
      });
    }
    
    return result;
  }, [boletos]);

  return (
    <>
      {/* AI Banner */}
      <AIBannerEnhanced
        insights={[...insights, ...localInsights]}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando boletos DDA em tempo real"
        className="mb-4"
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-primary" />
                DDA - Boletos a Pagar
              </CardTitle>
              <CardDescription>
                Boletos emitidos contra o CNPJ da empresa. Sincronize e importe para Contas a Pagar.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sincronizar DDA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Aviso de integração */}
          <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700">Integração DDA pendente</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  O Banco Inter não oferece API de DDA. Para ativar esta funcionalidade, é necessário 
                  integrar com um provedor como <strong>Celcoin</strong> ou <strong>BTG Pactual</strong>.
                  Por enquanto, você pode cadastrar boletos manualmente.
                </p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por beneficiário, CNPJ ou linha digitável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: "all" | "pending" | "imported") => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="imported">Importados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredBoletos.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">Nenhum boleto DDA encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Clique em "Sincronizar DDA" para buscar boletos ou aguarde a integração.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beneficiário</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Linha Digitável</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoletos.map((boleto) => (
                  <TableRow key={boleto.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{boleto.beneficiario_nome || "—"}</span>
                        {boleto.beneficiario_documento && (
                          <span className="block text-xs text-muted-foreground">
                            {boleto.beneficiario_documento}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{maskBarcode(boleto.linha_digitavel)}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(boleto.valor_final || boleto.valor)}
                    </TableCell>
                    <TableCell>{getStatusBadge(boleto.status)}</TableCell>
                    <TableCell>
                      {boleto.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBoleto(boleto)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Importar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de importação */}
      <Dialog open={!!selectedBoleto} onOpenChange={() => setSelectedBoleto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Boleto para Contas a Pagar</DialogTitle>
            <DialogDescription>
              Selecione o fornecedor para vincular este boleto.
            </DialogDescription>
          </DialogHeader>

          {selectedBoleto && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Beneficiário:</span>
                  <span className="font-medium">{selectedBoleto.beneficiario_nome || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="font-semibold">{formatCurrency(selectedBoleto.valor_final || selectedBoleto.valor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vencimento:</span>
                  <span>{format(parseISO(selectedBoleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fornecedor *</Label>
                <SearchableSelect
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: s.nome_fantasia || s.razao_social || "Sem nome",
                    sublabel: s.cpf_cnpj ? formatCpfCnpj(s.cpf_cnpj, s.cpf_cnpj.replace(/\D/g, '').length > 11 ? "PJ" : "PF") : undefined
                  }))}
                  value={selectedSupplierId}
                  onChange={setSelectedSupplierId}
                  placeholder="Selecione o fornecedor"
                  searchPlaceholder="Buscar por nome ou CNPJ..."
                  emptyMessage="Nenhum fornecedor encontrado"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBoleto(null)}>
              Cancelar
            </Button>
            <Button onClick={handleImportToPayable} disabled={importing || !selectedSupplierId}>
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
