import { PageHeader } from "@/components/shared";
import { RefreshCw } from "lucide-react";

export default function Renegociacoes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Renegociações"
        description="Gerencie renegociações de dívidas"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Renegociações" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Renegociações</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para renegociar títulos e dívidas.
        </p>
      </div>
    </div>
  );
}
