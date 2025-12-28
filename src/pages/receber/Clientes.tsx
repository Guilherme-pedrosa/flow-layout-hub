import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Clientes = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clientes"
        description="Cadastro e gestão de clientes"
        breadcrumbs={[{ label: "Receber" }, { label: "Clientes" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Clientes será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Clientes;
