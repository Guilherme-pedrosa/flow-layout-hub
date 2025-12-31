import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, Loader2, AlertTriangle, Truck } from "lucide-react";
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
import { useProductCostCalculation } from "@/hooks/useProductCostCalculation";
import { usePayablesGeneration } from "@/hooks/usePayablesGeneration";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { sugerirCfopEntrada, CFOPS_ENTRADA_ESTADUAL, CFOPS_ENTRADA_INTERESTADUAL, CFOPS_ENTRADA_EXTERIOR, CFOPOption } from "@/lib/cfops";
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
  CTEData,
} from "@/components/compras";
import { XMLFileResult } from "@/components/compras/ImportarXMLUpload";
import { Badge } from "@/components/ui/badge";

export default function ImportarXML() {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [nfeData, setNfeData] = useState<NFEData | null>(null);
  const [cteData, setCteData] = useState<CTEData | null>(null);
  const [processedFiles, setProcessedFiles] = useState<{ fileName: string; type: "nfe" | "cte"; success: boolean }[]>([]);
  const [notaDuplicada, setNotaDuplicada] = useState(false);
  
  // Estados para cadastro
  const [fornecedorCadastrado, setFornecedorCadastrado] = useState(false);
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [transportadorId, setTransportadorId] = useState<string | null>(null);
  const [transportadorCadastrado, setTransportadorCadastrado] = useState(false);
  
  // Estado para validação de produtos
  const [produtosValidos, setProdutosValidos] = useState(false);
  const [produtosPendentes, setProdutosPendentes] = useState(0);
  
  // Listas de fornecedores e transportadores disponíveis para vinculação
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<{ id: string; razao_social: string | null; cpf_cnpj: string | null }[]>([]);
  const [transportadoresDisponiveis, setTransportadoresDisponiveis] = useState<{ id: string; razao_social: string | null; cpf_cnpj: string | null }[]>([]);
  
  // Estado para CFOP geral
  const [cfopGeral, setCfopGeral] = useState<string>("");
  
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
  const { createOrder, createOrderItems, createOrderInstallments } = usePurchaseOrders();
  const { createMovement } = useStockMovements();
  const { getDefaultStatus, getActiveStatuses } = usePurchaseOrderStatuses();
  const { calculateAllItemCosts, rateFreightToItems } = useProductCostCalculation();
  const { generatePayables } = usePayablesGeneration();
  const { currentCompany } = useCompany();

  // Carregar fornecedores e transportadores disponíveis
  useEffect(() => {
    loadFornecedoresDisponiveis();
    loadTransportadoresDisponiveis();
  }, []);

  // Verificar se fornecedor/transportador já estão cadastrados
  useEffect(() => {
    if (nfeData) {
      checkFornecedorCadastrado();
      checkTransportadorCadastrado();
    }
  }, [nfeData]);

  const loadFornecedoresDisponiveis = async () => {
    const { data } = await supabase
      .from("pessoas")
      .select("id, razao_social, cpf_cnpj")
      .eq("is_fornecedor", true)
      .eq("is_active", true)
      .order("razao_social");
    
    if (data) {
      setFornecedoresDisponiveis(data);
    }
  };

  const loadTransportadoresDisponiveis = async () => {
    // Transportadores também são fornecedores geralmente
    const { data } = await supabase
      .from("pessoas")
      .select("id, razao_social, cpf_cnpj")
      .eq("is_fornecedor", true)
      .eq("is_active", true)
      .order("razao_social");
    
    if (data) {
      setTransportadoresDisponiveis(data);
    }
  };

  const handleVincularFornecedor = (id: string) => {
    setFornecedorId(id);
    setFornecedorCadastrado(true);
  };

  const handleVincularTransportador = (id: string) => {
    setTransportadorId(id);
    setTransportadorCadastrado(true);
  };

  const checkFornecedorCadastrado = async () => {
    if (!nfeData?.fornecedor.cnpj) return;
    
    // Buscar na tabela unificada pessoas (fornecedores)
    const { data: pessoaData } = await supabase
      .from("pessoas")
      .select("id")
      .eq("cpf_cnpj", nfeData.fornecedor.cnpj)
      .eq("is_fornecedor", true)
      .maybeSingle();
    
    if (pessoaData) {
      setFornecedorCadastrado(true);
      setFornecedorId(pessoaData.id);
    } else {
      setFornecedorCadastrado(false);
      setFornecedorId(null);
    }
  };

  const checkTransportadorCadastrado = async () => {
    if (!nfeData?.transportador?.cnpj) return;
    
    // Normalizar CNPJ (remover formatação)
    const cnpjNormalizado = nfeData.transportador.cnpj.replace(/[^\d]/g, '');
    const cnpjFormatado = cnpjNormalizado.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    
    console.log("[DEBUG] Buscando transportadora:", { cnpjOriginal: nfeData.transportador.cnpj, cnpjNormalizado, cnpjFormatado });
    
    // Buscar na tabela pessoas (transportadoras são pessoas com is_transportadora = true)
    // Tentar buscar com CNPJ normalizado e formatado
    const { data, error } = await supabase
      .from("pessoas")
      .select("id, razao_social, nome_fantasia, cpf_cnpj")
      .eq("company_id", currentCompany?.id)
      .or(`cpf_cnpj.eq.${cnpjNormalizado},cpf_cnpj.eq.${cnpjFormatado}`);
    
    console.log("[DEBUG] Resultado busca transportadora:", { data, error });
    
    if (data && data.length > 0) {
      setTransportadorCadastrado(true);
      setTransportadorId(data[0].id); // Já vincular automaticamente
      console.log("[DEBUG] Transportadora encontrada:", data[0].razao_social || data[0].nome_fantasia);
    } else {
      setTransportadorCadastrado(false);
      setTransportadorId(null);
      console.log("[DEBUG] Transportadora NÃO encontrada no banco");
    }
  };

  const checkNotaDuplicada = async (numero: string, serie: string, cnpjFornecedor: string, chaveAcesso?: string) => {
    // A CHAVE DE ACESSO é o identificador único de uma NF-e
    // Não usar número/série pois fornecedores diferentes podem ter o mesmo número
    
    console.log("[DEBUG] Verificando NF-e duplicada por chave de acesso:", { chaveAcesso });
    
    // APENAS verificar pela chave de acesso (identificador único nacional)
    if (chaveAcesso) {
      const { data: byKey, error: keyError } = await supabase
        .from("purchase_orders")
        .select("id, invoice_number, order_number")
        .eq("nfe_key", chaveAcesso)
        .eq("company_id", currentCompany?.id)
        .maybeSingle();
      
      console.log("[DEBUG] Resultado busca por chave de acesso:", { byKey, keyError });
      
      if (byKey) {
        return { isDuplicate: true, existingOrderId: byKey.id, existingInvoice: byKey.invoice_number };
      }
    }
    
    // Se não tem chave de acesso, não é possível verificar duplicidade com precisão
    // Retornar como não duplicado para permitir a importação
    return { isDuplicate: false };
  };

  const handleFilesUpload = useCallback(async (files: XMLFileResult[]) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setNotaDuplicada(false);
    setProcessedFiles([]);
    
    const results: { fileName: string; type: "nfe" | "cte"; success: boolean }[] = [];
    
    try {
      for (const file of files) {
        try {
          if (file.type === "nfe") {
            // Processar NF-e
            const { data, error } = await supabase.functions.invoke('parse-xml-nfe', {
              body: { xmlContent: file.content },
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            // Verificar duplicidade (passando chave de acesso para verificação mais precisa)
            const duplicateCheck = await checkNotaDuplicada(
              data.data.nota.numero,
              data.data.nota.serie,
              data.data.fornecedor.cnpj,
              data.data.nota.chaveAcesso // Passar a chave de acesso
            );

            console.log("[DEBUG] Resultado verificação duplicidade:", duplicateCheck);

            if (duplicateCheck.isDuplicate) {
              setNotaDuplicada(true);
              toast.error(`NF-e ${data.data.nota.numero} já foi importada anteriormente (Pedido existente)!`);
              results.push({ fileName: file.fileName, type: "nfe", success: false });
              continue;
            }

            // Adicionar CFOP de entrada sugerido para cada item
            const itensComCfop = data.data.itens.map((item: any) => ({
              ...item,
              cfopEntrada: sugerirCfopEntrada(item.cfopSaida),
              criarProduto: false,
            }));

            setNfeData({ ...data.data, itens: itensComCfop });
            results.push({ fileName: file.fileName, type: "nfe", success: true });
            
            // DEFINIR CFOP GERAL AUTOMATICAMENTE baseado no primeiro item
            if (itensComCfop.length > 0 && itensComCfop[0].cfopEntrada) {
              setCfopGeral(itensComCfop[0].cfopEntrada);
            }
            
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
            
            toast.success(`NF-e ${data.data.nota.numero} processada com sucesso!`);
            
          } else if (file.type === "cte") {
            // Processar CT-e
            const { data, error } = await supabase.functions.invoke('parse-cte-xml', {
              body: { xmlContent: file.content },
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            const parsedCteData = data.data as CTEData;

            // *** VALIDAÇÃO DO CT-e ***
            if (nfeData) {
              const nfeKey = nfeData.nota.chaveAcesso;
              const nfeSupplierCnpj = nfeData.fornecedor.cnpj.replace(/[^0-9]/g, '');
              
              const cteReferencesNfe = parsedCteData.chaveNFe?.includes(nfeKey) || false;
              const cteSenderIsNfeSupplier = parsedCteData.remetente?.cnpj?.replace(/[^0-9]/g, '') === nfeSupplierCnpj;

              if (cteReferencesNfe || cteSenderIsNfeSupplier) {
                // Validação OK
                setCteData(parsedCteData);
                results.push({ fileName: file.fileName, type: "cte", success: true });
                toast.success(`CT-e ${parsedCteData.numero} vinculado com sucesso!`);
              } else {
                // Erro de validação
                const errorMessage = `Este CT-e não pertence a esta NF-e. O remetente do CT-e (${parsedCteData.remetente?.razaoSocial || 'N/A'}) não é o fornecedor da NF-e (${nfeData.fornecedor.razaoSocial}).`;
                toast.error("Erro de Vínculo", { description: errorMessage });
                results.push({ fileName: file.fileName, type: "cte", success: false });
                // Não seta o cteData para invalidar o upload
              }
            } else {
              // Se não houver NF-e, apenas processa o CT-e
              setCteData(parsedCteData);
              results.push({ fileName: file.fileName, type: "cte", success: true });
              toast.success(`CT-e ${parsedCteData.numero} processado. Importe uma NF-e para vincular.`);
            }
          }
        } catch (fileError) {
          console.error(`Error processing ${file.fileName}:`, fileError);
          toast.error(`Erro ao processar ${file.fileName}`);
          results.push({ fileName: file.fileName, type: file.type, success: false });
        }
      }

      setProcessedFiles(results);
      
      // Se processou ao menos uma NF-e com sucesso, ir para review
      if (results.some(r => r.type === "nfe" && r.success)) {
        setStep("review");
      }
      
    } catch (error) {
      console.error("Error processing XMLs:", error);
      toast.error("Erro ao processar XMLs");
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

  // Filtrar CFOPs baseado na finalidade selecionada
  const getCfopsFiltrados = (cfops: CFOPOption[]): CFOPOption[] => {
    switch (finalidade) {
      case "comercializacao":
        // CFOPs x102, x117, x118, x121, x403 (comercialização)
        return cfops.filter(c => 
          c.codigo.endsWith("102") || 
          c.codigo.endsWith("117") || 
          c.codigo.endsWith("118") || 
          c.codigo.endsWith("121") ||
          c.codigo.endsWith("403")
        );
      case "industrializacao":
        // CFOPs x101, x111, x116, x120, x122, x124, x125, x401 (industrialização)
        return cfops.filter(c => 
          c.codigo.endsWith("101") || 
          c.codigo.endsWith("111") || 
          c.codigo.endsWith("116") ||
          c.codigo.endsWith("120") ||
          c.codigo.endsWith("122") ||
          c.codigo.endsWith("124") ||
          c.codigo.endsWith("125") ||
          c.codigo.endsWith("401")
        );
      case "uso_consumo":
        // CFOPs x556, x557, x407 (material de uso/consumo)
        return cfops.filter(c => 
          c.codigo.endsWith("556") || 
          c.codigo.endsWith("557") ||
          c.codigo.endsWith("407")
        );
      case "ativo":
        // CFOPs x551, x552, x553, x554, x555, x406 (ativo imobilizado)
        return cfops.filter(c => 
          c.codigo.endsWith("551") || 
          c.codigo.endsWith("552") ||
          c.codigo.endsWith("553") ||
          c.codigo.endsWith("554") ||
          c.codigo.endsWith("555") ||
          c.codigo.endsWith("406")
        );
      case "garantia":
      case "outros":
        // CFOPs x915, x916, x949 (garantia, conserto, outras operações)
        return cfops.filter(c => 
          c.codigo.endsWith("915") || 
          c.codigo.endsWith("916") ||
          c.codigo.endsWith("949") ||
          c.codigo.endsWith("910") ||
          c.codigo.endsWith("911") ||
          c.codigo.endsWith("912") ||
          c.codigo.endsWith("913")
        );
      default:
        return cfops;
    }
  };

  // Quando a finalidade muda, sugerir CFOP correspondente
  const handleFinalidadeChange = (novaFinalidade: typeof finalidade) => {
    setFinalidade(novaFinalidade);
    
    if (!nfeData) return;
    
    // Determinar prefixo baseado na UF do fornecedor
    const ufFornecedor = nfeData.fornecedor.uf;
    const ufEmpresa = "GO"; // TODO: pegar do contexto
    const prefixo = ufFornecedor === ufEmpresa ? "1" : ufFornecedor === "EX" ? "3" : "2";
    
    // Mapeamento de finalidade para sufixo CFOP
    const cfopMap: Record<typeof finalidade, string> = {
      comercializacao: `${prefixo}102`,     // Compra para comercialização
      industrializacao: `${prefixo}101`,    // Compra para industrialização
      uso_consumo: `${prefixo}556`,         // Material de uso/consumo
      ativo: `${prefixo}551`,               // Ativo imobilizado
      garantia: `${prefixo}949`,            // Outras entradas (garantia)
      outros: `${prefixo}949`,              // Outras entradas
    };
    
    const novoCfop = cfopMap[novaFinalidade];
    setCfopGeral(novoCfop);
    handleCfopGeralChange(novoCfop);
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

      // Calcular frete total (NFe + CTe se houver)
      const freightFromNFe = nfeData.nota.valorFrete || 0;
      const freightFromCTe = cteData?.valorTotal || 0;
      const totalFreight = freightFromNFe + freightFromCTe;

      // Calcular custos de todos os itens com frete rateado
      const itemCosts = calculateAllItemCosts(nfeData.itens, totalFreight, 'value');

      // Criar pedido de compra com dados financeiros e CT-e
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
        // Campos do CT-e (se houver)
        cte_number: cteData?.numero || null,
        cte_key: cteData?.chaveCTe || null,
        cte_freight_value: freightFromCTe,
        cte_date: cteData?.dataEmissao || null,
        cte_imported_at: cteData ? new Date().toISOString() : null,
        cte_carrier_id: transportadorId || null,
        freight_value: totalFreight,
        has_external_freight: freightFromCTe > 0,
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

      // Criar itens do pedido com custo calculado
      const orderItems = nfeData.itens.map((item, index) => ({
        purchase_order_id: orderData.id,
        company_id: currentCompany?.id,
        product_id: item.productId || produtosCriados[index] || null,
        xml_code: item.codigo,
        xml_description: item.descricao,
        ncm: item.ncm,
        cfop: item.cfopEntrada,
        quantity: Number(item.quantidade) || 1, // Garantir que seja número válido
        unit_price: Number(item.valorUnitario) || 0,
        total_value: Number(item.valorTotal) || 0,
        freight_allocated: itemCosts[index]?.freight_value || 0,
        calculated_unit_cost: itemCosts[index]?.calculated_unit_cost || item.valorUnitario,
        cost_breakdown: itemCosts[index] || {},
      }));

      await createOrderItems.mutateAsync(orderItems);

      // Salvar parcelas da NF-e (se não for garantia)
      if (finalidade !== "garantia" && nfeData.financeiro.parcelas && nfeData.financeiro.parcelas.length > 0) {
        const installments = nfeData.financeiro.parcelas.map((parcela, index) => ({
          purchase_order_id: orderData.id,
          installment_number: index + 1,
          due_date: parcela.dataVencimento,
          amount: parcela.valor,
          source: 'nfe',
          nfe_original_date: parcela.dataVencimento,
          nfe_original_amount: parcela.valor,
        }));
        
        await createOrderInstallments.mutateAsync(installments);
      }

      // GERAR CONTAS A PAGAR (Fornecedor NF-e + Transportadora CT-e)
      // Apenas se não for garantia
      if (finalidade !== "garantia" && fornecedorId) {
        const { supplierPayablesCount, carrierPayableCreated, errors } = await generatePayables({
          nfeData,
          cteData,
          orderId: orderData.id,
          supplierId: fornecedorId,
          carrierId: transportadorId,
          chartAccountId: planoContasId || undefined,
          costCenterId: centroCustoId || undefined,
          skipForecasts: defaultStatus?.financial_behavior === 'payable',
        });

        if (errors.length > 0) {
          errors.forEach(err => console.error(err));
        }

        if (supplierPayablesCount > 0) {
          toast.success(`${supplierPayablesCount} conta(s) a pagar do fornecedor criada(s)`);
        }
        if (carrierPayableCreated) {
          toast.success("Conta a pagar da transportadora criada");
        }
      }

      // IMPORTANTE: Só criar movimentação de estoque se o status tiver stock_behavior = 'entry'
      // Se for 'forecast' (em trânsito), não dá entrada no estoque - fica só como previsão
      const shouldCreateStockMovement = defaultStatus?.stock_behavior === 'entry';

      if (shouldCreateStockMovement) {
        for (let i = 0; i < nfeData.itens.length; i++) {
          const item = nfeData.itens[i];
          const productId = item.productId || produtosCriados[i];
          const costData = itemCosts[i];
          
          if (productId) {
            await createMovement.mutateAsync({
              product_id: productId,
              type: "ENTRADA_COMPRA",
              quantity: item.quantidade,
              unit_price: costData?.calculated_unit_cost || item.valorUnitario,
              total_value: (costData?.calculated_unit_cost || item.valorUnitario) * item.quantidade,
              reason: `NF ${nfeData.nota.numero}${cteData ? ` + CT-e ${cteData.numero}` : ''}`,
              reference_type: "purchase_order",
              reference_id: orderData.id,
            });

            // Atualizar custo médio do produto
            if (costData) {
              const { data: currentProduct } = await supabase
                .from("products")
                .select("average_cost, quantity")
                .eq("id", productId)
                .single();

              if (currentProduct) {
                const currentQty = currentProduct.quantity || 0;
                const currentAvgCost = currentProduct.average_cost || 0;
                const newQty = currentQty + item.quantidade;
                const newAvgCost = currentQty > 0
                  ? ((currentAvgCost * currentQty) + (costData.calculated_unit_cost * item.quantidade)) / newQty
                  : costData.calculated_unit_cost;

                await supabase
                  .from("products")
                  .update({ average_cost: newAvgCost })
                  .eq("id", productId);
              }
            }
          }
        }
      }

      toast.success("Nota Fiscal importada com sucesso!");
      setStep("upload");
      setNfeData(null);
      setCteData(null);
      setProcessedFiles([]);
      setFornecedorCadastrado(false);
      setTransportadorCadastrado(false);
      setTransportadorId(null);
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
    setCteData(null);
    setProcessedFiles([]);
    setNotaDuplicada(false);
    setFornecedorCadastrado(false);
    setFornecedorId(null);
    setTransportadorCadastrado(false);
    setTransportadorId(null);
    setFinanceiroObservacao("");
    setPlanoContasId("");
    setCentroCustoId("");
    setFormaPagamentoSelecionada("");
    setCfopGeral("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar XML de NF-e e CT-e"
        description="Importe notas fiscais e conhecimentos de transporte via arquivos XML"
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
        <ImportarXMLUpload 
          isProcessing={isProcessing} 
          onFilesUpload={handleFilesUpload}
          processedFiles={processedFiles}
        />
      )}

      {step === "review" && nfeData && (
        <div className="space-y-6">
          {/* Cards de informações */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FornecedorCard
              fornecedor={nfeData.fornecedor}
              fornecedorCadastrado={fornecedorCadastrado}
              fornecedorId={fornecedorId}
              fornecedoresDisponiveis={fornecedoresDisponiveis}
              onCadastrar={() => setDialogFornecedor(true)}
              onVincular={handleVincularFornecedor}
            />
            <NotaFiscalCard nota={nfeData.nota} />
            <TransportadorCard
              transportador={nfeData.transportador}
              transportadorCadastrado={transportadorCadastrado}
              transportadorId={transportadorId}
              transportadoresDisponiveis={transportadoresDisponiveis}
              onCadastrar={() => setDialogTransportador(true)}
              onVincular={handleVincularTransportador}
            />
          </div>

          {/* Card de CT-e (se houver) */}
          {cteData && (
            <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  CT-e Vinculado
                  <Badge variant="secondary">#{cteData.numero}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tomador (Pagador do Frete)</p>
                    <p className="font-medium">{cteData.tomador.razaoSocial || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{cteData.tomador.tipo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor do Frete</p>
                    <p className="font-medium text-primary">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cteData.valorTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Modalidade</p>
                    <p className="font-medium">{cteData.modalidade}</p>
                  </div>
                </div>
                {cteData.chaveNFe.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">NF-e vinculadas: {cteData.chaveNFe.length}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                <Select value={finalidade} onValueChange={(v: typeof finalidade) => handleFinalidadeChange(v)}>
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
                      {getCfopsFiltrados(CFOPS_ENTRADA_ESTADUAL).length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-sm font-semibold text-primary bg-muted/50">
                            Estadual (1xxx)
                          </div>
                          {getCfopsFiltrados(CFOPS_ENTRADA_ESTADUAL).map(cfop => (
                            <SelectItem key={cfop.codigo} value={cfop.codigo}>
                              {cfop.codigo} - {cfop.descricao.length > 55 ? cfop.descricao.slice(0, 55) + '...' : cfop.descricao}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* Operações Interestaduais */}
                      {getCfopsFiltrados(CFOPS_ENTRADA_INTERESTADUAL).length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-sm font-semibold text-primary border-t mt-1 pt-1 bg-muted/50">
                            Interestadual (2xxx)
                          </div>
                          {getCfopsFiltrados(CFOPS_ENTRADA_INTERESTADUAL).map(cfop => (
                            <SelectItem key={cfop.codigo} value={cfop.codigo}>
                              {cfop.codigo} - {cfop.descricao.length > 55 ? cfop.descricao.slice(0, 55) + '...' : cfop.descricao}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      
                      {/* Importação */}
                      {getCfopsFiltrados(CFOPS_ENTRADA_EXTERIOR).length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-sm font-semibold text-primary border-t mt-1 pt-1 bg-muted/50">
                            Importação (3xxx)
                          </div>
                          {getCfopsFiltrados(CFOPS_ENTRADA_EXTERIOR).map(cfop => (
                            <SelectItem key={cfop.codigo} value={cfop.codigo}>
                              {cfop.codigo} - {cfop.descricao.length > 55 ? cfop.descricao.slice(0, 55) + '...' : cfop.descricao}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
            onValidationChange={(allValid, pendingCount) => {
              setProdutosValidos(allValid);
              setProdutosPendentes(pendingCount);
            }}
          />

          {/* Alerta se fornecedor não cadastrado */}
          {!fornecedorCadastrado && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Fornecedor Obrigatório</AlertTitle>
              <AlertDescription>
                O fornecedor deve estar cadastrado ou vinculado antes de importar a nota.
                Cadastre um novo ou vincule a um fornecedor existente.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Alerta se produtos não vinculados */}
          {!produtosValidos && produtosPendentes > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Produtos Obrigatórios</AlertTitle>
              <AlertDescription>
                <strong>{produtosPendentes} produto(s)</strong> precisam ser vinculados ou cadastrados antes de importar a nota.
                Vincule cada item a um produto existente ou marque "Auto Cadastrar".
              </AlertDescription>
            </Alert>
          )}
          
          {/* Alerta se plano de contas ou centro de custo não preenchidos (exceto garantia) */}
          {finalidade !== "garantia" && (!planoContasId || !centroCustoId) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Campos Financeiros Obrigatórios</AlertTitle>
              <AlertDescription>
                {!planoContasId && !centroCustoId 
                  ? "Selecione o Plano de Contas e o Centro de Custo antes de finalizar."
                  : !planoContasId 
                    ? "Selecione o Plano de Contas antes de finalizar."
                    : "Selecione o Centro de Custo antes de finalizar."
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleCancelar}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFinalize} 
              disabled={
                isProcessing || 
                !fornecedorCadastrado || 
                !produtosValidos || 
                (finalidade !== "garantia" && (!planoContasId || !centroCustoId))
              }
              title={
                !fornecedorCadastrado 
                  ? "Cadastre ou vincule o fornecedor primeiro" 
                  : !produtosValidos 
                    ? `${produtosPendentes} produto(s) precisam ser vinculados ou cadastrados`
                    : finalidade !== "garantia" && !planoContasId
                      ? "Selecione o Plano de Contas"
                      : finalidade !== "garantia" && !centroCustoId
                        ? "Selecione o Centro de Custo"
                        : undefined
              }
            >
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
