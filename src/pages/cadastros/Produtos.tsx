import { PageHeader } from "@/components/shared";
import { ProdutosList } from "@/components/produtos";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";

export default function Produtos() {
  const { insights, dismiss, markAsRead } = useAiInsights('stock');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Cadastro e gestão de produtos"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Produtos" },
        ]}
      />
      
      {/* AI Banner */}
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando estoque e sugerindo otimizações"
      />
      
      <ProdutosList />
    </div>
  );
}
