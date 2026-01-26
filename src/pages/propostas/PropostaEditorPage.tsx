import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Printer, 
  Download, 
  Eye, 
  EyeOff, 
  Save,
  ArrowLeft,
  User,
  FileText,
  Package,
  Image,
  FileCheck,
  Settings
} from "lucide-react";

import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import { useProposalData, useProposals } from "@/hooks/useProposals";

// Tab Components
import { PropostaTabCliente } from "@/components/propostas/PropostaTabCliente";
import { PropostaTabProposta } from "@/components/propostas/PropostaTabProposta";
import { PropostaTabItens } from "@/components/propostas/PropostaTabItens";
import { PropostaTabImagens } from "@/components/propostas/PropostaTabImagens";
import { PropostaTabTermos } from "@/components/propostas/PropostaTabTermos";
import { PropostaTabConfig } from "@/components/propostas/PropostaTabConfig";
import { PropostaPreview } from "@/components/propostas/PropostaPreview";

export default function PropostaEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { proposal, items, sections, terms, images, settings, isLoading } = useProposalData(id);
  const { updateProposal } = useProposals();
  
  const [activeTab, setActiveTab] = useState("cliente");
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado local para edição
  const [localProposal, setLocalProposal] = useState(proposal);
  const [localItems, setLocalItems] = useState(items);
  const [localTerms, setLocalTerms] = useState(terms);

  useEffect(() => {
    if (proposal) setLocalProposal(proposal);
  }, [proposal]);

  useEffect(() => {
    if (items) setLocalItems(items);
  }, [items]);

  useEffect(() => {
    if (terms) setLocalTerms(terms);
  }, [terms]);

  const handlePrint = () => {
    const previewElement = document.getElementById("proposal-preview-content");
    if (previewElement) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        // Coletar todos os estilos da página
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(style => style.outerHTML)
          .join('\n');
        
        const primaryColor = settings?.primary_color || "#16a34a";
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Proposta ${localProposal?.numero}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${styles}
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body { 
                margin: 0; 
                padding: 0;
                background: white;
                font-family: system-ui, -apple-system, sans-serif;
              }
              .page-break { 
                page-break-before: always; 
              }
              /* Esconder elementos de UI que não devem aparecer no PDF */
              .bg-muted.px-4.py-2 { 
                display: none !important; 
              }
              /* Forçar cores de fundo no print */
              [style*="background"] {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Estilos específicos para garantir que funcione */
              .rounded-xl { border-radius: 0.75rem; }
              .rounded-lg { border-radius: 0.5rem; }
              .rounded-full { border-radius: 9999px; }
              .text-white { color: white !important; }
              .font-black { font-weight: 900; }
              .font-bold { font-weight: 700; }
              .font-semibold { font-weight: 600; }
              .font-medium { font-weight: 500; }
              .text-6xl { font-size: 3.75rem; line-height: 1; }
              .text-5xl { font-size: 3rem; line-height: 1; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .flex { display: flex; }
              .flex-col { flex-direction: column; }
              .flex-1 { flex: 1; }
              .items-center { align-items: center; }
              .justify-center { justify-content: center; }
              .justify-between { justify-content: space-between; }
              .justify-end { justify-content: flex-end; }
              .gap-3 { gap: 0.75rem; }
              .gap-4 { gap: 1rem; }
              .gap-8 { gap: 2rem; }
              .gap-12 { gap: 3rem; }
              .space-y-3 > * + * { margin-top: 0.75rem; }
              .space-y-4 > * + * { margin-top: 1rem; }
              .space-y-6 > * + * { margin-top: 1.5rem; }
              .space-y-8 > * + * { margin-top: 2rem; }
              .p-2 { padding: 0.5rem; }
              .p-3 { padding: 0.75rem; }
              .p-4 { padding: 1rem; }
              .p-5 { padding: 1.25rem; }
              .p-6 { padding: 1.5rem; }
              .p-8 { padding: 2rem; }
              .px-4 { padding-left: 1rem; padding-right: 1rem; }
              .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
              .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-4 { margin-bottom: 1rem; }
              .mb-8 { margin-bottom: 2rem; }
              .mt-2 { margin-top: 0.5rem; }
              .mt-4 { margin-top: 1rem; }
              .mt-6 { margin-top: 1.5rem; }
              .mt-8 { margin-top: 2rem; }
              .mt-12 { margin-top: 3rem; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              .ml-2 { margin-left: 0.5rem; }
              .mx-2 { margin-left: 0.5rem; margin-right: 0.5rem; }
              .w-full { width: 100%; }
              .w-12 { width: 3rem; }
              .w-16 { width: 4rem; }
              .w-20 { width: 5rem; }
              .w-28 { width: 7rem; }
              .w-32 { width: 8rem; }
              .h-1 { height: 0.25rem; }
              .h-8 { height: 2rem; }
              .h-10 { height: 2.5rem; }
              .h-12 { height: 3rem; }
              .h-24 { height: 6rem; }
              .max-w-lg { max-width: 32rem; }
              .max-w-2xl { max-width: 42rem; }
              .border { border-width: 1px; }
              .border-b { border-bottom-width: 1px; }
              .border-t { border-top-width: 1px; }
              .border-t-4 { border-top-width: 4px; }
              .border-dashed { border-style: dashed; }
              .border-collapse { border-collapse: collapse; }
              .overflow-hidden { overflow: hidden; }
              .relative { position: relative; }
              .absolute { position: absolute; }
              .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
              .z-10 { z-index: 10; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .object-contain { object-fit: contain; }
              .whitespace-pre-wrap { white-space: pre-wrap; }
              .tracking-tight { letter-spacing: -0.025em; }
              .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 0.75rem; }
              tbody tr { border-bottom: 1px solid #e5e7eb; }
            </style>
          </head>
          <body>
            <div style="max-width: 210mm; margin: 0 auto; background: white;">
              ${previewElement.innerHTML}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    }
  };

  const handleDownloadPdf = async () => {
    // TODO: Chamar edge function para gerar PDF
    window.open(`/api/proposals/${id}/pdf`, "_blank");
  };

  if (isLoading || !localProposal) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                Proposta {localProposal.numero}
              </h1>
              <p className="text-sm text-muted-foreground">
                {localProposal.titulo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ocultar Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Mostrar Preview
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Form */}
          <div className={`${showPreview ? "w-1/2" : "w-full"} border-r overflow-auto`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 px-4 h-12">
                <TabsTrigger value="cliente" className="gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </TabsTrigger>
                <TabsTrigger value="proposta" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Proposta
                </TabsTrigger>
                <TabsTrigger value="itens" className="gap-2">
                  <Package className="h-4 w-4" />
                  Itens
                </TabsTrigger>
                <TabsTrigger value="imagens" className="gap-2">
                  <Image className="h-4 w-4" />
                  Imagens
                </TabsTrigger>
                <TabsTrigger value="termos" className="gap-2">
                  <FileCheck className="h-4 w-4" />
                  Termos
                </TabsTrigger>
                <TabsTrigger value="config" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Config
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto p-4">
                <TabsContent value="cliente" className="m-0">
                  <PropostaTabCliente
                    proposal={localProposal}
                    onChange={setLocalProposal}
                  />
                </TabsContent>
                
                <TabsContent value="proposta" className="m-0">
                  <PropostaTabProposta
                    proposal={localProposal}
                    onChange={setLocalProposal}
                  />
                </TabsContent>
                
                <TabsContent value="itens" className="m-0">
                  <PropostaTabItens
                    proposalId={id!}
                    items={localItems}
                    onChange={setLocalItems}
                  />
                </TabsContent>
                
                <TabsContent value="imagens" className="m-0">
                  <PropostaTabImagens
                    proposalId={id!}
                    images={images}
                  />
                </TabsContent>
                
                <TabsContent value="termos" className="m-0">
                  <PropostaTabTermos
                    proposalId={id!}
                    terms={localTerms}
                    onChange={setLocalTerms}
                  />
                </TabsContent>
                
                <TabsContent value="config" className="m-0">
                  <PropostaTabConfig settings={settings} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right Panel - Preview */}
          {showPreview && (
            <div className="w-1/2 overflow-auto bg-muted/30 p-4" id="proposal-preview-content">
              <PropostaPreview
                proposal={localProposal}
                items={localItems}
                terms={localTerms}
                settings={settings}
              />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
