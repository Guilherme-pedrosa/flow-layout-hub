import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Package, 
  Search, 
  ChevronDown,
  ChevronUp,
  FileText,
  Wrench,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface SeparatedItem {
  id: string;
  product_code: string;
  product_description: string;
  quantity_checked: number;
  quantity_total: number;
  checked_at: string | null;
  checked_by_name: string | null;
}

interface SeparatedSource {
  id: string;
  type: 'venda' | 'os';
  number: number;
  client_name: string | null;
  checkout_status: string;
  total_value: number;
  created_at: string;
  items: SeparatedItem[];
}

export default function ItensSeparados() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"vendas" | "os">("vendas");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Busca vendas com checkout completo ou parcial
  const salesQuery = useQuery({
    queryKey: ["separated", "sales"],
    queryFn: async () => {
      const { data: sales, error } = await supabase
        .from("sales")
        .select(`
          id, sale_number, checkout_status, total_value, created_at,
          client:clientes(razao_social, nome_fantasia)
        `)
        .in("checkout_status", ["completed", "partial"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Para cada venda, buscar os itens conferidos
      const result: SeparatedSource[] = [];
      
      for (const sale of sales || []) {
        const { data: productItems } = await supabase
          .from("sale_product_items")
          .select(`
            id, quantity, product_id,
            product:products(code, description)
          `)
          .eq("sale_id", sale.id);

        if (!productItems?.length) continue;

        const { data: checkoutItems } = await supabase
          .from("sale_checkout_items")
          .select("*")
          .in("sale_product_item_id", productItems.map(p => p.id));

        // Busca movimentações de estoque para esta venda
        const { data: stockMovements } = await supabase
          .from("stock_movements")
          .select("product_id, quantity, created_at")
          .eq("reference_id", sale.id)
          .eq("reference_type", "venda")
          .eq("type", "SAIDA_VENDA");

        const items: SeparatedItem[] = productItems
          .map(item => {
            const checkout = checkoutItems?.find(c => c.sale_product_item_id === item.id);
            const stockMovement = stockMovements?.find(sm => sm.product_id === item.product_id);
            
            // Usa checkout se existir, senão usa movimentação
            const quantityChecked = checkout?.quantity_checked ?? stockMovement?.quantity ?? 0;
            if (quantityChecked === 0) return null;
            
            return {
              id: item.id,
              product_code: item.product?.code || '',
              product_description: item.product?.description || '',
              quantity_checked: quantityChecked,
              quantity_total: item.quantity,
              checked_at: checkout?.checked_at || stockMovement?.created_at || null,
              checked_by_name: null,
            };
          })
          .filter(Boolean) as SeparatedItem[];

        if (items.length > 0) {
          const client = sale.client as any;
          result.push({
            id: sale.id,
            type: 'venda',
            number: sale.sale_number,
            client_name: client?.razao_social || client?.nome_fantasia || null,
            checkout_status: sale.checkout_status || 'pending',
            total_value: sale.total_value || 0,
            created_at: sale.created_at,
            items,
          });
        }
      }

      return result;
    },
  });

  // Busca OS com checkout completo ou parcial
  const osQuery = useQuery({
    queryKey: ["separated", "os"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("service_orders")
        .select(`
          id, order_number, checkout_status, total_value, created_at,
          client:pessoas!service_orders_client_id_fkey(razao_social, nome_fantasia)
        `)
        .in("checkout_status", ["completed", "partial"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const result: SeparatedSource[] = [];
      
      for (const order of orders || []) {
        const { data: productItems } = await supabase
          .from("service_order_product_items")
          .select(`
            id, quantity, product_id,
            product:products(code, description)
          `)
          .eq("service_order_id", order.id);

        if (!productItems?.length) continue;

        const { data: checkoutItems } = await supabase
          .from("service_order_checkout_items")
          .select("*")
          .in("service_order_product_item_id", productItems.map(p => p.id));

        // Busca movimentações de estoque para esta OS
        const { data: stockMovements } = await supabase
          .from("stock_movements")
          .select("product_id, quantity, created_at")
          .eq("reference_id", order.id)
          .eq("reference_type", "os")
          .eq("type", "SAIDA_VENDA");

        const items: SeparatedItem[] = productItems
          .map(item => {
            const checkout = checkoutItems?.find(c => c.service_order_product_item_id === item.id);
            const stockMovement = stockMovements?.find(sm => sm.product_id === item.product_id);
            
            const quantityChecked = checkout?.quantity_checked ?? stockMovement?.quantity ?? 0;
            if (quantityChecked === 0) return null;
            
            return {
              id: item.id,
              product_code: item.product?.code || '',
              product_description: item.product?.description || '',
              quantity_checked: quantityChecked,
              quantity_total: item.quantity,
              checked_at: checkout?.checked_at || stockMovement?.created_at || null,
              checked_by_name: null,
            };
          })
          .filter(Boolean) as SeparatedItem[];

        if (items.length > 0) {
          const client = order.client as any;
          result.push({
            id: order.id,
            type: 'os',
            number: order.order_number,
            client_name: client?.razao_social || client?.nome_fantasia || null,
            checkout_status: order.checkout_status || 'pending',
            total_value: order.total_value || 0,
            created_at: order.created_at,
            items,
          });
        }
      }

      return result;
    },
  });

  const data = activeTab === "vendas" ? salesQuery.data : osQuery.data;
  const isLoading = activeTab === "vendas" ? salesQuery.isLoading : osQuery.isLoading;

  const filteredData = (data || []).filter(item =>
    item.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.number.toString().includes(search)
  );

  const totalItems = filteredData.reduce((sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + i.quantity_checked, 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Itens Separados"
        description="Visualize todos os itens que foram conferidos no checkout, agrupados por venda ou OS"
        breadcrumbs={[{ label: "Operação" }, { label: "Itens Separados" }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Itens Separados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(filteredData.reduce((sum, s) => sum + s.total_value, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "vendas" | "os")} className="flex-1">
              <TabsList>
                <TabsTrigger value="vendas" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Vendas ({salesQuery.data?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="os" className="gap-2">
                  <Wrench className="h-4 w-4" />
                  Ordens de Serviço ({osQuery.data?.length || 0})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-16 w-16 mb-4 opacity-30" />
              <p className="font-medium">Nenhum item separado</p>
              <p className="text-sm">Os itens aparecerão aqui após o checkout</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-26rem)]">
              <div className="space-y-2">
                {filteredData.map((source) => (
                  <Collapsible
                    key={source.id}
                    open={expandedId === source.id}
                    onOpenChange={(open) => setExpandedId(open ? source.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/5 cursor-pointer transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {source.type === 'venda' ? (
                              <FileText className="h-5 w-5 text-primary" />
                            ) : (
                              <Wrench className="h-5 w-5 text-primary" />
                            )}
                            <span className="font-semibold">
                              {source.type === 'venda' ? 'Venda' : 'OS'} #{source.number}
                            </span>
                          </div>
                          
                          <Badge variant={source.checkout_status === 'completed' ? 'default' : 'secondary'}>
                            {source.checkout_status === 'completed' ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> Completo</>
                            ) : (
                              <><Clock className="h-3 w-3 mr-1" /> Parcial</>
                            )}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">{source.client_name || 'Cliente não informado'}</div>
                            <div className="font-medium">{formatCurrency(source.total_value)}</div>
                          </div>
                          
                          <Badge variant="outline">
                            {source.items.reduce((sum, i) => sum + i.quantity_checked, 0)} itens
                          </Badge>

                          {expandedId === source.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-center">Separado</TableHead>
                              <TableHead className="text-center">Total</TableHead>
                              <TableHead>Separado por</TableHead>
                              <TableHead className="text-right">Data/Hora</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {source.items.map((item) => {
                              const isPartial = item.quantity_checked < item.quantity_total;
                              return (
                                <TableRow key={item.id} className={isPartial ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                                  <TableCell className="font-mono text-sm">{item.product_code}</TableCell>
                                  <TableCell>
                                    {item.product_description}
                                    {isPartial && (
                                      <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                        Parcial
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className={`text-center font-medium ${isPartial ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {item.quantity_checked}
                                  </TableCell>
                                  <TableCell className="text-center">{item.quantity_total}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {item.checked_by_name || '-'}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {item.checked_at 
                                      ? new Date(item.checked_at).toLocaleString('pt-BR')
                                      : '-'
                                    }
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
