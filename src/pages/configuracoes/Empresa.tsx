import { PageHeader } from "@/components/shared";

const Empresa = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Empresa"
        description="Dados da empresa"
        breadcrumbs={[{ label: "Configurações" }, { label: "Empresa" }]}
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Empresa será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Empresa;
