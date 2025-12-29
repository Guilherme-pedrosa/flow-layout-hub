import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface XMLUploadButtonProps {
  type: "nfe" | "cte";
  orderId: string;
  disabled?: boolean;
  onSuccess: (data: any) => void;
}

export function XMLUploadButton({ type, orderId, disabled, onSuccess }: XMLUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

    // Update purchase order with NFe data
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        nfe_number: nfeData.nota.numero,
        nfe_series: nfeData.nota.serie,
        nfe_date: nfeData.nota.dataEmissao || null,
        nfe_key: nfeData.nota.chaveAcesso,
        nfe_imported_at: new Date().toISOString(),
        // Update supplier info if not already set
        supplier_cnpj: nfeData.fornecedor.cnpj,
        supplier_name: nfeData.fornecedor.razaoSocial,
        supplier_address: `${nfeData.fornecedor.endereco}, ${nfeData.fornecedor.bairro}, ${nfeData.fornecedor.cidade}/${nfeData.fornecedor.uf}`,
        // Update freight if present
        freight_value: nfeData.nota.valorFrete || undefined,
        // Update total
        total_value: nfeData.nota.valorTotal,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Erro ao atualizar pedido: ${updateError.message}`);
    }

    // Create/update items from XML
    if (nfeData.itens && nfeData.itens.length > 0) {
      // Delete existing items first
      await supabase
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", orderId);

      // Insert new items from XML
      const itemsToInsert = nfeData.itens.map((item: any) => ({
        purchase_order_id: orderId,
        xml_code: item.codigo,
        xml_description: item.descricao,
        description: item.descricao,
        ncm: item.ncm,
        cfop: item.cfopSaida,
        quantity: item.quantidade,
        unit_price: item.valorUnitario,
        total_value: item.valorTotal,
        nfe_quantity: item.quantidade,
        nfe_unit_price: item.valorUnitario,
        nfe_total_value: item.valorTotal,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Erro ao inserir itens:", itemsError);
      }
    }

    toast.success(`NF-e ${nfeData.nota.numero} importada com sucesso!`);
    onSuccess(nfeData);
  };

  const processCTe = async (xmlContent: string) => {
    // Parse CT-e XML (simpler parsing for CT-e)
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
    const carrierCnpj = extractText("CNPJ");
    const carrierName = (() => {
      const regex = /<xNome[^>]*>([^<]*)<\/xNome>/i;
      const match = emitContent.match(regex);
      return match ? match[1].trim() : "";
    })();

    if (!nCT && !chaveAcesso) {
      throw new Error("Não foi possível extrair dados do CT-e");
    }

    // Update purchase order with CT-e data
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        cte_number: nCT,
        cte_key: chaveAcesso,
        cte_date: dataEmissao || null,
        cte_freight_value: vTPrest,
        cte_imported_at: new Date().toISOString(),
        // Update freight value from CT-e
        freight_value: vTPrest,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Erro ao atualizar pedido: ${updateError.message}`);
    }

    toast.success(`CT-e ${nCT} importado com sucesso!`);
    onSuccess({
      numero: nCT,
      chave: chaveAcesso,
      data: dataEmissao,
      valorFrete: vTPrest,
      transportadora: carrierName,
    });
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
    </>
  );
}
