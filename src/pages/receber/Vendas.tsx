import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Vendas = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vendas"
        description="Gerencie suas vendas e pedidos"
        breadcrumbs={[{ label: "Receber" }, { label: "Vendas" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Vendas será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Vendas;
