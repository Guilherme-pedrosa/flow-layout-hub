import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Upload, FileText, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useStockMovements } from "@/hooks/useStockMovements";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NFEItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  productId?: string;
}

interface NFEData {
  fornecedor: { cnpj: string; razaoSocial: string; endereco: string };
  nota: { numero: string; serie: string; dataEmissao: string; valorTotal: number };
  itens: NFEItem[];
}

export default function ImportarXML() {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [nfeData, setNfeData] = useState<NFEData | null>(null);
  const [itemMappings, setItemMappings] = useState<Record<number, string>>({});
  
  const { products, createProduct } = useProducts();
  const { createOrder, createOrderItems } = usePurchaseOrders();
  const { createMovement } = useStockMovements();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const xmlContent = await file.text();
      
      const { data, error } = await supabase.functions.invoke('parse-xml-nfe', {
        body: { xmlContent },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setNfeData(data.data);
      setStep("review");
      toast.success("XML processado com sucesso!");
    } catch (error) {
      console.error("Error processing XML:", error);
      toast.error("Erro ao processar XML");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleMapProduct = (itemIndex: number, productId: string) => {
    setItemMappings(prev => ({ ...prev, [itemIndex]: productId }));
  };

  const handleFinalize = async () => {
    if (!nfeData) return;

    setIsProcessing(true);
    try {
      // Create purchase order
      const orderData = await createOrder.mutateAsync({
        supplier_cnpj: nfeData.fornecedor.cnpj,
        supplier_name: nfeData.fornecedor.razaoSocial,
        supplier_address: nfeData.fornecedor.endereco,
        invoice_number: nfeData.nota.numero,
        invoice_series: nfeData.nota.serie,
        invoice_date: nfeData.nota.dataEmissao,
        total_value: nfeData.nota.valorTotal,
        status: "finalizado",
      });

      // Create order items and stock movements
      const orderItems = nfeData.itens.map((item, index) => ({
        purchase_order_id: orderData.id,
        product_id: itemMappings[index] || null,
        xml_code: item.codigo,
        xml_description: item.descricao,
        ncm: item.ncm,
        cfop: item.cfop,
        quantity: item.quantidade,
        unit_price: item.valorUnitario,
        total_value: item.valorTotal,
      }));

      await createOrderItems.mutateAsync(orderItems);

      // Create stock movements for mapped products
      for (const [indexStr, productId] of Object.entries(itemMappings)) {
        const index = parseInt(indexStr);
        const item = nfeData.itens[index];
        
        await createMovement.mutateAsync({
          product_id: productId,
          type: "ENTRADA_COMPRA",
          quantity: item.quantidade,
          unit_price: item.valorUnitario,
          total_value: item.valorTotal,
          reason: `NF ${nfeData.nota.numero}`,
          reference_type: "purchase_order",
          reference_id: orderData.id,
        });
      }

      toast.success("Nota Fiscal importada com sucesso!");
      setStep("upload");
      setNfeData(null);
      setItemMappings({});
    } catch (error) {
      console.error("Error finalizing import:", error);
      toast.error("Erro ao finalizar importação");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar XML de NF-e"
        description="Importe notas fiscais de compra via arquivo XML"
        breadcrumbs={[{ label: "Compras" }, { label: "Importar XML" }]}
      />

      {step === "upload" && (
        <Card>
          <CardContent className="p-8">
            <Label htmlFor="xml-upload" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors">
                {isProcessing ? (
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                )}
                <p className="mt-4 text-lg font-medium">
                  {isProcessing ? "Processando..." : "Clique para selecionar um arquivo XML"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Apenas arquivos .xml são aceitos</p>
              </div>
            </Label>
            <Input id="xml-upload" type="file" accept=".xml" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
          </CardContent>
        </Card>
      )}

      {step === "review" && nfeData && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Fornecedor</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><strong>CNPJ:</strong> {nfeData.fornecedor.cnpj}</p>
                <p><strong>Razão Social:</strong> {nfeData.fornecedor.razaoSocial}</p>
                <p><strong>Endereço:</strong> {nfeData.fornecedor.endereco}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Nota Fiscal</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><strong>Número:</strong> {nfeData.nota.numero}</p>
                <p><strong>Série:</strong> {nfeData.nota.serie}</p>
                <p><strong>Data:</strong> {nfeData.nota.dataEmissao}</p>
                <p><strong>Valor Total:</strong> {formatCurrency(nfeData.nota.valorTotal)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Itens da Nota ({nfeData.itens.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código XML</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Valor Unit.</TableHead>
                    <TableHead>Produto Vinculado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nfeData.itens.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>{formatCurrency(item.valorUnitario)}</TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-between">
                              {itemMappings[index] ? products.find(p => p.id === itemMappings[index])?.description?.slice(0, 20) + "..." : "Vincular..."}
                              <ChevronsUpDown className="ml-2 h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0">
                            <Command>
                              <CommandInput placeholder="Buscar produto..." />
                              <CommandList>
                                <CommandEmpty>Nenhum produto.</CommandEmpty>
                                <CommandGroup>
                                  {products.filter(p => p.is_active).map(product => (
                                    <CommandItem key={product.id} onSelect={() => handleMapProduct(index, product.id)}>
                                      <Check className={cn("mr-2 h-4 w-4", itemMappings[index] === product.id ? "opacity-100" : "opacity-0")} />
                                      {product.code} - {product.description}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => { setStep("upload"); setNfeData(null); }}>Cancelar</Button>
            <Button onClick={handleFinalize} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Finalizar Importação
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
