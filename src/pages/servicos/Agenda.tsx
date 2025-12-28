import { PageHeader } from "@/components/shared";

const Agenda = () => {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Agenda"
        description="Calendário de compromissos e serviços"
        breadcrumbs={[{ label: "Serviços" }, { label: "Agenda" }]}
      />
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Conteúdo da página de Agenda será implementado aqui
        </p>
      </div>
    </div>
  );
};

export default Agenda;
