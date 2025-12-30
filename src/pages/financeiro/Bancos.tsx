import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { BancosList } from "@/components/financeiro";

const Bancos = () => {
  const { insights, dismiss, markAsRead } = useAiInsights('financial');

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Contas Bancárias"
        description="Gerencie as contas de caixa e bancárias da empresa"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Bancos" }]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando saldos bancários e movimentações"
      />

      <BancosList />
    </div>
  );
};

export default Bancos;