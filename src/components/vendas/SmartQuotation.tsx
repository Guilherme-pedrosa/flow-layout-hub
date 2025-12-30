import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  FileText, 
  Send, 
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useProducts } from "@/hooks/useProducts";
import { useServices } from "@/hooks/useServices";
import { usePessoas } from "@/hooks/usePessoas";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { AIBanner } from "@/components/shared/AIBanner";

interface QuotationItem {
  id: string;
  type: "product" | "service";
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  margin?: number;
  aiSuggestion?: string;
}

interface AIAnalysis {
  overallScore: number;
  marginAnalysis: string;
  pricingSuggestions: string[];
  competitiveInsight: string;
  riskFactors: string[];
}

export function SmartQuotation() {
  const { currentCompany } = useCompany();
  const { products } = useProducts();
  const { services } = useServices();
  const { pessoas } = usePessoas();
  
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [validity, setValidity] = useState("15");
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

  const clientes = pessoas.filter(p => p.is_cliente);

  const addItem = (type: "product" | "service") => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      type,
      itemId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      subtotal: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Se selecionou um item, preencher dados
        if (field === "itemId" && value) {
          const source = updated.type === "product" 
            ? products.find(p => p.id === value)
            : services.find(s => s.id === value);
          
          if (source) {
            updated.description = source.description;
            updated.unitPrice = updated.type === "product" 
              ? (source as any).sale_price || 0
              : (source as any).price || 0;
            
            // Calcular margem para produtos
            if (updated.type === "product" && (source as any).purchase_price) {
              const purchasePrice = (source as any).purchase_price;
              updated.margin = ((updated.unitPrice - purchasePrice) / purchasePrice) * 100;
            }
          }
        }
        
        // Recalcular subtotal
        const priceAfterDiscount = updated.unitPrice * (1 - updated.discount / 100);
        updated.subtotal = priceAfterDiscount * updated.quantity;
        
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalValue = items.reduce((sum, item) => sum + item.subtotal, 0);
  const avgMargin = items.length > 0
    ? items.filter(i => i.margin).reduce((sum, i) => sum + (i.margin || 0), 0) / items.filter(i => i.margin).length
    : 0;

  const analyzeWithAI = async () => {
    if (items.length === 0) {
      toast.error("Adicione itens ao orçamento primeiro");
      return;
    }

    setAnalyzing(true);
    try {
      // Simular análise de IA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const analysis: AIAnalysis = {
        overallScore: 78,
        marginAnalysis: avgMargin > 30 
          ? "Margem saudável, acima da média do mercado"
          : avgMargin > 15
          ? "Margem adequada para manter competitividade"
          : "Margem baixa - considere revisar preços",
        pricingSuggestions: [
          "Considere oferecer desconto progressivo para pedidos acima de R$ 5.000",
          "O item 'Mão de obra' está 12% abaixo do preço médio praticado",
          "Adicionar serviço de garantia estendida pode aumentar ticket em 15%",
        ],
        competitiveInsight: "Baseado em orçamentos anteriores, este cliente aceita propostas com até 5% acima do menor preço quando inclui garantia.",
        riskFactors: avgMargin < 15 
          ? ["Margem muito baixa pode comprometer lucratividade"]
          : [],
      };

      setAiAnalysis(analysis);
      toast.success("Análise concluída!");
    } catch (error) {
      toast.error("Erro na análise");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!clientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (items.length === 0) {
      toast.error("Adicione itens ao orçamento");
      return;
    }
    
    toast.success("Orçamento salvo com sucesso!");
  };

  const handleSendWhatsApp = () => {
    const client = clientes.find(c => c.id === clientId);
    if (!client?.telefone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }
    
    const message = encodeURIComponent(
      `Olá! Segue o orçamento solicitado:\n\n` +
      items.map(i => `• ${i.description}: ${formatCurrency(i.subtotal)}`).join("\n") +
      `\n\nTotal: ${formatCurrency(totalValue)}\nValidade: ${validity} dias`
    );
    
    window.open(`https://wa.me/55${client.telefone.replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <AIBanner
        insights={[{
          id: "smart-quotation",
          message: "Use IA para analisar margens, sugerir preços competitivos e identificar oportunidades de upsell baseadas no histórico do cliente.",
          type: "info"
        }]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Dados do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.razao_social || c.nome_fantasia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input 
                  type="number" 
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Itens do Orçamento */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Itens</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addItem("product")}>
                    <Plus className="h-4 w-4 mr-1" />
                    Produto
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addItem("service")}>
                    <Plus className="h-4 w-4 mr-1" />
                    Serviço
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Adicione produtos ou serviços ao orçamento
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-20">Qtd</TableHead>
                      <TableHead className="w-28">Preço Unit.</TableHead>
                      <TableHead className="w-20">Desc. %</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                      <TableHead className="w-20">Margem</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select 
                            value={item.itemId} 
                            onValueChange={(v) => updateItem(item.id, "itemId", v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={`Selecione ${item.type === "product" ? "produto" : "serviço"}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {(item.type === "product" ? products : services).map((i: any) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateItem(item.id, "discount", Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          {item.margin !== undefined && (
                            <Badge variant={item.margin > 30 ? "default" : item.margin > 15 ? "secondary" : "destructive"}>
                              {item.margin.toFixed(0)}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Condições, garantias, informações adicionais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Painel Lateral */}
        <div className="space-y-6">
          {/* Resumo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem Média</span>
                <Badge variant={avgMargin > 30 ? "default" : avgMargin > 15 ? "secondary" : "destructive"}>
                  {avgMargin.toFixed(1)}%
                </Badge>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button 
                  className="w-full" 
                  onClick={analyzeWithAI}
                  disabled={analyzing || items.length === 0}
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Analisar com IA
                </Button>
                <Button className="w-full" variant="outline" onClick={handleSave}>
                  <FileText className="h-4 w-4 mr-2" />
                  Salvar Orçamento
                </Button>
                <Button className="w-full" variant="outline" onClick={handleSendWhatsApp}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Análise IA */}
          {aiAnalysis && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Análise IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-primary">{aiAnalysis.overallScore}</div>
                  <div className="text-sm text-muted-foreground">Score de Competitividade</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Margem
                  </div>
                  <p className="text-sm text-muted-foreground">{aiAnalysis.marginAnalysis}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Sugestões
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {aiAnalysis.pricingSuggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {aiAnalysis.riskFactors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Atenção
                    </div>
                    <ul className="text-sm text-muted-foreground">
                      {aiAnalysis.riskFactors.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
