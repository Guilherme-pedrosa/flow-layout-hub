import { PageHeader } from "@/components/shared";
import { FileText } from "lucide-react";

export default function Logs() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs do Sistema"
        description="Visualize logs e auditoria"
        breadcrumbs={[
          { label: "Configurações" },
          { label: "Logs" },
        ]}
      />
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Logs do Sistema</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Área para visualizar logs e auditoria do sistema.
        </p>
      </div>
    </div>
  );
}
