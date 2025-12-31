import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NFeDivergenceDialog, NFeDivergence, NFeComparisonResult } from "./NFeDivergenceDialog";
import { CTeDivergenceDialog, CTeComparisonResult } from "./CTeDivergenceDialog";
import { usePurchaseOrderAudit } from "@/hooks/usePurchaseOrderAudit";
import { PurchaseOrderItem } from "@/hooks/usePurchaseOrders";

interface XMLUploadButtonProps {
  type: "nfe" | "cte";
  orderId: string;
  disabled?: boolean;
  onSuccess: (data: any) => void;
  // Order data for comparison
  orderSupplierCnpj?: string;
  orderSupplierName?: string;
  orderFreightValue?: number;
  orderTotalValue?: number;
  orderItems?: PurchaseOrderItem[];
  // Status for reapproval check
  wasApproved?: boolean;
}

// Helper to normalize CNPJ (remove formatting)
const normalizeCnpj = (cnpj: string | null | undefined): string => {
  if (!cnpj) return "";
  return cnpj.replace(/[^\d]/g, "");
};

export function XMLUploadButton({
  type,
  orderId,
  disabled,
  onSuccess,
  orderSupplierCnpj,
  orderSupplierName,
  orderFreightValue = 0,
  orderTotalValue = 0,
  orderItems = [],
  wasApproved = false,
}: XMLUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // NF-e dialog state
  const [showNfeDialog, setShowNfeDialog] = useState(false);
  const [nfeComparison, setNfeComparison] = useState<NFeComparisonResult | null>(null);
  
  // CT-e dialog state
  const [showCteDialog, setShowCteDialog] = useState(false);
  const [cteComparison, setCteComparison] = useState<CTeComparisonResult | null>(null);

  const audit = usePurchaseOrderAudit();

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Por favor, selecione um arquivo XML");
      return;
    }

    setIsProcessing(true);

    try {
      // Read file content
      const xmlContent = await file.text();

      if (type === "nfe") {
        await processNFe(xmlContent);
      } else {
        await processCTe(xmlContent);
      }
    } catch (error: any) {
      console.error("Erro ao processar XML:", error);
      toast.error(`Erro ao processar XML: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsProcessing(false);
      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const processNFe = async (xmlContent: string) => {
    // Call edge function to parse XML
    const { data: parseResult, error: parseError } = await supabase.functions.invoke(
      "parse-xml-nfe",
      { body: { xmlContent } }
    );

    if (parseError) {
      throw new Error(parseError.message || "Erro ao processar XML");
    }

    if (!parseResult?.success || !parseResult?.data) {
      throw new Error("Falha ao extrair dados do XML");
    }

    const nfeData = parseResult.data;

    // Log import started
    await audit.logXmlImportStarted(orderId, "nfe", {
      numero: nfeData.nota.numero,
      chave: nfeData.nota.chaveAcesso,
    });

    // RULE 1: Validate supplier CNPJ
    const orderCnpj = normalizeCnpj(orderSupplierCnpj);
    const nfeCnpj = normalizeCnpj(nfeData.fornecedor.cnpj);
    const supplierMatch = orderCnpj === nfeCnpj;

    if (!supplierMatch) {
      // Log blocked import
      await audit.logXmlImportBlocked(orderId, "supplier_mismatch", {
        orderSupplier: orderSupplierName,
        nfeSupplier: nfeData.fornecedor.razaoSocial,
        orderCnpj,
        nfeCnpj,
      });
    }

    // RULE 3: Compare order vs NF-e
    const divergences = compareOrderWithNFe(nfeData);

    if (divergences.length > 0) {
      await audit.logDivergencesDetected(
        orderId,
        divergences.map((d) => ({
          field: d.field,
          orderValue: d.orderValue,
          nfeValue: d.nfeValue,
        }))
      );
    }

    // Set comparison result and show dialog
    setNfeComparison({
      supplierMatch,
      orderSupplierCnpj: orderCnpj,
      orderSupplierName: orderSupplierName || "Não informado",
      nfeSupplierCnpj: nfeCnpj,
      nfeSupplierName: nfeData.fornecedor.razaoSocial,
      divergences,
      nfeData,
    });
    setShowNfeDialog(true);
  };

  const compareOrderWithNFe = (nfeData: any): NFeDivergence[] => {
    const divergences: NFeDivergence[] = [];

    // Compare header - total value
    const nfeTotalValue = nfeData.nota.valorTotal;
    if (Math.abs(orderTotalValue - nfeTotalValue) > 0.01) {
      divergences.push({
        id: "header_total_value",
        type: "header",
        field: "total_value",
        label: "Valor Total",
        orderValue: orderTotalValue,
        nfeValue: nfeTotalValue,
        difference: nfeTotalValue - orderTotalValue,
      });
    }

    // Compare header - freight value
    const nfeFreightValue = nfeData.nota.valorFrete || 0;
    if (Math.abs(orderFreightValue - nfeFreightValue) > 0.01) {
      divergences.push({
        id: "header_freight_value",
        type: "header",
        field: "freight_value",
        label: "Valor do Frete",
        orderValue: orderFreightValue,
        nfeValue: nfeFreightValue,
        difference: nfeFreightValue - orderFreightValue,
      });
    }

    // Compare items
    const nfeItems = nfeData.itens || [];
    const matchedNfeIndexes = new Set<number>();

    // For each order item, try to find matching NF-e item
    orderItems.forEach((orderItem, orderIndex) => {
      const orderItemCode = orderItem.xml_code || orderItem.product?.code || "";
      const orderItemDesc = orderItem.description || orderItem.xml_description || "";

      // Find matching NF-e item by code
      const nfeItemIndex = nfeItems.findIndex((nfeItem: any, idx: number) => {
        if (matchedNfeIndexes.has(idx)) return false;
        return nfeItem.codigo === orderItemCode;
      });

      if (nfeItemIndex >= 0) {
        matchedNfeIndexes.add(nfeItemIndex);
        const nfeItem = nfeItems[nfeItemIndex];

        // Compare quantity
        if (Math.abs((orderItem.quantity || 0) - nfeItem.quantidade) > 0.0001) {
          divergences.push({
            id: `item_${orderIndex}_quantity`,
            type: "item",
            field: "quantity",
            label: "Quantidade",
            orderValue: orderItem.quantity,
            nfeValue: nfeItem.quantidade,
            difference: nfeItem.quantidade - (orderItem.quantity || 0),
            itemIndex: orderIndex,
            itemDescription: orderItemDesc,
            xmlCode: orderItemCode,
          });
        }

        // Compare unit price
        if (Math.abs((orderItem.unit_price || 0) - nfeItem.valorUnitario) > 0.01) {
          divergences.push({
            id: `item_${orderIndex}_unit_price`,
            type: "item",
            field: "unit_price",
            label: "Valor Unitário",
            orderValue: orderItem.unit_price,
            nfeValue: nfeItem.valorUnitario,
            difference: nfeItem.valorUnitario - (orderItem.unit_price || 0),
            itemIndex: orderIndex,
            itemDescription: orderItemDesc,
            xmlCode: orderItemCode,
          });
        }

        // Compare total value
        if (Math.abs((orderItem.total_value || 0) - nfeItem.valorTotal) > 0.01) {
          divergences.push({
            id: `item_${orderIndex}_total_value`,
            type: "item",
            field: "total_value",
            label: "Valor Total",
            orderValue: orderItem.total_value,
            nfeValue: nfeItem.valorTotal,
            difference: nfeItem.valorTotal - (orderItem.total_value || 0),
            itemIndex: orderIndex,
            itemDescription: orderItemDesc,
            xmlCode: orderItemCode,
          });
        }
      } else {
        // Item in order but not in NF-e
        divergences.push({
          id: `item_missing_${orderIndex}`,
          type: "item_missing",
          field: "item",
          label: "Item Ausente na NF-e",
          orderValue: orderItem.quantity,
          nfeValue: orderItem.unit_price,
          difference: orderItem.total_value,
          itemIndex: orderIndex,
          itemDescription: orderItemDesc,
          xmlCode: orderItemCode,
        });
      }
    });

    // Check for items in NF-e but not in order
    nfeItems.forEach((nfeItem: any, nfeIndex: number) => {
      if (!matchedNfeIndexes.has(nfeIndex)) {
        divergences.push({
          id: `item_extra_${nfeIndex}`,
          type: "item_extra",
          field: "item",
          label: "Item Extra na NF-e",
          orderValue: nfeItem.quantidade,
          nfeValue: nfeItem.valorUnitario,
          difference: nfeItem.valorTotal,
          itemIndex: nfeIndex,
          itemDescription: nfeItem.descricao,
          xmlCode: nfeItem.codigo,
        });
      }
    });

    return divergences;
  };

  const handleNfeApplyChanges = async (selectedDivergenceIds: string[]) => {
    if (!nfeComparison) return;

    setIsProcessing(true);
    try {
      const { nfeData, divergences } = nfeComparison;
      const selectedDivergences = divergences.filter((d) => selectedDivergenceIds.includes(d.id));
      const appliedChanges: Record<string, any> = {};
      let requiresReapproval = false;

      // RULE 5: Apply selected changes
      for (const div of selectedDivergences) {
        if (div.type === "header") {
          appliedChanges[div.field] = div.nfeValue;
          await audit.logDivergenceApplied(orderId, {
            field: div.field,
            oldValue: div.orderValue,
            newValue: div.nfeValue,
          });
        }
        // Item changes will be handled separately
      }

      // Prepare base update data
      const updateData: Record<string, any> = {
        nfe_number: nfeData.nota.numero,
        nfe_series: nfeData.nota.serie,
        nfe_date: nfeData.nota.dataEmissao || null,
        nfe_key: nfeData.nota.chaveAcesso,
        nfe_imported_at: new Date().toISOString(),
        // Salvar dados do fornecedor ORIGINAL da NF-e para auditoria
        nfe_supplier_cnpj: nfeData.fornecedor.cnpj,
        nfe_supplier_name: nfeData.fornecedor.razaoSocial,
        // Salvar CFOP de saída da NF-e para sugestão de CFOP de entrada
        nfe_cfop_saida: nfeData.itens?.[0]?.cfopSaida || null,
        // IMPORTANTE: Salvar natureza da operação (Venda, Remessa, Garantia, etc)
        nfe_natureza_operacao: nfeData.nota.naturezaOperacao || null,
      };

      // Apply header changes if selected
      if (appliedChanges.total_value !== undefined) {
        updateData.total_value = appliedChanges.total_value;
        requiresReapproval = wasApproved;
      }
      if (appliedChanges.freight_value !== undefined) {
        updateData.freight_value = appliedChanges.freight_value;
        requiresReapproval = wasApproved;
      }

      // RULE 6: Mark for reapproval if order was approved and changes applied
      if (requiresReapproval) {
        updateData.requires_reapproval = true;
        updateData.reapproval_reason = "Alteração após importação de NF-e";
        await audit.logReapprovalRequired(orderId, "Alteração após importação de NF-e");
      }

      // Update purchase order
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) {
        throw new Error(`Erro ao atualizar pedido: ${updateError.message}`);
      }

      // Update items with NF-e data (keeping original values, adding nfe_ fields for comparison)
      if (nfeData.itens && nfeData.itens.length > 0) {
        // Get existing items
        const { data: existingItems } = await supabase
          .from("purchase_order_items")
          .select("*")
          .eq("purchase_order_id", orderId);

        // Update existing items with NF-e comparison data
        for (const orderItem of existingItems || []) {
          const matchingNfeItem = nfeData.itens.find(
            (nfeItem: any) => nfeItem.codigo === orderItem.xml_code
          );

          if (matchingNfeItem) {
            const itemUpdate: Record<string, any> = {
              nfe_quantity: matchingNfeItem.quantidade,
              nfe_unit_price: matchingNfeItem.valorUnitario,
              nfe_total_value: matchingNfeItem.valorTotal,
              has_divergence: false,
            };

            // Check if there are divergences for this item that were selected
            const itemDivergences = selectedDivergences.filter(
              (d) => d.type === "item" && d.xmlCode === orderItem.xml_code
            );

            for (const itemDiv of itemDivergences) {
              if (itemDiv.field === "quantity") {
                itemUpdate.quantity = itemDiv.nfeValue;
                requiresReapproval = wasApproved;
              }
              if (itemDiv.field === "unit_price") {
                itemUpdate.unit_price = itemDiv.nfeValue;
                requiresReapproval = wasApproved;
              }
              if (itemDiv.field === "total_value") {
                itemUpdate.total_value = itemDiv.nfeValue;
              }

              await audit.logDivergenceApplied(orderId, {
                field: `item.${itemDiv.field}`,
                oldValue: itemDiv.orderValue,
                newValue: itemDiv.nfeValue,
              });
            }

            // Check for any remaining divergence
            const hasQuantityDiv = Math.abs(orderItem.quantity - matchingNfeItem.quantidade) > 0.0001;
            const hasPriceDiv = Math.abs((orderItem.unit_price || 0) - matchingNfeItem.valorUnitario) > 0.01;
            itemUpdate.has_divergence = hasQuantityDiv || hasPriceDiv;

            if (itemUpdate.has_divergence) {
              itemUpdate.divergence_details = {
                quantity: hasQuantityDiv
                  ? { order: orderItem.quantity, nfe: matchingNfeItem.quantidade }
                  : null,
                unit_price: hasPriceDiv
                  ? { order: orderItem.unit_price, nfe: matchingNfeItem.valorUnitario }
                  : null,
              };
            }

            await supabase
              .from("purchase_order_items")
              .update(itemUpdate)
              .eq("id", orderItem.id);
          }
        }

        // Handle extra items (in NF-e but not in order) if selected
        const extraItemDivergences = selectedDivergences.filter((d) => d.type === "item_extra");
        for (const extraDiv of extraItemDivergences) {
          const nfeItem = nfeData.itens.find((item: any) => item.codigo === extraDiv.xmlCode);
          if (nfeItem) {
            await supabase.from("purchase_order_items").insert({
              purchase_order_id: orderId,
              xml_code: nfeItem.codigo,
              xml_description: nfeItem.descricao,
              description: nfeItem.descricao,
              ncm: nfeItem.ncm,
              cfop: nfeItem.cfopSaida,
              quantity: nfeItem.quantidade,
              unit_price: nfeItem.valorUnitario,
              total_value: nfeItem.valorTotal,
              nfe_quantity: nfeItem.quantidade,
              nfe_unit_price: nfeItem.valorUnitario,
              nfe_total_value: nfeItem.valorTotal,
            });

            requiresReapproval = wasApproved;
          }
        }
      }

      // If reapproval needed after item changes
      if (requiresReapproval && !updateData.requires_reapproval) {
        await supabase
          .from("purchase_orders")
          .update({
            requires_reapproval: true,
            reapproval_reason: "Alteração após importação de NF-e",
          })
          .eq("id", orderId);
        await audit.logReapprovalRequired(orderId, "Alteração em itens após importação de NF-e");
      }

      // Log completion
      await audit.logXmlImportCompleted(orderId, "nfe", {
        numero: nfeData.nota.numero,
        divergencesApplied: selectedDivergences.length,
        divergencesIgnored: divergences.length - selectedDivergences.length,
        requiresReapproval,
      });

      toast.success(`NF-e ${nfeData.nota.numero} importada com sucesso!`);
      setShowNfeDialog(false);
      setNfeComparison(null);
      onSuccess(nfeData);
    } catch (error: any) {
      console.error("Erro ao aplicar alterações:", error);
      toast.error(`Erro ao aplicar alterações: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNfeCancel = () => {
    setShowNfeDialog(false);
    setNfeComparison(null);
  };

  const processCTe = async (xmlContent: string) => {
    // Parse CT-e XML
    const extractText = (tag: string) => {
      const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
      const match = xmlContent.match(regex);
      return match ? match[1].trim() : "";
    };

    // Extract CT-e data
    const infCteMatch = xmlContent.match(/<infCte[^>]*Id="CTe(\d+)"[^>]*>/i);
    const chaveAcesso = infCteMatch ? infCteMatch[1] : "";

    const nCT = extractText("nCT");
    const dhEmi = extractText("dhEmi");
    const dataEmissao = dhEmi ? dhEmi.split("T")[0] : "";
    const vTPrest = parseFloat(extractText("vTPrest")) || 0;

    // Extract carrier info
    const emitMatch = xmlContent.match(/<emit>([\s\S]*?)<\/emit>/i);
    const emitContent = emitMatch ? emitMatch[1] : "";
    const carrierName = (() => {
      const regex = /<xNome[^>]*>([^<]*)<\/xNome>/i;
      const match = emitContent.match(regex);
      return match ? match[1].trim() : "";
    })();

    if (!nCT && !chaveAcesso) {
      throw new Error("Não foi possível extrair dados do CT-e");
    }

    // Log import started
    await audit.logXmlImportStarted(orderId, "cte", {
      numero: nCT,
      chave: chaveAcesso,
    });

    // RULE 7: Compare freight
    const difference = vTPrest - orderFreightValue;
    const hasDivergence = Math.abs(difference) > 0.01;

    setCteComparison({
      orderFreightValue,
      cteFreightValue: vTPrest,
      difference,
      hasDivergence,
      cteData: {
        numero: nCT,
        chave: chaveAcesso,
        data: dataEmissao,
        transportadora: carrierName,
      },
    });
    setShowCteDialog(true);
  };

  const handleCteApplyChange = async (applyFreight: boolean) => {
    if (!cteComparison) return;

    setIsProcessing(true);
    try {
      const { cteFreightValue, cteData, hasDivergence } = cteComparison;
      let requiresReapproval = false;

      const updateData: Record<string, any> = {
        cte_number: cteData.numero,
        cte_key: cteData.chave,
        cte_date: cteData.data || null,
        cte_freight_value: cteFreightValue,
        cte_imported_at: new Date().toISOString(),
      };

      // Apply freight change if selected
      if (applyFreight && hasDivergence) {
        updateData.freight_value = cteFreightValue;
        
        await audit.logDivergenceApplied(orderId, {
          field: "freight_value",
          oldValue: orderFreightValue,
          newValue: cteFreightValue,
        });

        // RULE 6 & 7: Reapproval if approved and freight changed
        if (wasApproved) {
          requiresReapproval = true;
          updateData.requires_reapproval = true;
          updateData.reapproval_reason = "Frete alterado após importação de CT-e";
          await audit.logReapprovalRequired(orderId, "Frete alterado após importação de CT-e");
        }
      }

      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) {
        throw new Error(`Erro ao atualizar pedido: ${updateError.message}`);
      }

      await audit.logXmlImportCompleted(orderId, "cte", {
        numero: cteData.numero,
        divergencesApplied: applyFreight && hasDivergence ? 1 : 0,
        divergencesIgnored: !applyFreight && hasDivergence ? 1 : 0,
        requiresReapproval,
      });

      toast.success(`CT-e ${cteData.numero} importado com sucesso!`);
      setShowCteDialog(false);
      setCteComparison(null);
      onSuccess({
        numero: cteData.numero,
        chave: cteData.chave,
        data: cteData.data,
        valorFrete: cteFreightValue,
        transportadora: cteData.transportadora,
      });
    } catch (error: any) {
      console.error("Erro ao aplicar CT-e:", error);
      toast.error(`Erro ao aplicar CT-e: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCteCancel = () => {
    setShowCteDialog(false);
    setCteComparison(null);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xml,application/xml,text/xml"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className="w-full sm:w-auto"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <FileUp className="mr-2 h-4 w-4" />
            Importar XML {type === "nfe" ? "NF-e" : "CT-e"}
          </>
        )}
      </Button>

      <NFeDivergenceDialog
        open={showNfeDialog}
        onOpenChange={setShowNfeDialog}
        comparison={nfeComparison}
        onApplyChanges={handleNfeApplyChanges}
        onCancel={handleNfeCancel}
        isInApprovalFlow={wasApproved}
      />

      <CTeDivergenceDialog
        open={showCteDialog}
        onOpenChange={setShowCteDialog}
        comparison={cteComparison}
        onApplyChange={handleCteApplyChange}
        onCancel={handleCteCancel}
        isInApprovalFlow={wasApproved}
      />
    </>
  );
}
