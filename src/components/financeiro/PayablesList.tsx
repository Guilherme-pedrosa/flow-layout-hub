import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MoreHorizontal,
  Send,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpFromLine,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PixPaymentForm } from "./PixPaymentForm";
import { PixPaymentsList } from "./PixPaymentsList";
import { PixApprovalList } from "./PixApprovalList";
import { toast } from "sonner";

interface Payable {
  id: string;
  amount: number;
  due_date: string;
  description: string | null;
  document_number: string | null;
  is_paid: boolean;
  paid_at: string | null;
  supplier_id: string;
  supplier?: {
    razao_social: string | null;
    nome_fantasia: string | null;
  };
}

export function PayablesList() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [showPixForm, setShowPixForm] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payables")
        .select(`
          *,
          supplier:pessoas(razao_social, nome_fantasia)
        `)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setPayables((data as unknown as Payable[]) || []);
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const { count } = await supabase
        .from("inter_pix_payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count || 0);
    } catch (error) {
      console.error("Erro ao contar pendentes:", error);
    }
  };

  useEffect(() => {
    fetchPayables();
    fetchPendingCount();
  }, []);

  const filteredPayables = payables.filter((p) => {
    const supplierName = p.supplier?.razao_social || p.supplier?.nome_fantasia || "";
    const searchLower = searchTerm.toLowerCase();
    return (
      supplierName.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower) ||
      p.document_number?.toLowerCase().includes(searchLower)
    );
  });

  const pendingPayables = filteredPayables.filter((p) => !p.is_paid);
  const paidPayables = filteredPayables.filter((p) => p.is_paid);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (payable: Payable) => {
    if (payable.is_paid) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="mr-1 h-3 w-3" />
          Pago
        </Badge>
      );
    }

    const dueDate = new Date(payable.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" />
          Vencido
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

  const handlePayWithPix = (payable: Payable) => {
    setSelectedPayable(payable);
    setShowPixForm(true);
  };

  const handlePixCreated = () => {
    fetchPayables();
    fetchPendingCount();
    setSelectedPayable(null);
  };

  const PayablesTable = ({ items }: { items: Payable[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[80px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado
            </TableCell>
          </TableRow>
        ) : (
          items.map((payable) => (
            <TableRow key={payable.id}>
              <TableCell className="font-medium">
                {payable.supplier?.razao_social || payable.supplier?.nome_fantasia || "-"}
              </TableCell>
              <TableCell>{payable.description || "-"}</TableCell>
              <TableCell>{payable.document_number || "-"}</TableCell>
              <TableCell>
                {format(new Date(payable.due_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payable.amount)}
              </TableCell>
              <TableCell>{getStatusBadge(payable)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </DropdownMenuItem>
                    {!payable.is_paid && (
                      <DropdownMenuItem onClick={() => handlePayWithPix(payable)}>
                        <Send className="mr-2 h-4 w-4" />
                        Lançar PIX
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <Tabs defaultValue="pendentes" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pendentes" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({pendingPayables.length})
            </TabsTrigger>
            <TabsTrigger value="aprovar" className="gap-2 relative">
              <ShieldCheck className="h-4 w-4" />
              Aprovar PIX
              {pendingCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
            <Button onClick={() => { setSelectedPayable(null); setShowPixForm(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Lançar PIX
            </Button>
          </div>
        </div>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowUpFromLine className="h-5 w-5 text-primary" />
                Contas Pendentes
              </CardTitle>
              <CardDescription>
                Contas a pagar aguardando pagamento. Clique em "Lançar PIX" para agendar um pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : (
                <PayablesTable items={pendingPayables} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovar">
          <PixApprovalList onApproved={handlePixCreated} />
        </TabsContent>

        <TabsContent value="historico">
          <PixPaymentsList />
        </TabsContent>
      </Tabs>

      <PixPaymentForm
        open={showPixForm}
        onOpenChange={setShowPixForm}
        payable={selectedPayable}
        onSuccess={handlePixCreated}
      />
    </>
  );
}
