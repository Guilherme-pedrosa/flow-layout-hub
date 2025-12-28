import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Pagamentos = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pagamentos"
        description="Controle de contas a pagar"
        breadcrumbs={[{ label: "Pagar" }, { label: "Pagamentos" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pagamento
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Pagamentos será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Pagamentos;
