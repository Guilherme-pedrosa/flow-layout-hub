import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, ClipboardList } from "lucide-react";
import { PurchaseSuggestionPanel } from "@/components/compras";

export default function Solicitacoes() {
  const [activeTab, setActiveTab] = useState("sugestoes");
  const { insights, dismiss, markAsRead } = useAiInsights('purchases');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações de Compra"
        description="Gerencie solicitações de compra e sugestões automáticas"
        breadcrumbs={[
          { label: "Compras" },
          { label: "Solicitações" },
        ]}
      />

      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA analisando demanda e sugerindo reposições inteligentes"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sugestoes" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Sugestões IA
            <Badge className="ml-1 bg-primary/20 text-primary">Novo</Badge>
          </TabsTrigger>
          <TabsTrigger value="manuais" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Solicitações Manuais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sugestoes">
          <PurchaseSuggestionPanel />
        </TabsContent>

        <TabsContent value="manuais">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Solicitações Manuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">Nenhuma solicitação manual</p>
                <p className="text-sm text-muted-foreground">
                  Utilize as sugestões automáticas da IA ou crie uma solicitação manual.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
