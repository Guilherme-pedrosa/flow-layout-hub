import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Recebimentos = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Recebimentos"
        description="Controle de contas a receber"
        breadcrumbs={[{ label: "Receber" }, { label: "Recebimentos" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Recebimento
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Recebimentos será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Recebimentos;
