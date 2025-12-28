import { PageHeader } from "@/components/shared";
import { LogsList } from "@/components/configuracoes";

export default function Logs() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Logs de Auditoria"
        description="Histórico de ações do sistema"
        breadcrumbs={[
          { label: "Configurações" },
          { label: "Logs" },
        ]}
      />
      <LogsList />
    </div>
  );
}
