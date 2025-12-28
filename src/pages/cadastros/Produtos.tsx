import { PageHeader } from "@/components/shared";
import { Boxes } from "lucide-react";

export default function Produtos() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Cadastro e gestão de produtos"
        breadcrumbs={[
          { label: "Cadastros" },
          { label: "Produtos" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Boxes className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Produtos</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para cadastro e gestão de produtos.
        </p>
      </div>
    </div>
  );
}
