import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { AIBannerEnhanced } from "@/components/shared/AIBannerEnhanced";
import { useAiInsights } from "@/hooks/useAiInsights";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SalesList, SaleForm } from "@/components/vendas";
import { Sale } from "@/hooks/useSales";

const Vendas = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setShowForm(true);
  };

  const handleView = (sale: Sale) => {
    // TODO: abrir visualização
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingSale(null);
  };

  const { insights, dismiss, markAsRead } = useAiInsights('sales');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        description="Gerencie suas vendas e pedidos"
        breadcrumbs={[{ label: "Operação" }, { label: "Vendas" }]}
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Nova Venda
            </Button>
          )
        }
      />

      <AIBannerEnhanced
        insights={insights}
        onDismiss={dismiss}
        onMarkAsRead={markAsRead}
        defaultMessage="IA monitorando vendas, margens e oportunidades"
      />

      {showForm ? (
        <SaleForm onClose={handleClose} initialData={editingSale} />
      ) : (
        <SalesList onEdit={handleEdit} onView={handleView} />
      )}
    </div>
  );
};

export default Vendas;