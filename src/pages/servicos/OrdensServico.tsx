import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ServiceOrdersList } from "@/components/ordens-servico";
import { ServiceOrder } from "@/hooks/useServiceOrders";

const OrdensServico = () => {
  const navigate = useNavigate();

  const handleEdit = (order: ServiceOrder) => {
    navigate(`/ordens-servico/${order.id}`);
  };

  const handleView = (order: ServiceOrder) => {
    navigate(`/ordens-servico/${order.id}`);
  };

  const handleAddNew = () => {
    navigate("/ordens-servico/nova");
  };

  const { insights, dismiss, markAsRead } = useAiInsights('services');

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Ordens de Serviço"
        description="Gerencie suas ordens de serviço"
        breadcrumbs={[{ label: "Serviços" }, { label: "Ordens de Serviço" }]}
        actions={
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        }
      />

      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando ordens de serviço e prazos"
      />

      <ServiceOrdersList onEdit={handleEdit} onView={handleView} />
    </div>
  );
};

export default OrdensServico;
