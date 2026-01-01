import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SalesList } from "@/components/vendas";
import { Sale } from "@/hooks/useSales";

const Vendas = () => {
  const navigate = useNavigate();

  const handleEdit = (sale: Sale) => {
    navigate(`/vendas/${sale.id}`);
  };

  const handleView = (sale: Sale) => {
    navigate(`/vendas/${sale.id}`);
  };

  const handleAddNew = () => {
    navigate("/vendas/nova");
  };

  const { insights, dismiss, markAsRead } = useAiInsights('sales');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        description="Gerencie suas vendas e pedidos"
        breadcrumbs={[{ label: "Operação" }, { label: "Vendas" }]}
        actions={
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Venda
          </Button>
        }
      />

      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando vendas, margens e oportunidades"
      />

      <SalesList onEdit={handleEdit} onView={handleView} />
    </div>
  );
};

export default Vendas;