import { PageHeader } from "@/components/shared";
import { Wrench } from "lucide-react";

export default function Servicos() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços"
        description="Cadastro e gestão de serviços"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Serviços" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Serviços</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para cadastro e gestão de serviços.
        </p>
      </div>
    </div>
  );
}
