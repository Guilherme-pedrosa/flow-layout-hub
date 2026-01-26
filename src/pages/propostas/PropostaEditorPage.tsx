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
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Proposta ${localProposal?.numero}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .page-break { page-break-before: always; }
              }
            </style>
          </head>
          <body>
            ${previewElement.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
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
