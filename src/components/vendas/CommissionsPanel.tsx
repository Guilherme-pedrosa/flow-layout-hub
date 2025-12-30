import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator, 
  Download, 
  Loader2, 
  Users, 
  DollarSign, 
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePessoas } from "@/hooks/usePessoas";
import { formatCurrency } from "@/lib/formatters";
import { AIBanner, type AIInsight } from "@/components/shared";

interface CommissionEntry {
  sale_id: string;
  sale_number: string;
  sale_date: string;
  client_name: string;
  total_value: number;
  commission_percentage: number;
  commission_value: number;
  payment_status: 'pending' | 'paid' | 'partial';
  paid_amount: number;
  commission_on_paid: number;
}

interface SellerCommissionSummary {
  seller_id: string;
  seller_name: string;
  commission_percentage: number;
  total_sales_count: number;
  total_sales_value: number;
  total_commission: number;
  commission_on_paid_sales: number;
  commission_on_pending_sales: number;
  entries: CommissionEntry[];
}

interface CommissionResult {
  summary: {
    period: { start: string; end: string };
    sellers_count: number;
    total_sales_count: number;
    total_sales_value: number;
    total_commissions: number;
    commissions_on_paid: number;
    commissions_on_pending: number;
  };
  sellers: SellerCommissionSummary[];
  requires_human_approval: boolean;
}

export function CommissionsPanel() {
  const { currentCompany } = useCompany();
  const { colaboradores } = usePessoas();
  
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [commissionBasis, setCommissionBasis] = useState<string>("sale_date");

  const { data: commissionData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["commissions", currentCompany?.id, startDate, endDate, selectedSeller, commissionBasis],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase.functions.invoke("calculate-commissions", {
        body: {
          company_id: currentCompany.id,
          start_date: startDate,
          end_date: endDate,
          seller_id: selectedSeller === "all" ? undefined : selectedSeller,
          commission_basis: commissionBasis,
          include_pending: true
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.data as CommissionResult;
    },
    enabled: !!currentCompany?.id
  });

  const sellers = colaboradores.filter(c => c.comissao_percentual && c.comissao_percentual > 0);

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Parcial</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const generateAIInsights = (): AIInsight[] => {
    if (!commissionData) return [];
    const insights: AIInsight[] = [];
    const { summary, sellers: sellerData } = commissionData;

    if (summary.commissions_on_pending > summary.commissions_on_paid) {
      insights.push({
        id: 'pending-commissions',
        message: `${formatCurrency(summary.commissions_on_pending)} em comissões dependem de recebimento pendente`,
        type: 'warning'
      });
    }

    const topSeller = sellerData.sort((a, b) => b.total_commission - a.total_commission)[0];
    if (topSeller) {
      insights.push({
        id: 'top-seller',
        message: `${topSeller.seller_name} lidera com ${formatCurrency(topSeller.total_commission)} em comissões`,
        type: 'success'
      });
    }

    const avgCommission = summary.total_sales_value > 0 
      ? (summary.total_commissions / summary.total_sales_value) * 100 
      : 0;
    insights.push({
      id: 'avg-commission',
      message: `Taxa média de comissão: ${avgCommission.toFixed(1)}%`,
      type: 'info'
    });

    return insights;
  };

  return (
    <div className="space-y-6">
      {/* AI Banner */}
      <AIBanner
        insights={generateAIInsights()}
      />

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Apuração de Comissões
          </CardTitle>
          <CardDescription>
            Calcule comissões de vendedores por período. As comissões são apenas calculadas - não são pagas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome_fantasia || s.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Base de Cálculo</Label>
              <Select value={commissionBasis} onValueChange={setCommissionBasis}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale_date">Data da Venda</SelectItem>
                  <SelectItem value="payment_date">Data do Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => refetch()} 
                disabled={isLoading || isRefetching}
                className="w-full"
              >
                {(isLoading || isRefetching) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                Calcular
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      {commissionData && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                    <p className="text-2xl font-bold">{commissionData.summary.total_sales_count}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(commissionData.summary.total_sales_value)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700">Comissões a Pagar</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(commissionData.summary.commissions_on_paid)}
                    </p>
                    <p className="text-xs text-muted-foreground">Sobre vendas recebidas</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-700">Comissões Pendentes</p>
                    <p className="text-2xl font-bold text-amber-700">
                      {formatCurrency(commissionData.summary.commissions_on_pending)}
                    </p>
                    <p className="text-xs text-muted-foreground">Aguardando recebimento</p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Estas são apenas apurações para revisão. 
              O sistema não efetua pagamento automático de comissões - toda liberação requer aprovação do gestor.
            </AlertDescription>
          </Alert>

          {/* Detalhamento por Vendedor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Detalhamento por Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Accordion type="multiple" className="w-full">
                  {commissionData.sellers.map((seller) => (
                    <AccordionItem key={seller.seller_id} value={seller.seller_id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{seller.seller_name}</span>
                            <Badge variant="outline">{seller.commission_percentage}%</Badge>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span>{seller.total_sales_count} vendas</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(seller.commission_on_paid_sales)}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-4">
                          <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Vendido</p>
                              <p className="font-bold">{formatCurrency(seller.total_sales_value)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Comissão Total</p>
                              <p className="font-bold">{formatCurrency(seller.total_commission)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">A Receber</p>
                              <p className="font-bold text-green-600">{formatCurrency(seller.commission_on_paid_sales)}</p>
                            </div>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Venda</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-right">Comissão</TableHead>
                                <TableHead>Status Pgto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {seller.entries.map((entry) => (
                                <TableRow key={entry.sale_id}>
                                  <TableCell className="font-medium">{entry.sale_number}</TableCell>
                                  <TableCell>
                                    {format(new Date(entry.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate">
                                    {entry.client_name}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(entry.total_value)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(entry.commission_value)}
                                  </TableCell>
                                  <TableCell>
                                    {getPaymentStatusBadge(entry.payment_status)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-4">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </>
      )}

      {!commissionData && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum cálculo realizado</p>
            <p className="text-muted-foreground">Selecione o período e clique em Calcular</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
