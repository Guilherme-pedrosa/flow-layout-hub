import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Package, 
  Search, 
  RotateCcw, 
  Save, 
  Check,
  AlertCircle,
  CheckCircle2,
  Truck,
  Sparkles,
  RefreshCw,
  X,
  Pencil,
} from "lucide-react";
import { usePurchaseReceipt, ReceiptSource, ReceiptItem } from "@/hooks/usePurchaseReceipt";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Recebimento() {
  const {
    pendingOrders,
    isLoading,
    getReceiptDetails,
    confirmItem,
    updateItemQuantity,
    finalizeReceipt,
    resetReceipt,
    refetch,
  } = usePurchaseReceipt();

  const [selectedSource, setSelectedSource] = useState<ReceiptSource | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);
  
  // AI Insight state
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);
  
  // Estado para edição de quantidade
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>("");
  
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

  // Load AI insight on mount
  useEffect(() => {
    if (pendingOrders.length > 0 && !aiDismissed) {
      loadAiInsight();
    }
  }, [pendingOrders.length]);

  const loadAiInsight = async () => {
    if (pendingOrders.length === 0) return;
    
    setAiLoading(true);
    try {
      const pendingCount = pendingOrders.filter((o: any) => o.receipt_status === 'pending').length;
      const partialCount = pendingOrders.filter((o: any) => o.receipt_status === 'partial').length;
      const totalValue = pendingOrders.reduce((sum: number, o: any) => sum + (o.total_value || 0), 0);
      
      const prompt = `Analise o recebimento de mercadorias e dê UM insight curto (máx 100 caracteres):
- Pedidos aguardando conferência: ${pendingCount}
- Pedidos com recebimento parcial: ${partialCount}
- Valor total pendente: R$ ${totalValue.toFixed(2)}
Responda APENAS com o texto do insight, sem JSON.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
          }),
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar insight');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let textBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch {
              // Incomplete JSON
            }
          }
        }
      }

      setAiInsight(fullText.trim().slice(0, 200));
    } catch (error) {
      console.error('Error loading AI insight:', error);
      setAiInsight('Confira os pedidos pendentes para dar entrada no estoque.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setLoadingSource(true);
    try {
      // Buscar por número do pedido
      const order = pendingOrders.find((o: any) => 
        o.order_number?.toString() === searchValue.trim()
      );
      
      if (order) {
        const result = await getReceiptDetails(order.id);
        if (result) {
          setSelectedSource(result);
          setSearchValue("");
        }
      } else {
        toast.error("Pedido não encontrado");
      }
    } catch (error) {
      toast.error("Erro ao buscar pedido");
    } finally {
      setLoadingSource(false);
    }
  };

  const handleSelectFromList = async (id: string) => {
    setLoadingSource(true);
    try {
      const details = await getReceiptDetails(id);
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
              ? { ...i, quantity_received: i.quantity_received + 1, quantity_pending: i.quantity_pending - 1 }
              : i
          ),
        };
      });

      toast.success(`${item.product_description} conferido!`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao conferir item", {
        duration: 5000,
      });
    }

    setBarcodeInput("");
    barcodeInputRef.current?.focus();
  };

  const handleReset = async () => {
    if (!selectedSource) return;
    
    try {
      await resetReceipt.mutateAsync(selectedSource);
      setSelectedSource(null);
      refetch();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleSave = async () => {
    if (!selectedSource) return;

    const itemsReceived = selectedSource.items.filter(i => i.quantity_received > 0);
    if (itemsReceived.length === 0) {
      toast.warning("Nenhum item foi conferido");
      return;
    }

    try {
      await finalizeReceipt.mutateAsync(selectedSource);
      setSelectedSource(null);
      refetch();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleSaveQuantity = async (item: ReceiptItem) => {
    if (!selectedSource) return;
    
    // Converte vírgula para ponto antes de parsear
    const normalizedValue = editingQuantity.replace(',', '.');
    const newQty = parseFloat(normalizedValue);
    
    if (isNaN(newQty)) {
      toast.error("Quantidade inválida");
      return;
    }
    
    if (newQty < 0 || newQty > item.quantity_total) {
      toast.error(`Quantidade deve estar entre 0 e ${item.quantity_total.toLocaleString('pt-BR')}`);
      return;
    }
    
    try {
      await updateItemQuantity.mutateAsync({
        source: selectedSource,
        item,
        newQuantity: newQty,
      });

      // Atualiza localmente
      setSelectedSource(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(i => 
            i.id === item.id 
              ? { ...i, quantity_received: newQty, quantity_pending: i.quantity_total - newQty }
              : i
          ),
        };
      });

      toast.success("Quantidade atualizada!");
      setEditingItemId(null);
      setEditingQuantity("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar quantidade");
    }
  };

  const totalItems = selectedSource?.items.reduce((sum, i) => sum + i.quantity_total, 0) || 0;
  const totalReceived = selectedSource?.items.reduce((sum, i) => sum + i.quantity_received, 0) || 0;
  const receivedItems = selectedSource?.items.filter(i => i.quantity_received > 0) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="Recebimento (Check-in)"
        description="Conferência e entrada de estoque a partir de pedidos de compra"
        breadcrumbs={[{ label: "Compras" }, { label: "Recebimento" }]}
      />

      {/* AI Insight Banner */}
      {!aiDismissed && (
        <div className="ai-banner mt-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {aiLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Analisando recebimentos...</span>
              </div>
            ) : (
              <p className="text-sm text-foreground">{aiInsight || 'Clique em atualizar para gerar insights sobre recebimentos.'}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => loadAiInsight()}
            disabled={aiLoading}
          >
            <RefreshCw className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setAiDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 min-h-0">
        {/* Lista de Pedidos de Compra - Esquerda */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Pedidos de Compra
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : pendingOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum pedido pendente
                </p>
              ) : (
                <ScrollArea className="h-[200px] lg:h-[calc(100vh-20rem)]">
                  <div className="space-y-2 pr-2">
                    {pendingOrders.map((order: any) => (
                      <button
                        key={order.id}
                        onClick={() => handleSelectFromList(order.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent/10 ${
                          selectedSource?.id === order.id
                            ? 'border-primary bg-primary/5'
                            : order.receipt_status === 'partial'
                              ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
                              : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">PC #{order.order_number}</div>
                          {order.receipt_status === 'partial' && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                              Parcial
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {order.supplier?.razao_social || order.supplier?.nome_fantasia || 'Fornecedor não informado'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(order.total_value || 0)}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Área de conferência - Centro */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Busca por número do pedido */}
                <div className="flex-1 space-y-2">
                  <Label>Número do Pedido de Compra</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o número do pedido..."
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loadingSource}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Fornecedor */}
                <div className="flex-1 space-y-2">
                  <Label>Fornecedor</Label>
                  <Input 
                    value={selectedSource?.supplier_name || ''} 
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
                    value={selectedSource ? `${totalReceived}/${totalItems}` : '0/0'} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-2 h-full flex flex-col">
                {/* Aviso de recebimento em andamento */}
                {selectedSource?.receipt_status === 'partial' && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-2">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium text-sm">Recebimento em andamento</span>
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                      Existem itens pendentes de conferência. Você pode continuar ou salvar o recebimento parcial.
                    </p>
                  </div>
                )}
                
                <Label className="text-base font-semibold">Itens do pedido para conferência</Label>
                
                {!selectedSource ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-16 w-16 mb-4 opacity-30" />
                    <p className="font-medium">Selecione um pedido de compra</p>
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
                          <TableHead className="text-center">Pendente</TableHead>
                          <TableHead className="text-center w-16">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSource.items.map((item) => {
                          const isComplete = item.quantity_received >= item.quantity_total;
                          const isPartial = item.quantity_received > 0 && item.quantity_received < item.quantity_total;
                          const isPending = item.quantity_received === 0 && item.quantity_pending > 0;
                          
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
                                {editingItemId === item.id ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={editingQuantity}
                                      onChange={(e) => {
                                        // Permite apenas números e vírgula
                                        const value = e.target.value.replace(/[^\d,]/g, '');
                                        setEditingQuantity(value);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveQuantity(item);
                                        } else if (e.key === 'Escape') {
                                          setEditingItemId(null);
                                          setEditingQuantity("");
                                        }
                                      }}
                                      className="w-20 h-7 text-center p-1"
                                      autoFocus
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleSaveQuantity(item)}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setEditingItemId(null);
                                        setEditingQuantity("");
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{item.quantity_received.toLocaleString('pt-BR')}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingItemId(item.id);
                                        setEditingQuantity(item.quantity_received.toLocaleString('pt-BR'));
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.quantity_total.toLocaleString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.quantity_pending.toLocaleString('pt-BR')}
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
              {receivedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Nenhum produto conferido</p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-2 pr-2">
                    {receivedItems.map((item) => {
                      const isPartial = item.quantity_received > 0 && item.quantity_received < item.quantity_total;
                      
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
                              {item.quantity_received.toLocaleString('pt-BR')} / {item.quantity_total.toLocaleString('pt-BR')}
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
            <div className="p-4 border-t space-y-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReset} 
                  disabled={!selectedSource || resetReceipt.isPending}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!selectedSource || receivedItems.length === 0 || finalizeReceipt.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
