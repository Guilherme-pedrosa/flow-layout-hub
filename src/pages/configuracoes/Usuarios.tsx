import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Usuarios = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Usuários"
        description="Gestão de usuários do sistema"
        breadcrumbs={[{ label: "Configurações" }, { label: "Usuários" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        }
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Usuários será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Usuarios;
