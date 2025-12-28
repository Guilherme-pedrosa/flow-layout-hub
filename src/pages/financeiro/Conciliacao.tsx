import { PageHeader } from "@/components/shared";

const Conciliacao = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Conciliação"
        description="Conciliação bancária"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Conciliação" }]}
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Conciliação será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Conciliacao;
