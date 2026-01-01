import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared";
import { SaleForm } from "@/components/vendas";
import { useSales, Sale } from "@/hooks/useSales";
import { Skeleton } from "@/components/ui/skeleton";

const VendaFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { sales, isLoading } = useSales();
  const [sale, setSale] = useState<Sale | null>(null);

  const isEditing = !!id && id !== "nova";

  useEffect(() => {
    if (isEditing && sales.length > 0) {
      const found = sales.find(s => s.id === id);
      if (found) {
        setSale(found);
      }
    }
  }, [id, sales, isEditing]);

  const handleClose = () => {
    navigate("/vendas");
  };

  if (isLoading && isEditing) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Carregando..."
          description="Aguarde enquanto carregamos os dados"
          breadcrumbs={[
            { label: "Operação" },
            { label: "Vendas", href: "/vendas" },
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
        title={isEditing ? `Venda #${sale?.sale_number || "..."}` : "Nova Venda"}
        description={isEditing ? "Editar venda" : "Cadastrar nova venda"}
        breadcrumbs={[
          { label: "Operação" },
          { label: "Vendas", href: "/vendas" },
          { label: isEditing ? `Venda #${sale?.sale_number || "..."}` : "Nova" }
        ]}
      />

      <SaleForm onClose={handleClose} initialData={sale} />
    </div>
  );
};

export default VendaFormPage;
