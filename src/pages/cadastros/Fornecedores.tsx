import { PageHeader } from "@/components/shared";
import { Building2 } from "lucide-react";

export default function Fornecedores() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fornecedores"
        description="Cadastro e gestão de fornecedores"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Fornecedores" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Fornecedores</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para cadastro e gestão de fornecedores.
        </p>
      </div>
    </div>
  );
}
