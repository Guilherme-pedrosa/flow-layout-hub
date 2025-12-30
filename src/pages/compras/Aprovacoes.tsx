import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { CheckSquare } from "lucide-react";

export default function Aprovacoes() {
  const { insights, dismiss, markAsRead } = useAiInsights('purchases');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprovações"
        description="Aprove ou rejeite solicitações de compra"
        breadcrumbs={[
          { label: "Compras" },
          { label: "Aprovações" },
        ]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA analisando solicitações pendentes de aprovação"
      />

      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Aprovações de Compra</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para aprovar ou rejeitar solicitações pendentes.
        </p>
      </div>
    </div>
  );
}
