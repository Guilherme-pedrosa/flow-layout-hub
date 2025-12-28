import { PageHeader } from "@/components/shared";

const Permissoes = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Permissões"
        description="Controle de acessos e permissões"
        breadcrumbs={[{ label: "Configurações" }, { label: "Permissões" }]}
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Permissões será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Permissoes;
