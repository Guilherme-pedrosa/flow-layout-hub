import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { ServicesList, ServiceForm } from "@/components/servicos";
import { Service } from "@/hooks/useServices";

type ViewMode = "list" | "form";

export default function Servicos() {
  const { insights, dismiss, markAsRead } = useAiInsights('services');
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setViewMode("form");
  };

  const handleNew = () => {
    setSelectedService(null);
    setViewMode("form");
  };

  const handleCancel = () => {
    setSelectedService(null);
    setViewMode("list");
  };

  const handleSuccess = () => {
    setSelectedService(null);
    setViewMode("list");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços"
        description="Cadastro e gestão de serviços"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Serviços" },
        ]}
      />
      
      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando serviços e sugerindo melhorias"
      />

      {viewMode === "list" ? (
        <ServicesList onEdit={handleEdit} onNew={handleNew} />
      ) : (
        <ServiceForm
          service={selectedService}
          onCancel={handleCancel}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
