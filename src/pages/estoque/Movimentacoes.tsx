import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Movimentacoes = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Movimentações"
        description="Entradas e saídas de estoque"
        breadcrumbs={[{ label: "Estoque" }, { label: "Movimentações" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Movimentação
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Movimentações será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Movimentacoes;
