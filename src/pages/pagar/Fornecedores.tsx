import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Fornecedores = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Fornecedores"
        description="Cadastro e gestão de fornecedores"
        breadcrumbs={[{ label: "Pagar" }, { label: "Fornecedores" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Fornecedores será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Fornecedores;
