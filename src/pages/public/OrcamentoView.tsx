import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  FileText, 
  User, 
  Calendar, 
  Package, 
  Wrench,
  CreditCard,
  Truck,
  Printer,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function OrcamentoView() {
  const { token } = useParams<{ token: string }>();

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ["public-sale", token],
    queryFn: async () => {
      if (!token) throw new Error("Token não informado");

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          client:clientes(*),
          status:sale_statuses(name, color),
          product_items:sale_product_items(
            id, quantity, unit_price, subtotal, discount_value, details,
            product:products(code, description, unit)
          ),
          service_items:sale_service_items(
            id, quantity, unit_price, subtotal, discount_value, service_description, details
          ),
          installments:sale_installments(*)
        `)
        .eq("tracking_token", token)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  // Registrar visualização
  useEffect(() => {
    if (sale?.id) {
      supabase.from("sale_quote_views").insert({
        sale_id: sale.id,
        user_agent: navigator.userAgent,
      });
    }
  }, [sale?.id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Orçamento não encontrado</h2>
              <p className="text-muted-foreground mb-4">
                O link do orçamento pode estar incorreto ou expirado.
              </p>
              <Link to="/">
                <Button variant="outline">Voltar ao início</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const client = sale.client as any;
  const status = sale.status as any;
  const productItems = sale.product_items as any[] || [];
  const serviceItems = sale.service_items as any[] || [];
  const installments = sale.installments as any[] || [];

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      {/* Header */}
      <div className="bg-background border-b print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Orçamento #{sale.sale_number}</h1>
                <p className="text-sm text-muted-foreground">
                  Emitido em {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl print:max-w-none print:px-0">
        {/* Print Header */}
        <div className="hidden print:block mb-8">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold">ORÇAMENTO #{sale.sale_number}</h1>
              <p className="text-sm text-muted-foreground">
                Data: {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {status && (
              <Badge style={{ backgroundColor: status.color }}>{status.name}</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 print:gap-4">
          {/* Status Card - apenas na tela */}
          <Card className="print:hidden">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status?.name?.toLowerCase().includes('aprovad') ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : status?.name?.toLowerCase().includes('pendent') ? (
                    <Clock className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <FileText className="h-8 w-8 text-primary" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold text-lg">{status?.name || 'Pendente'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-bold text-2xl text-primary">
                    {formatCurrency(sale.total_value || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card className="print:shadow-none print:border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Nome/Razão Social</p>
                <p className="font-medium">{client?.razao_social || '-'}</p>
              </div>
              {client?.nome_fantasia && (
                <div>
                  <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                  <p className="font-medium">{client.nome_fantasia}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                <p className="font-medium">{client?.cpf_cnpj || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{client?.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{client?.telefone || '-'}</p>
              </div>
              {client?.logradouro && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium">
                    {client.logradouro}, {client.numero}
                    {client.complemento && ` - ${client.complemento}`}
                    {client.bairro && ` - ${client.bairro}`}
                    {client.cidade && `, ${client.cidade}`}
                    {client.estado && `/${client.estado}`}
                    {client.cep && ` - CEP: ${client.cep}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Produtos */}
          {productItems.length > 0 && (
            <Card className="print:shadow-none print:border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Produtos ({productItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Unitário</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {item.product?.code || '-'}
                        </TableCell>
                        <TableCell>
                          <div>{item.product?.description || '-'}</div>
                          {item.details && (
                            <div className="text-xs text-muted-foreground">{item.details}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity} {item.product?.unit || 'UN'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Serviços */}
          {serviceItems.length > 0 && (
            <Card className="print:shadow-none print:border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4" />
                  Serviços ({serviceItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Unitário</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>{item.service_description}</div>
                          {item.details && (
                            <div className="text-xs text-muted-foreground">{item.details}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Resumo Financeiro */}
          <Card className="print:shadow-none print:border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produtos</span>
                  <span>{formatCurrency(sale.products_total || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviços</span>
                  <span>{formatCurrency(sale.services_total || 0)}</span>
                </div>
                {(sale.freight_value || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete</span>
                    <span>{formatCurrency(sale.freight_value || 0)}</span>
                  </div>
                )}
                {(sale.discount_value || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto</span>
                    <span>-{formatCurrency(sale.discount_value || 0)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(sale.total_value || 0)}</span>
                </div>
              </div>

              {/* Parcelas */}
              {installments.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Condição de Pagamento</h4>
                  <div className="grid gap-2">
                    {installments.map((inst: any) => (
                      <div key={inst.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>Parcela {inst.installment_number}</span>
                        <span className="text-muted-foreground">
                          {new Date(inst.due_date).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="font-medium">{formatCurrency(inst.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          {sale.observations && (
            <Card className="print:shadow-none print:border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{sale.observations}</p>
              </CardContent>
            </Card>
          )}

          {/* Validade */}
          <div className="text-center text-sm text-muted-foreground print:mt-8">
            <p>Este orçamento é válido por 15 dias a partir da data de emissão.</p>
            <p className="mt-1">Documento gerado eletronicamente.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
