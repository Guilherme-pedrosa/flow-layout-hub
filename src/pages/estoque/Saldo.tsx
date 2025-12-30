import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { SaldoEstoqueList } from "@/components/estoque";

export default function Saldo() {
  const { insights, dismiss, markAsRead } = useAiInsights('stock');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldo de Estoque"
        description="Visualize o saldo atual de produtos em estoque (somente leitura)"
        breadcrumbs={[
          { label: "Estoque" },
          { label: "Saldo" },
        ]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando níveis de estoque e sugerindo reposições"
      />

      <SaldoEstoqueList />
    </div>
  );
}
