import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const NotasFiscais = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notas Fiscais"
        description="Emissão e gestão de notas fiscais"
        breadcrumbs={[{ label: "Fiscal" }, { label: "Notas Fiscais" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Emitir NF-e
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Notas Fiscais será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default NotasFiscais;
