import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Ajustes() {
  const { insights, dismiss, markAsRead } = useAiInsights('stock');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes de Estoque"
        description="Realize ajustes manuais de inventário"
        breadcrumbs={[
          { label: "Estoque" },
          { label: "Ajustes" },
        ]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando divergências de estoque e sugerindo ajustes"
      />

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <div className="mt-4 flex items-center justify-center gap-2">
          <h3 className="text-lg font-medium">Ajustes de Estoque</h3>
          <Badge variant="destructive">Atenção</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Área crítica para ajustes manuais. Todas as alterações são auditadas.
        </p>
      </div>
    </div>
  );
}
