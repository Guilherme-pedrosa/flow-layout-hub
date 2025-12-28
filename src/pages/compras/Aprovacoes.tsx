import { PageHeader } from "@/components/shared";
import { CheckSquare } from "lucide-react";

export default function Aprovacoes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Aprovações"
        description="Aprove ou rejeite solicitações de compra"
        breadcrumbs={[
          { label: "Compras" },
          { label: "Aprovações" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Aprovações de Compra</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para aprovar ou rejeitar solicitações pendentes.
        </p>
      </div>
    </div>
  );
}
