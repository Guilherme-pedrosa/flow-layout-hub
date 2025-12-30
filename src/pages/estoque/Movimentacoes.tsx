import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { MovimentacoesList } from "@/components/estoque";

export default function Movimentacoes() {
  const { insights, dismiss, markAsRead } = useAiInsights('stock');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Movimentações de Estoque"
        description="Histórico de entradas e saídas de estoque"
        breadcrumbs={[
          { label: "Estoque" },
          { label: "Movimentações" },
        ]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA analisando padrões de movimentação e giro de estoque"
      />

      <MovimentacoesList />
    </div>
  );
}
