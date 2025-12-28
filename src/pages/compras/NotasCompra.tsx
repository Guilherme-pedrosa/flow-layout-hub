import { PageHeader } from "@/components/shared";
import { FileSpreadsheet } from "lucide-react";

export default function NotasCompra() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas de Compra"
        description="Gerencie notas fiscais de entrada"
        breadcrumbs={[
          { label: "Compras" },
          { label: "Notas de Compra" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Notas de Compra</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para gerenciar notas fiscais de entrada.
        </p>
      </div>
    </div>
  );
}
