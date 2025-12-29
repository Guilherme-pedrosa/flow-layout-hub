import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Send, CheckCircle, Clock, XCircle, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PixPayment {
  id: string;
  recipient_name: string;
  recipient_document: string;
  pix_key: string;
  pix_key_type: string;
  amount: number;
  description: string | null;
  status: string;
  inter_end_to_end_id: string | null;
  created_at: string;
  processed_at: string | null;
}

const PixPaymentsList = React.forwardRef<HTMLDivElement>((_, ref) => {
  const [payments, setPayments] = useState<PixPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inter_pix_payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments((data as PixPayment[]) || []);
    } catch (error) {
      console.error("Erro ao carregar pagamentos PIX:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (payment: PixPayment) => {
    setRetrying(payment.id);
    try {
      // Primeiro, atualiza o status para pending
      await supabase
        .from("inter_pix_payments")
        .update({ status: "pending", error_message: null })
        .eq("id", payment.id);

      // Chama a edge function para reprocessar
      const { data, error } = await supabase.functions.invoke("inter-pix-payment", {
        body: { paymentId: payment.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Pagamento PIX reenviado com sucesso!");
      } else {
        toast.error(data?.error || "Erro ao reenviar pagamento");
      }

      // Recarrega a lista
      await fetchPayments();
    } catch (error) {
      console.error("Erro ao reenviar pagamento:", error);
      toast.error("Erro ao reenviar pagamento PIX");
    } finally {
      setRetrying(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="mr-1 h-3 w-3" />
            Concluído
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Aguard. Aprovação
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Falhou
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  const getKeyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cpf: "CPF",
      cnpj: "CNPJ",
      email: "E-mail",
      telefone: "Telefone",
      aleatorio: "Aleatória",
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-primary" />
          Histórico de Pagamentos PIX
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Favorecido</TableHead>
                <TableHead>Chave PIX</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ID Transação</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento PIX realizado
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{payment.recipient_name}</span>
                        {payment.recipient_document && (
                          <span className="block text-xs text-muted-foreground">
                            {payment.recipient_document}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          {getKeyTypeLabel(payment.pix_key_type)}:
                        </span>
                        <span className="block text-sm truncate max-w-[150px]">
                          {payment.pix_key}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.inter_end_to_end_id ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {payment.inter_end_to_end_id.substring(0, 15)}...
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {payment.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(payment)}
                          disabled={retrying === payment.id}
                        >
                          {retrying === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Tentar novamente
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
});

PixPaymentsList.displayName = "PixPaymentsList";

export { PixPaymentsList };
