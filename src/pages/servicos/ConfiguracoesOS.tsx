import { PageHeader } from "@/components/shared";
import { StatusConfigList } from "@/components/configuracoes/StatusConfigList";
import { useServiceOrderStatuses } from "@/hooks/useServiceOrders";
import { StatusFormData } from "@/components/configuracoes/StatusConfigForm";
import { useCompany } from "@/contexts/CompanyContext";

const ConfiguracoesOS = () => {
  const { currentCompany } = useCompany();
  const { statuses, isLoading, createStatus, updateStatus, deleteStatus } = useServiceOrderStatuses();

  const handleCreateStatus = (data: StatusFormData & { company_id: string }) => {
    createStatus.mutate(data as any);
  };

  const handleUpdateStatus = (id: string, data: Partial<StatusFormData>) => {
    updateStatus.mutate({ id, data: data as any });
  };

  const handleDeleteStatus = (id: string) => {
    deleteStatus.mutate(id);
  };

  if (!currentCompany) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Configurações de OS"
          description="Gerencie os status e comportamentos das ordens de serviço"
          breadcrumbs={[{ label: "Serviços" }, { label: "Configurações" }]}
        />
        <div className="text-center py-8 text-muted-foreground">
          Selecione uma empresa para continuar
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Configurações de OS"
        description="Gerencie os status e comportamentos das ordens de serviço"
        breadcrumbs={[{ label: "Serviços" }, { label: "Configurações" }]}
      />

      <StatusConfigList
        title="Status de Ordens de Serviço"
        description="Configure os status disponíveis para OS, definindo como cada um afeta estoque, financeiro e checkout"
        statuses={statuses}
        isLoading={isLoading}
        companyId={currentCompany.id}
        onCreateStatus={handleCreateStatus}
        onUpdateStatus={handleUpdateStatus}
        onDeleteStatus={handleDeleteStatus}
      />
    </div>
  );
};

export default ConfiguracoesOS;
