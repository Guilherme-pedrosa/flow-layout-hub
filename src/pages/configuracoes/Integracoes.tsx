import { PageHeader } from "@/components/shared";
import { Plug } from "lucide-react";

export default function Integracoes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Configure integrações com sistemas externos"
        breadcrumbs={[
          { label: "Configurações" },
          { label: "Integrações" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Plug className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Integrações</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para configurar integrações externas.
        </p>
      </div>
    </div>
  );
}
