import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useStockMovements } from "@/hooks/useStockMovements";
import { usePurchaseOrderStatuses } from "@/hooks/usePurchaseOrderStatuses";
import { toast } from "sonner";
import { sugerirCfopEntrada } from "@/lib/cfops";
import {
  ImportarXMLUpload,
  FornecedorCard,
  TransportadorCard,
  FinanceiroCard,
  ImpostosCard,
  NotaFiscalCard,
  ItensNFeTable,
  CadastrarFornecedorDialog,
  CadastrarProdutoDialog,
  NFEData,
  NFEItem,
  NFEFornecedor,
  Transportador,
} from "@/components/compras";

export default function ImportarXML() {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [nfeData, setNfeData] = useState<NFEData | null>(null);
  const [notaDuplicada, setNotaDuplicada] = useState(false);
  
  // Estados para cadastro
  const [fornecedorCadastrado, setFornecedorCadastrado] = useState(false);
  const [transportadorCadastrado, setTransportadorCadastrado] = useState(false);
  
  // Estados financeiros adicionais
  const [financeiroObservacao, setFinanceiroObservacao] = useState("");
  const [planoContasId, setPlanoContasId] = useState("");
  const [centroCustoId, setCentroCustoId] = useState("");
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState("");
  
  // Dialogs
  const [dialogFornecedor, setDialogFornecedor] = useState(false);
  const [dialogTransportador, setDialogTransportador] = useState(false);
  const [dialogProduto, setDialogProduto] = useState(false);
  const [itemParaCadastrar, setItemParaCadastrar] = useState<{ index: number; item: NFEItem } | null>(null);
  
  const { products, createProduct } = useProducts();
  const { createOrder, createOrderItems } = usePurchaseOrders();
  const { createMovement } = useStockMovements();
  const { getDefaultStatus, getActiveStatuses } = usePurchaseOrderStatuses();

  // Verificar se fornecedor/transportador já estão cadastrados
  useEffect(() => {
    if (nfeData) {
      checkFornecedorCadastrado();
      checkTransportadorCadastrado();
    }
  }, [nfeData]);

  const checkFornecedorCadastrado = async () => {
    if (!nfeData?.fornecedor.cnpj) return;
    const { data } = await supabase
      .from("clientes")
      .select("id")
      .eq("cpf_cnpj", nfeData.fornecedor.cnpj)
      .maybeSingle();
    setFornecedorCadastrado(!!data);
  };

  const checkTransportadorCadastrado = async () => {
    if (!nfeData?.transportador?.cnpj) return;
    const { data } = await supabase
      .from("clientes")
      .select("id")
      .eq("cpf_cnpj", nfeData.transportador.cnpj)
      .maybeSingle();
    setTransportadorCadastrado(!!data);
  };

  const checkNotaDuplicada = async (numero: string, serie: string, cnpjFornecedor: string) => {
    const { data } = await supabase
      .from("purchase_orders")
      .select("id")
      .eq("invoice_number", numero)
      .eq("invoice_series", serie)
      .eq("supplier_cnpj", cnpjFornecedor)
      .maybeSingle();
    return !!data;
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setNotaDuplicada(false);
    
    try {
      const xmlContent = await file.text();
      
      const { data, error } = await supabase.functions.invoke('parse-xml-nfe', {
        body: { xmlContent },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Verificar duplicidade
      const isDuplicate = await checkNotaDuplicada(
        data.data.nota.numero,
        data.data.nota.serie,
        data.data.fornecedor.cnpj
      );

      if (isDuplicate) {
        setNotaDuplicada(true);
        toast.error("Esta nota fiscal já foi importada anteriormente!");
        setIsProcessing(false);
        return;
      }

      // Adicionar CFOP de entrada sugerido para cada item
      const itensComCfop = data.data.itens.map((item: any) => ({
        ...item,
        cfopEntrada: sugerirCfopEntrada(item.cfopSaida),
        criarProduto: false,
      }));

      setNfeData({ ...data.data, itens: itensComCfop });
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
    if (!nfeData) return;
    const newItens = [...nfeData.itens];
    newItens[itemIndex] = { ...newItens[itemIndex], productId, criarProduto: false };
    setNfeData({ ...nfeData, itens: newItens });
  };

  const handleCriarProduto = (itemIndex: number) => {
    if (!nfeData) return;
    setItemParaCadastrar({ index: itemIndex, item: nfeData.itens[itemIndex] });
    setDialogProduto(true);
  };

  const handleToggleCriarProduto = (itemIndex: number, criar: boolean) => {
    if (!nfeData) return;
    const newItens = [...nfeData.itens];
    newItens[itemIndex] = { ...newItens[itemIndex], criarProduto: criar, productId: criar ? undefined : newItens[itemIndex].productId };
    setNfeData({ ...nfeData, itens: newItens });
  };

  const handleCfopEntradaChange = (itemIndex: number, cfop: string) => {
    if (!nfeData) return;
    const newItens = [...nfeData.itens];
    newItens[itemIndex] = { ...newItens[itemIndex], cfopEntrada: cfop };
    setNfeData({ ...nfeData, itens: newItens });
  };

  const handleProdutoCadastrado = (productId: string) => {
    if (!nfeData || !itemParaCadastrar) return;
    const newItens = [...nfeData.itens];
    newItens[itemParaCadastrar.index] = { ...newItens[itemParaCadastrar.index], productId, criarProduto: false };
    setNfeData({ ...nfeData, itens: newItens });
    setItemParaCadastrar(null);
  };

  const handleFinalize = async () => {
    if (!nfeData) return;

    setIsProcessing(true);
    try {
      // Criar produtos marcados para auto-cadastro
      const produtosCriados: Record<number, string> = {};
      
      for (let i = 0; i < nfeData.itens.length; i++) {
        const item = nfeData.itens[i];
        if (item.criarProduto && !item.productId) {
          const result = await createProduct.mutateAsync({
            code: item.codigo,
            description: item.descricao,
            ncm: item.ncm || null,
            unit: item.unidade || "UN",
            purchase_price: item.valorUnitario,
            sale_price: item.valorUnitario * 1.3,
            quantity: 0,
            min_stock: 0,
            is_active: true,
          });
          produtosCriados[i] = result.id;
        }
      }

      // Buscar status padrão
      const defaultStatus = getDefaultStatus();

      // Criar pedido de compra com dados financeiros
      const orderData = await createOrder.mutateAsync({
        supplier_cnpj: nfeData.fornecedor.cnpj,
        supplier_name: nfeData.fornecedor.razaoSocial,
        supplier_address: `${nfeData.fornecedor.endereco}, ${nfeData.fornecedor.bairro}, ${nfeData.fornecedor.cidade}/${nfeData.fornecedor.uf}`,
        // Campos novos da NF-e
        nfe_number: nfeData.nota.numero,
        nfe_series: nfeData.nota.serie,
        nfe_date: nfeData.nota.dataEmissao,
        nfe_key: nfeData.nota.chaveAcesso || null,
        nfe_imported_at: new Date().toISOString(),
        // Campos legados (manter para compatibilidade)
        invoice_number: nfeData.nota.numero,
        invoice_series: nfeData.nota.serie,
        invoice_date: nfeData.nota.dataEmissao,
        total_value: nfeData.nota.valorTotal,
        status: defaultStatus?.name || "pendente",
        status_id: defaultStatus?.id,
        payment_method: formaPagamentoSelecionada || undefined,
        chart_account_id: planoContasId || undefined,
        cost_center_id: centroCustoId || undefined,
        financial_notes: financeiroObservacao || undefined,
      });

      // Criar itens do pedido
      const orderItems = nfeData.itens.map((item, index) => ({
        purchase_order_id: orderData.id,
        product_id: item.productId || produtosCriados[index] || null,
        xml_code: item.codigo,
        xml_description: item.descricao,
        ncm: item.ncm,
        cfop: item.cfopEntrada,
        quantity: item.quantidade,
        unit_price: item.valorUnitario,
        total_value: item.valorTotal,
      }));

      await createOrderItems.mutateAsync(orderItems);

      // IMPORTANTE: Só criar movimentação de estoque se o status tiver stock_behavior = 'entry'
      // Se for 'forecast' (em trânsito), não dá entrada no estoque - fica só como previsão
      const shouldCreateStockMovement = defaultStatus?.stock_behavior === 'entry';

      if (shouldCreateStockMovement) {
        for (let i = 0; i < nfeData.itens.length; i++) {
          const item = nfeData.itens[i];
          const productId = item.productId || produtosCriados[i];
          
          if (productId) {
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
        }
      }

      toast.success("Nota Fiscal importada com sucesso!");
      setStep("upload");
      setNfeData(null);
      setFornecedorCadastrado(false);
      setTransportadorCadastrado(false);
    } catch (error) {
      console.error("Error finalizing import:", error);
      toast.error("Erro ao finalizar importação");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelar = () => {
    setStep("upload");
    setNfeData(null);
    setNotaDuplicada(false);
    setFornecedorCadastrado(false);
    setTransportadorCadastrado(false);
    setFinanceiroObservacao("");
    setPlanoContasId("");
    setCentroCustoId("");
    setFormaPagamentoSelecionada("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar XML de NF-e"
        description="Importe notas fiscais de compra via arquivo XML"
        breadcrumbs={[{ label: "Compras" }, { label: "Importar XML" }]}
      />

      {notaDuplicada && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Nota Fiscal Duplicada</AlertTitle>
          <AlertDescription>
            Esta nota fiscal já foi importada anteriormente. Selecione outro arquivo XML.
          </AlertDescription>
        </Alert>
      )}

      {step === "upload" && (
        <ImportarXMLUpload isProcessing={isProcessing} onFileUpload={handleFileUpload} />
      )}

      {step === "review" && nfeData && (
        <div className="space-y-6">
          {/* Cards de informações */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FornecedorCard
              fornecedor={nfeData.fornecedor}
              fornecedorCadastrado={fornecedorCadastrado}
              onCadastrar={() => setDialogFornecedor(true)}
            />
            <NotaFiscalCard nota={nfeData.nota} />
            <TransportadorCard
              transportador={nfeData.transportador}
              transportadorCadastrado={transportadorCadastrado}
              onCadastrar={() => setDialogTransportador(true)}
            />
          </div>

          {/* Financeiro e Impostos */}
          <div className="grid md:grid-cols-2 gap-4">
            <FinanceiroCard
              formaPagamento={nfeData.financeiro.formaPagamento}
              parcelas={nfeData.financeiro.parcelas}
              valorTotal={nfeData.nota.valorTotal}
              observacao={financeiroObservacao}
              planoContasId={planoContasId}
              centroCustoId={centroCustoId}
              formaPagamentoSelecionada={formaPagamentoSelecionada}
              onObservacaoChange={setFinanceiroObservacao}
              onPlanoContasChange={setPlanoContasId}
              onCentroCustoChange={setCentroCustoId}
              onFormaPagamentoChange={setFormaPagamentoSelecionada}
            />
            <ImpostosCard
              impostos={nfeData.impostos}
              observacoes={nfeData.observacoes}
            />
          </div>

          {/* Tabela de Itens */}
          <ItensNFeTable
            itens={nfeData.itens}
            products={products}
            onMapProduct={handleMapProduct}
            onCriarProduto={handleCriarProduto}
            onToggleCriarProduto={handleToggleCriarProduto}
            onCfopEntradaChange={handleCfopEntradaChange}
          />

          {/* Botões de ação */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleCancelar}>
              Cancelar
            </Button>
            <Button onClick={handleFinalize} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Finalizar Importação
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CadastrarFornecedorDialog
        open={dialogFornecedor}
        onOpenChange={setDialogFornecedor}
        dados={nfeData?.fornecedor || null}
        tipo="fornecedor"
        onSuccess={() => setFornecedorCadastrado(true)}
      />

      <CadastrarFornecedorDialog
        open={dialogTransportador}
        onOpenChange={setDialogTransportador}
        dados={nfeData?.transportador || null}
        tipo="transportador"
        onSuccess={() => setTransportadorCadastrado(true)}
      />

      <CadastrarProdutoDialog
        open={dialogProduto}
        onOpenChange={setDialogProduto}
        item={itemParaCadastrar?.item || null}
        onSuccess={handleProdutoCadastrado}
      />
    </div>
  );
}
