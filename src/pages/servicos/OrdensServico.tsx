import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const OrdensServico = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ordens de Serviço"
        description="Gerencie suas ordens de serviço"
        breadcrumbs={[{ label: "Serviços" }, { label: "Ordens de Serviço" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Ordens de Serviço será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default OrdensServico;
