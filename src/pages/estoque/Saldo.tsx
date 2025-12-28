import { PageHeader } from "@/components/shared";
import { Package } from "lucide-react";

export default function Saldo() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldo de Estoque"
        description="Visualize o saldo atual de produtos em estoque"
        breadcrumbs={[
          { label: "Estoque" },
          { label: "Saldo" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Saldo de Estoque</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para visualizar saldos de estoque.
        </p>
      </div>
    </div>
  );
}
