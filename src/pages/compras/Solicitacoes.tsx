import { PageHeader } from "@/components/shared";
import { FileText } from "lucide-react";

export default function Solicitacoes() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações de Compra"
        description="Gerencie solicitações de compra pendentes"
        breadcrumbs={[
          { label: "Compras" },
          { label: "Solicitações" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Solicitações de Compra</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para criar e acompanhar solicitações de compra.
        </p>
      </div>
    </div>
  );
}
