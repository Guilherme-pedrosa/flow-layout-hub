import { PageHeader } from "@/components/shared";

const Caixa = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Caixa"
        description="Controle de caixa e movimentações"
        breadcrumbs={[{ label: "Financeiro" }, { label: "Caixa" }]}
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Caixa será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Caixa;
