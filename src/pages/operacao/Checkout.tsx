import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ShoppingCart, 
  Package, 
  Search, 
  RotateCcw, 
  Save, 
  Check,
  FileText,
  Wrench,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useCheckout, CheckoutSource, CheckoutItem } from "@/hooks/useCheckout";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

export default function Checkout() {
  const {
    salesPending,
    osPending,
    isLoading,
    getSaleCheckoutDetails,
    getOSCheckoutDetails,
    searchByNumberOrToken,
    confirmItem,
    finalizeCheckout,
    resetCheckout,
    refetch,
  } = useCheckout();

  const [activeTab, setActiveTab] = useState<"vendas" | "os">("vendas");
  const [selectedSource, setSelectedSource] = useState<CheckoutSource | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'q') {
        e.preventDefault();
        handleReset();
      }
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSource]);

  // Foca no input de código de barras quando uma fonte é selecionada
  useEffect(() => {
    if (selectedSource && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [selectedSource]);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setLoadingSource(true);
    try {
      const result = await searchByNumberOrToken(searchValue, activeTab === "vendas" ? "venda" : "os");
      if (result) {
        setSelectedSource(result);
        setSearchValue("");
      } else {
        toast.error("Pedido não encontrado");
      }
    } catch (error) {
      toast.error("Erro ao buscar pedido");
    } finally {
      setLoadingSource(false);
    }
  };

  const handleSelectFromList = async (id: string, type: "venda" | "os") => {
    setLoadingSource(true);
    try {
      const details = type === "venda" 
        ? await getSaleCheckoutDetails(id)
        : await getOSCheckoutDetails(id);
      
      if (details) {
        setSelectedSource(details);
      }
    } catch (error) {
      toast.error("Erro ao carregar detalhes");
    } finally {
      setLoadingSource(false);
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource || !barcodeInput.trim()) return;

    const barcode = barcodeInput.trim();
    
    // Procura item pelo código de barras ou código do produto
    const item = selectedSource.items.find(
      i => i.product_barcode === barcode || i.product_code === barcode
    );

    if (!item) {
      toast.error("Produto não encontrado no pedido");
      setBarcodeInput("");
      return;
    }

    if (item.quantity_pending <= 0) {
      toast.warning("Este item já foi totalmente conferido");
      setBarcodeInput("");
      return;
    }

    try {
      await confirmItem.mutateAsync({
        source: selectedSource,
        item,
        quantity: 1,
        barcode,
      });

      // Atualiza localmente
      setSelectedSource(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(i => 
            i.id === item.id 
              ? { ...i, quantity_checked: i.quantity_checked + 1, quantity_pending: i.quantity_pending - 1 }
              : i
          ),
        };
      });

      toast.success(`${item.product_description} conferido!`);
    } catch (error: any) {
      // Exibe erro de estoque diretamente - BLOQUEIO IMEDIATO
      toast.error(error.message || "Erro ao conferir item", {
        duration: 5000, // Mostra por mais tempo para o usuário ler
      });
    }

    setBarcodeInput("");
    barcodeInputRef.current?.focus();
  };

  const handleReset = async () => {
    if (!selectedSource) return;
    
    try {
      await resetCheckout.mutateAsync(selectedSource);
      setSelectedSource(null);
      refetch();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleSave = async () => {
    if (!selectedSource) return;

    const itemsChecked = selectedSource.items.filter(i => i.quantity_checked > 0);
    if (itemsChecked.length === 0) {
      toast.warning("Nenhum item foi conferido");
      return;
    }

    try {
      await finalizeCheckout.mutateAsync(selectedSource);
      setSelectedSource(null);
      refetch();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const totalItems = selectedSource?.items.reduce((sum, i) => sum + i.quantity_total, 0) || 0;
  const totalChecked = selectedSource?.items.reduce((sum, i) => sum + i.quantity_checked, 0) || 0;
  const checkedItems = selectedSource?.items.filter(i => i.quantity_checked > 0) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="Checkout"
        description="Conferência e baixa de estoque a partir de vendas e ordens de serviço"
        breadcrumbs={[{ label: "Operação" }, { label: "Checkout" }]}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 min-h-0">
        {/* Seleção de Venda/OS - Esquerda */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "vendas" | "os")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="vendas" className="gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Vendas</span>
                  </TabsTrigger>
                  <TabsTrigger value="os" className="gap-1">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">OS</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="vendas" className="mt-4 space-y-2">
                  {salesPending.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma venda pendente
                    </p>
                  ) : (
                    <ScrollArea className="h-[200px] lg:h-[calc(100vh-20rem)]">
                      <div className="space-y-2 pr-2">
                        {salesPending.map((sale: any) => (
                          <button
                            key={sale.id}
                            onClick={() => handleSelectFromList(sale.id, "venda")}
                            className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/10 ${
                              selectedSource?.id === sale.id && selectedSource?.type === 'venda'
                                ? 'border-primary bg-primary/5'
                                : sale.checkout_status === 'partial'
                                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
                                  : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium">Venda #{sale.sale_number}</div>
                              {sale.checkout_status === 'partial' && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                  Parcial
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {sale.client?.razao_social || sale.client?.nome_fantasia || 'Cliente não informado'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(sale.total_value || 0)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="os" className="mt-4 space-y-2">
                  {osPending.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma OS pendente
                    </p>
                  ) : (
                    <ScrollArea className="h-[200px] lg:h-[calc(100vh-20rem)]">
                      <div className="space-y-2 pr-2">
                        {osPending.map((os: any) => (
                          <button
                            key={os.id}
                            onClick={() => handleSelectFromList(os.id, "os")}
                            className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/10 ${
                              selectedSource?.id === os.id && selectedSource?.type === 'os'
                                ? 'border-primary bg-primary/5'
                                : os.checkout_status === 'partial'
                                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
                                  : 'border-border'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium">OS #{os.order_number}</div>
                              {os.checkout_status === 'partial' && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                  Parcial
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {os.client?.razao_social || os.client?.nome_fantasia || 'Cliente não informado'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(os.total_value || 0)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Área de conferência - Centro */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Busca por número/token */}
                <div className="flex-1 space-y-2">
                  <Label>Pedido/Rastreamento/Chave de acesso</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o número ou token..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loadingSource}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Cliente */}
                <div className="flex-1 space-y-2">
                  <Label>Cliente</Label>
                  <Input 
                    value={selectedSource?.client_name || ''} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Código do item (bipagem) */}
                <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                  <Label>Código do item</Label>
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Bipe ou digite o código..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    disabled={!selectedSource}
                  />
                </form>

                {/* Quantidade de itens */}
                <div className="space-y-2">
                  <Label>Quantidade de itens</Label>
                  <Input 
                    value={selectedSource ? `${totalChecked}/${totalItems}` : '0,0000'} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-2 h-full flex flex-col">
                <Label className="text-base font-semibold">Itens do pedido para separação</Label>
                
                {!selectedSource ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-16 w-16 mb-4 opacity-30" />
                    <p className="font-medium">Selecione uma venda ou OS</p>
                    <p className="text-sm">para iniciar a conferência</p>
                  </div>
                ) : selectedSource.items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-16 w-16 mb-4 opacity-30" />
                    <p className="font-medium">Nenhum produto neste pedido</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-center">Conferidos</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Estoque</TableHead>
                          <TableHead className="text-center w-16">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSource.items.map((item) => {
                          const isComplete = item.quantity_checked >= item.quantity_total;
                          const isPartial = item.quantity_checked > 0 && item.quantity_checked < item.quantity_total;
                          const isPending = item.quantity_checked === 0 && item.quantity_pending > 0;
                          
                          return (
                            <TableRow 
                              key={item.id}
                              className={
                                isPartial || isPending
                                  ? 'bg-yellow-50 dark:bg-yellow-950/30'
                                  : ''
                              }
                            >
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.product_description}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Cód: {item.product_code}
                                    {item.product_barcode && ` | ${item.product_barcode}`}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {item.quantity_checked}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.quantity_total}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={item.stock_available < item.quantity_pending ? 'text-destructive' : ''}>
                                  {item.stock_available}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {isComplete ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                ) : isPartial ? (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Parcial
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Pendente
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Produtos conferidos - Direita */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Check className="h-5 w-5" />
                Produtos conferidos
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {checkedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum produto conferido</p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-2 pr-2">
                    {checkedItems.map((item) => {
                      // Item parcial: conferido algo mas não completou (falta estoque ou não bipou tudo)
                      const isPartial = item.quantity_checked > 0 && item.quantity_checked < item.quantity_total;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`p-3 rounded-lg border ${
                            isPartial 
                              ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800'
                              : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{item.product_description}</div>
                            {isPartial && (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                Parcial
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              Cód: {item.product_code}
                            </span>
                            <Badge variant="secondary" className={isPartial ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                              {item.quantity_checked} / {item.quantity_total}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>

            {/* Botões de ação */}
            <div className="p-4 border-t flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleReset} 
                disabled={!selectedSource || resetCheckout.isPending}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reiniciar (alt+Q)
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!selectedSource || checkedItems.length === 0 || finalizeCheckout.isPending}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar (alt+S)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
