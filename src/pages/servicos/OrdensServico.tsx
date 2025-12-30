import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ServiceOrdersList, ServiceOrderForm } from "@/components/ordens-servico";
import { ServiceOrder } from "@/hooks/useServiceOrders";

const OrdensServico = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

  const handleEdit = (order: ServiceOrder) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleView = (order: ServiceOrder) => {
    // TODO: abrir visualização
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  const { insights, dismiss, markAsRead } = useAiInsights('services');

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Ordens de Serviço"
        description="Gerencie suas ordens de serviço"
        breadcrumbs={[{ label: "Serviços" }, { label: "Ordens de Serviço" }]}
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova OS
            </Button>
          )
        }
      />

      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando ordens de serviço e prazos"
      />

      {showForm ? (
        <ServiceOrderForm onClose={handleClose} initialData={editingOrder} />
      ) : (
        <ServiceOrdersList onEdit={handleEdit} onView={handleView} />
      )}
    </div>
  );
};

export default OrdensServico;
