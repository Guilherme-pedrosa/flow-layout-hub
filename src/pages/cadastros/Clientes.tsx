import { PageHeader } from "@/components/shared";
import { Users } from "lucide-react";

export default function Clientes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Cadastro e gestão de clientes"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Clientes" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Clientes</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para cadastro e gestão de clientes.
        </p>
      </div>
    </div>
  );
}
