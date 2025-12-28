import { PageHeader } from "@/components/shared";
import { ArrowDownToLine } from "lucide-react";

export default function ContasReceber() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Receber"
        description="Gerencie títulos e recebíveis"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Contas a Receber" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <ArrowDownToLine className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Contas a Receber</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para gerenciar títulos a receber.
        </p>
      </div>
    </div>
  );
}
