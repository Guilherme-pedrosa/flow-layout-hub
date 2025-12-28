import { PageHeader } from "@/components/shared";
import { ArrowUpFromLine } from "lucide-react";

export default function ContasPagar() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Gerencie pagamentos e fornecedores"
        breadcrumbs={[
          { label: "Financeiro" },
          { label: "Contas a Pagar" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <ArrowUpFromLine className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Contas a Pagar</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para gerenciar contas a pagar.
        </p>
      </div>
    </div>
  );
}
