import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Produtos = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Produtos"
        description="Cadastro e gestão de produtos"
        breadcrumbs={[{ label: "Estoque" }, { label: "Produtos" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Produtos será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Produtos;
