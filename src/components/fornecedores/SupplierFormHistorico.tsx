import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShoppingCart, Package } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface SupplierFormHistoricoProps {
  pessoaId?: string;
}

export function SupplierFormHistorico({ pessoaId }: SupplierFormHistoricoProps) {
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["supplier-purchase-history", pessoaId],
    queryFn: async () => {
      if (!pessoaId) return [];
      
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          id,
          order_number,
          created_at,
          total_value,
          status_id,
          purchase_order_statuses(name, color)
        `)
        .eq("supplier_id", pessoaId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!pessoaId,
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["supplier-payables-history", pessoaId],
    queryFn: async () => {
      if (!pessoaId) return [];
      
      const { data, error } = await supabase
        .from("payables")
        .select("*")
        .eq("supplier_id", pessoaId)
        .order("due_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!pessoaId,
  });

  // Calcular estatísticas
  const totalCompras = purchaseOrders.reduce((acc, po) => acc + (po.total_value || 0), 0);
  const totalPago = payables.filter(p => p.is_paid).reduce((acc, p) => acc + (p.paid_amount || 0), 0);
  const totalPendente = payables.filter(p => !p.is_paid).reduce((acc, p) => acc + p.amount, 0);

  if (!pessoaId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Salve o fornecedor primeiro para ver o histórico.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total em Compras</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalCompras)}</div>
            <div className="text-xs text-muted-foreground">{purchaseOrders.length} pedidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Pago</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">A Pagar</div>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendente)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pedidos de Compra */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pedidos de Compra Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono">{po.order_number}</TableCell>
                    <TableCell>
                      {po.created_at 
                        ? format(new Date(po.created_at), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {po.purchase_order_statuses ? (
                        <Badge 
                          style={{ backgroundColor: po.purchase_order_statuses.color }}
                          className="text-white"
                        >
                          {po.purchase_order_statuses.name}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(po.total_value || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              Nenhum pedido de compra encontrado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contas a Pagar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas a Pagar Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {payables.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.description || p.document_number || "-"}</TableCell>
                    <TableCell>
                      {p.due_date 
                        ? format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_paid ? "default" : "secondary"}>
                        {p.is_paid ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma conta a pagar encontrada.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
