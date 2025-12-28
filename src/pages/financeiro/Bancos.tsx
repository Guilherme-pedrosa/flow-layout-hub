import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Bancos = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Bancos"
        description="Contas bancárias e extratos"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Bancos" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Bancos será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Bancos;
