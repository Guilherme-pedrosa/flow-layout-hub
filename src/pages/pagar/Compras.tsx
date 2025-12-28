import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Compras = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Compras"
        description="Gerencie suas compras e pedidos"
        breadcrumbs={[{ label: "Pagar" }, { label: "Compras" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Compra
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Compras será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Compras;
