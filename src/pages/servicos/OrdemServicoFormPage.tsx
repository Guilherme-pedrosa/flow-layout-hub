import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared";
import { ServiceOrderForm } from "@/components/ordens-servico";
import { useServiceOrders, ServiceOrder } from "@/hooks/useServiceOrders";
import { Skeleton } from "@/components/ui/skeleton";

const OrdemServicoFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { orders, isLoading } = useServiceOrders();
  const [order, setOrder] = useState<ServiceOrder | null>(null);

  const isEditing = !!id && id !== "nova";

  useEffect(() => {
    if (isEditing && orders.length > 0) {
      const found = orders.find(o => o.id === id);
      if (found) {
        setOrder(found);
      }
    }
  }, [id, orders, isEditing]);

  const handleClose = () => {
    navigate("/ordens-servico");
  };

  if (isLoading && isEditing) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Carregando..."
          description="Aguarde enquanto carregamos os dados"
          breadcrumbs={[
            { label: "Serviços" },
            { label: "Ordens de Serviço", href: "/ordens-servico" },
            { label: "..." }
          ]}
        />
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={isEditing ? `OS #${order?.order_number || "..."}` : "Nova Ordem de Serviço"}
        description={isEditing ? "Editar ordem de serviço" : "Cadastrar nova ordem de serviço"}
        breadcrumbs={[
          { label: "Serviços" },
          { label: "Ordens de Serviço", href: "/ordens-servico" },
          { label: isEditing ? `OS #${order?.order_number || "..."}` : "Nova" }
        ]}
      />

      <ServiceOrderForm onClose={handleClose} initialData={order} />
    </div>
  );
};

export default OrdemServicoFormPage;
