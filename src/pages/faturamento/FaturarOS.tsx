import { PageHeader } from "@/components/shared";
import { Receipt } from "lucide-react";

export default function FaturarOS() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturar OS"
        description="Fature ordens de serviço concluídas"
        breadcrumbs={[
          { label: "Faturamento" },
          { label: "Faturar OS" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Faturamento de OS</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Módulo central para faturar ordens de serviço finalizadas.
        </p>
      </div>
    </div>
  );
}
