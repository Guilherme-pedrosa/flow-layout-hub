import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useStockMovements } from "@/hooks/useStockMovements";
import { usePurchaseOrderStatuses } from "@/hooks/usePurchaseOrderStatuses";
import { toast } from "sonner";
import { sugerirCfopEntrada, CFOPS_ENTRADA_ESTADUAL, CFOPS_ENTRADA_INTERESTADUAL, CFOPS_ENTRADA_EXTERIOR } from "@/lib/cfops";
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
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [transportadorCadastrado, setTransportadorCadastrado] = useState(false);
  
  // Estado para CFOP geral
  const [cfopGeral, setCfopGeral] = useState<string>("");
  const [sugestaoAiCfop, setSugestaoAiCfop] = useState<string>("");
  const [loadingAiCfop, setLoadingAiCfop] = useState(false);
  
  // Estado para finalidade da nota
  const [finalidade, setFinalidade] = useState<"comercializacao" | "industrializacao" | "uso_consumo" | "ativo" | "garantia" | "outros">("comercializacao");
  
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
    
    // Buscar na tabela pessoas (fornecedores)
    const { data: pessoaData } = await supabase
      .from("pessoas")
      .select("id")
      .eq("cpf_cnpj", nfeData.fornecedor.cnpj)
      .eq("is_fornecedor", true)
      .maybeSingle();
    
    if (pessoaData) {
      setFornecedorCadastrado(true);
      setFornecedorId(pessoaData.id);
      return;
    }
    
    // Fallback para tabela clientes (legado)
    const { data: clienteData } = await supabase
      .from("clientes")
      .select("id")
      .eq("cpf_cnpj", nfeData.fornecedor.cnpj)
      .maybeSingle();
    
    setFornecedorCadastrado(!!clienteData);
    setFornecedorId(null);
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
      
      // Detectar finalidade automaticamente baseado na natureza da operação
      const natOp = (data.data.nota.naturezaOperacao || '').toLowerCase();
      if (natOp.includes('garantia') || natOp.includes('substituição') || natOp.includes('subst')) {
        setFinalidade('garantia');
        toast.info("Detectada nota de garantia - financeiro desabilitado automaticamente.");
      } else if (natOp.includes('remessa') || natOp.includes('demonstração') || natOp.includes('conserto')) {
        setFinalidade('outros');
      } else {
        setFinalidade('comercializacao');
      }
      
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

  const handleFornecedorCadastrado = async () => {
    setFornecedorCadastrado(true);
    // Recarregar para obter o ID
    await checkFornecedorCadastrado();
  };

  const sugerirCfopComIA = async () => {
    if (!nfeData) return;
    
    setLoadingAiCfop(true);
    try {
      const itensDescricao = nfeData.itens.map(i => `${i.descricao} (NCM: ${i.ncm || 'N/A'}, Qtd: ${i.quantidade})`).join('; ');
      const cfopSaida = nfeData.itens[0]?.cfopSaida || '';
      const ufFornecedor = nfeData.fornecedor.uf;
      const naturezaOperacao = nfeData.nota.naturezaOperacao || '';
      
      // UF da empresa (destino) - fixo GO por enquanto, TODO: pegar do contexto
      const ufEmpresa = "GO";
      
      // Determinar primeiro dígito do CFOP de entrada baseado na UF
      const primeiroDigitoEntrada = ufFornecedor === ufEmpresa 
        ? "1" 
        : ufFornecedor === "EX" 
          ? "3" 
          : "2";
      
      // Extrair os 3 últimos dígitos do CFOP de saída (representam a operação)
      const ultimos3Digitos = cfopSaida.slice(-3);
      
      const prompt = `Você é um especialista fiscal brasileiro. Analise a NF-e e sugira o CFOP de ENTRADA correto.

DADOS DA NF-e:
- Natureza da Operação: "${naturezaOperacao}"
- CFOP de SAÍDA do fornecedor: ${cfopSaida}
- UF do fornecedor (origem): ${ufFornecedor}
- UF da empresa (destino): ${ufEmpresa}
- Produtos: ${itensDescricao}

REGRA FUNDAMENTAL DO CFOP:
O CFOP de entrada ESPELHA o CFOP de saída, apenas trocando o primeiro dígito:
- Saída 5xxx (estadual) → Entrada 1xxx
- Saída 6xxx (interestadual) → Entrada 2xxx  
- Saída 7xxx (exportação) → Entrada 3xxx

PORTANTO: Se o CFOP de saída é ${cfopSaida}, o de entrada é ${primeiroDigitoEntrada}${ultimos3Digitos}.

INTERPRETAÇÃO DA NATUREZA DA OPERAÇÃO:
- "REMESSA" ou "GARANTIA" ou "SUBSTITUIÇÃO" → NÃO é compra, é movimentação (ex: x915, x949)
- "VENDA" ou "COMERCIALIZAÇÃO" → Compra para revenda (x102)
- "INDUSTRIALIZAÇÃO" → Compra para produção (x101)
- "CONSERTO" ou "REPARO" → Recebimento para conserto (x915)
- "DEMONSTRAÇÃO" → Demonstração (x912)
- "CONSIGNAÇÃO" → Consignação (x917)
- "DEVOLUÇÃO" → Devolução (x201, x202)

A NATUREZA "${naturezaOperacao}" indica que esta operação é: ${
  naturezaOperacao.toLowerCase().includes('garantia') || naturezaOperacao.toLowerCase().includes('remessa') 
    ? 'UMA REMESSA/GARANTIA - NÃO É COMPRA COMERCIAL! Use x949 ou CFOP específico da operação.'
    : naturezaOperacao.toLowerCase().includes('venda') 
      ? 'UMA COMPRA PARA COMERCIALIZAÇÃO - Use x102.'
      : 'Analise a natureza e escolha o CFOP apropriado.'
}

CFOP SUGERIDO: ${primeiroDigitoEntrada}${ultimos3Digitos}

Responda APENAS com o código CFOP de 4 dígitos. Sem explicações.`;

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

      if (!response.ok) throw new Error('Erro ao consultar IA');

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

      // Extrair apenas o código CFOP (4 dígitos)
      const cfopMatch = fullText.match(/\d{4}/);
      if (cfopMatch) {
        const sugeridoCfop = cfopMatch[0];
        setSugestaoAiCfop(sugeridoCfop);
        setCfopGeral(sugeridoCfop);
        
        // Aplicar a todos os itens
        const newItens = nfeData.itens.map(item => ({
          ...item,
          cfopEntrada: sugeridoCfop
        }));
        setNfeData({ ...nfeData, itens: newItens });
        
        toast.success(`CFOP sugerido: ${sugeridoCfop}`);
      }
    } catch (error) {
      console.error('Erro ao sugerir CFOP:', error);
      toast.error('Não foi possível sugerir o CFOP');
    } finally {
      setLoadingAiCfop(false);
    }
  };

  const handleCfopGeralChange = (cfop: string) => {
    setCfopGeral(cfop);
    if (!nfeData) return;
    
    // Aplicar a todos os itens
    const newItens = nfeData.itens.map(item => ({
      ...item,
      cfopEntrada: cfop
    }));
    setNfeData({ ...nfeData, itens: newItens });
  };

  const handleFinalize = async () => {
    if (!nfeData) return;
    
    // Validar CFOP obrigatório
    if (!cfopGeral) {
      toast.error("CFOP de entrada é obrigatório para cumprir a legislação fiscal");
      return;
    }

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
        supplier_id: fornecedorId || undefined,
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
    setFornecedorId(null);
    setTransportadorCadastrado(false);
    setFinanceiroObservacao("");
    setPlanoContasId("");
    setCentroCustoId("");
    setFormaPagamentoSelecionada("");
    setCfopGeral("");
    setSugestaoAiCfop("");
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

          {/* Finalidade e CFOP de Entrada - Campo Obrigatório */}
          <Card className="border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Finalidade e CFOP de Entrada
                <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo de Finalidade */}
              <div className="space-y-2">
                <Label>Finalidade da Nota</Label>
                <Select value={finalidade} onValueChange={(v: typeof finalidade) => setFinalidade(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a finalidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercializacao">Compra para Comercialização</SelectItem>
                    <SelectItem value="industrializacao">Compra para Industrialização</SelectItem>
                    <SelectItem value="uso_consumo">Uso e Consumo</SelectItem>
                    <SelectItem value="ativo">Ativo Imobilizado</SelectItem>
                    <SelectItem value="garantia">Garantia / Substituição</SelectItem>
                    <SelectItem value="outros">Outras Operações</SelectItem>
                  </SelectContent>
                </Select>
                {finalidade === "garantia" && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Notas de garantia não geram lançamentos financeiros (contas a pagar).
                  </p>
                )}
              </div>

              {/* Campo de CFOP */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Código Fiscal de Operação (obrigatório)</Label>
                  <Select value={cfopGeral} onValueChange={handleCfopGeralChange}>
                    <SelectTrigger className={!cfopGeral ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione o CFOP de entrada..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {/* Operações Estaduais */}
                      <div className="px-2 py-1.5 text-sm font-semibold text-primary bg-muted/50">
                        Estadual (1xxx)
                      </div>
                      {CFOPS_ENTRADA_ESTADUAL.map(cfop => (
                        <SelectItem key={cfop.codigo} value={cfop.codigo}>
                          {cfop.codigo} - {cfop.descricao.length > 55 ? cfop.descricao.slice(0, 55) + '...' : cfop.descricao}
                        </SelectItem>
                      ))}
                      
                      {/* Operações Interestaduais */}
                      <div className="px-2 py-1.5 text-sm font-semibold text-primary border-t mt-1 pt-1 bg-muted/50">
                        Interestadual (2xxx)
                      </div>
                      {CFOPS_ENTRADA_INTERESTADUAL.map(cfop => (
                        <SelectItem key={cfop.codigo} value={cfop.codigo}>
                          {cfop.codigo} - {cfop.descricao.length > 55 ? cfop.descricao.slice(0, 55) + '...' : cfop.descricao}
                        </SelectItem>
                      ))}
                      
                      {/* Importação */}
                      <div className="px-2 py-1.5 text-sm font-semibold text-primary border-t mt-1 pt-1 bg-muted/50">
                        Importação (3xxx)
                      </div>
                      {CFOPS_ENTRADA_EXTERIOR.map(cfop => (
                        <SelectItem key={cfop.codigo} value={cfop.codigo}>
                          {cfop.codigo} - {cfop.descricao.length > 55 ? cfop.descricao.slice(0, 55) + '...' : cfop.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline" 
                  onClick={sugerirCfopComIA}
                  disabled={loadingAiCfop}
                  className="gap-2"
                >
                  {loadingAiCfop ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Sugerir com IA
                </Button>
              </div>
              {sugestaoAiCfop && (
                <p className="text-sm text-muted-foreground">
                  IA sugeriu: <span className="font-medium text-primary">{sugestaoAiCfop}</span> com base nos produtos da nota
                </p>
              )}
              {!cfopGeral && (
                <p className="text-sm text-destructive">
                  O CFOP de entrada é obrigatório para cumprir a legislação fiscal brasileira.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Financeiro e Impostos */}
          <div className="grid md:grid-cols-2 gap-4">
            {finalidade !== "garantia" ? (
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
            ) : (
              <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                    Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠️ Notas de <strong>Garantia/Substituição</strong> não geram lançamentos financeiros (contas a pagar).
                    A entrada dos produtos será registrada apenas para controle de estoque.
                  </p>
                </CardContent>
              </Card>
            )}
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
        onSuccess={handleFornecedorCadastrado}
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
