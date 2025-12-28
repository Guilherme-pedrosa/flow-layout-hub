import { PageHeader } from "@/components/shared";

const Relatorios = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Relatórios"
        description="Relatórios financeiros e gerenciais"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Relatórios" }]}
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Relatórios será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Relatorios;
