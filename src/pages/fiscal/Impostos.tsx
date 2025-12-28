import { PageHeader } from "@/components/shared";

const Impostos = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Impostos"
        description="Apuração e controle de impostos"
        breadcrumbs={[{ label: "Fiscal" }, { label: "Impostos" }]}
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Impostos será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Impostos;
