import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeneratePdfParams {
  checkoutId: string;
  checkoutType: "sale" | "service_order";
  pdfType?: "complete" | "summary" | "per_item";
}

export function useCheckoutPdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async ({ checkoutId, checkoutType, pdfType = "complete" }: GeneratePdfParams) => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-checkout-pdf", {
        body: {
          checkoutId,
          checkoutType,
          pdfType,
        },
      });

      if (error) {
        console.error("Erro ao gerar PDF:", error);
        toast.error("Erro ao gerar PDF");
        return null;
      }

      if (!data?.html) {
        toast.error("PDF não gerado corretamente");
        return null;
      }

      // Abre o HTML em uma nova janela para impressão
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        
        // Aguarda carregar e dispara impressão
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
        
        toast.success("PDF gerado! A janela de impressão será aberta.");
      } else {
        toast.error("Popup bloqueado. Permita popups para imprimir.");
      }

      return data;
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Erro ao gerar PDF");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const printCheckout = async (checkoutId: string, checkoutType: "sale" | "service_order") => {
    return generatePdf({ checkoutId, checkoutType, pdfType: "complete" });
  };

  const printSummary = async (checkoutId: string, checkoutType: "sale" | "service_order") => {
    return generatePdf({ checkoutId, checkoutType, pdfType: "summary" });
  };

  return {
    isGenerating,
    generatePdf,
    printCheckout,
    printSummary,
  };
}
